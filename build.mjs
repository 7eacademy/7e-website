// 7E 商學院官網建置程式：把 src/ 版型 + content/ 內容 組合成 dist/ 網站
// 本機測試：npm install && npm run build && npm run preview
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import { marked } from 'marked';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(ROOT, 'dist');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

// ---------- 小型範本引擎（相容 Mustache 語法：{{x}}、{{{x}}}、{{#list}}…{{/list}}、{{^x}}…{{/x}}、{{.}}） ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const str = (v) => (v === undefined || v === null || v === false ? '' : String(v));
function lookup(name, stack) {
  if (name === '.') return stack[stack.length - 1];
  const parts = name.split('.');
  for (let i = stack.length - 1; i >= 0; i--) {
    const ctx = stack[i];
    if (ctx && typeof ctx === 'object' && parts[0] in ctx) {
      return parts.reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), ctx);
    }
  }
  return undefined;
}
function render(tpl, stack) {
  const tag = /\{\{(\{)?([#^/])?\s*([\w.]+)\s*\}?\}\}/g;
  let out = '', i = 0, m;
  while ((m = tag.exec(tpl))) {
    out += tpl.slice(i, m.index);
    const [, triple, op, name] = m;
    if (!op) { const v = str(lookup(name, stack)); out += triple ? v : esc(v); i = tag.lastIndex; continue; }
    if (op === '/') throw new Error('範本多了結尾標籤：' + name);
    const pair = new RegExp('\\{\\{([#^/])\\s*' + name.replace(/\./g, '\\.') + '\\s*\\}\\}', 'g');
    pair.lastIndex = tag.lastIndex;
    let depth = 1, p;
    while ((p = pair.exec(tpl))) { if (p[1] === '/') { if (--depth === 0) break; } else depth++; }
    if (!p) throw new Error('範本缺少結尾標籤：' + name);
    const inner = tpl.slice(tag.lastIndex, p.index);
    const v = lookup(name, stack);
    const empty = !v || (Array.isArray(v) && !v.length);
    if (op === '#' && !empty) {
      if (Array.isArray(v)) for (const x of v) out += render(inner, [...stack, x]);
      else out += render(inner, typeof v === 'object' ? [...stack, v] : stack);
    } else if (op === '^' && empty) out += render(inner, stack);
    i = tag.lastIndex = pair.lastIndex;
  }
  return out + tpl.slice(i);
}
const Mustache = { render: (tpl, view) => render(tpl, [view]) };

const toDate = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v || '').slice(0, 10));
const asList = (v) => (Array.isArray(v) ? v.filter((x) => x !== null && x !== '') : v ? [v] : []);
const isOn = (v) => v !== false && v !== 'false';

function loadCollection(dir) {
  if (!exists(dir)) return [];
  return fs.readdirSync(path.join(ROOT, dir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data, content } = matter(read(path.join(dir, f)));
      return { ...data, body: content, _file: f.replace(/\.md$/, '') };
    });
}
const loadJson = (p, fallback) => (exists(p) ? JSON.parse(read(p)) : fallback);

function slugOf(file) {
  if (/^[a-z0-9-]+$/i.test(file)) return file.toLowerCase();
  const date = (file.match(/^\d{4}-\d{2}-\d{2}/) || ['post'])[0];
  return `${date}-${crypto.createHash('sha1').update(file).digest('hex').slice(0, 6)}`;
}

// ---------- 內容 ----------
const settings = loadJson('content/settings.json', {});

const articles = loadCollection('content/articles')
  .filter((a) => isOn(a.published))
  .map((a) => {
    const date = toDate(a.date);
    const slug = slugOf(a._file);
    return {
      ...a, date, date_dot: date.replace(/-/g, '.'), slug,
      url: `article-${slug}.html`,
      excerpt: a.excerpt || '',
      cover: a.cover || '',
      html: marked.parse(a.body || ''),
    };
  })
  .sort((a, b) => b.date.localeCompare(a.date));
const featured = articles.find((a) => a.featured) || articles[0];
const rest = articles.filter((a) => a !== featured);

const news = loadCollection('content/news')
  .filter((n) => isOn(n.published))
  .map((n) => ({ ...n, date: toDate(n.date), link: n.link || settings.ig_url }))
  .sort((a, b) => b.date.localeCompare(a.date));

const PRICE_BIG = "font-family:'Noto Serif TC',serif;font-size:20px;font-weight:600";
const PRICE_TEXT = 'font-size:15px;color:var(--ink2);font-weight:500';
const courses = loadCollection('content/courses')
  .filter((c) => isOn(c.show))
  .sort((a, b) => (a.order || 99) - (b.order || 99))
  .map((c) => ({ ...c, price_style: /^NT\$/.test(String(c.price || '')) ? PRICE_BIG : PRICE_TEXT }));

const consultants = loadCollection('content/consultants')
  .filter((c) => isOn(c.show))
  .sort((a, b) => (a.order || 99) - (b.order || 99))
  .map((c, i) => ({ ...c, tags: asList(c.tags), dir: i % 2 ? 'row-reverse' : 'row', page_url: c.page ? `${c.page}.html` : settings.line_url }));

const plans = loadJson('content/plans.json', []).map((p) => ({ ...p, bullets: asList(p.bullets) }));
const partners = loadJson('content/partners.json', []);

const view = {
  settings,
  articles_home: articles.slice(0, 3),
  articles_home_first: articles.slice(0, 1),
  articles_home_rest: articles.slice(1, 3),
  articles_featured: featured ? [featured] : [],
  articles_rest: rest,
  news_home: news.slice(0, 4),
  news_all: news,
  courses, consultants, plans, partners,
};

// ---------- 輸出 ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'm'), { recursive: true });

const pages = [];
for (const [srcDir, outDir, prefix] of [['src', '', '/'], ['src/m', 'm', '/m/']]) {
  for (const f of fs.readdirSync(path.join(ROOT, srcDir)).filter((x) => x.endsWith('.html'))) {
    const tpl = read(path.join(srcDir, f));
    if (f === '_article.html') {
      for (const a of articles) {
        const html = Mustache.render(tpl, { ...view, ...a, body: a.html });
        fs.writeFileSync(path.join(DIST, outDir, a.url), html);
        pages.push(prefix + a.url);
      }
      continue;
    }
    fs.writeFileSync(path.join(DIST, outDir, f), Mustache.render(tpl, view));
    pages.push(prefix + f);
  }
}

for (const dir of ['media', 'assets']) {
  if (exists(dir)) fs.cpSync(path.join(ROOT, dir), path.join(DIST, dir), { recursive: true });
}

const base = (settings.site_url || '').replace(/\/$/, '');
if (base) {
  const urls = pages.filter((p) => !p.startsWith('/m/') && p !== '/menu.html')
    .map((p) => `<url><loc>${base}${p === '/index.html' ? '/' : encodeURI(p)}</loc></url>`).join('');
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
}

console.log(`完成：${pages.length} 頁（文章 ${articles.length}、消息 ${news.length}、課程 ${courses.length}、顧問 ${consultants.length}）`);
