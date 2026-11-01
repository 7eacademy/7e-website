// 7E 商學院官網建置程式：templates/（版型，與原官網相同的區塊與文字）+ content/（後台內容）→ dist/（網站）
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

/* ---------- 小型範本引擎（Mustache 語法：{{x}} {{{x}}} {{#list}}…{{/list}} {{^x}}…{{/x}} {{.}} {{> partial}}） ---------- */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const str = (v) => (v === undefined || v === null || v === false ? '' : String(v));
function lookup(name, stack) {
  if (name === '.') return stack[stack.length - 1];
  const parts = name.split('.');
  for (let i = stack.length - 1; i >= 0; i--) {
    const ctx = stack[i];
    if (ctx && typeof ctx === 'object' && parts[0] in ctx) return parts.reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), ctx);
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
      if (Array.isArray(v)) v.forEach((x, k) => { out += render(inner, [...stack, (x && typeof x === 'object') ? { ...x, _i: k, _i1: k + 1, _n: String(k + 1).padStart(2, '0'), _first: k === 0, _last: k === v.length - 1, _odd: k % 2 === 1 } : x]); });
      else out += render(inner, typeof v === 'object' ? [...stack, v] : stack);
    } else if (op === '^' && empty) out += render(inner, stack);
    i = tag.lastIndex = pair.lastIndex;
  }
  return out + tpl.slice(i);
}
const PARTIALS = {};
for (const f of fs.readdirSync(path.join(ROOT, 'templates/partials'))) PARTIALS[f.replace(/\.html$/, '')] = read('templates/partials/' + f);
function withPartials(tpl, depth = 0) {
  if (depth > 6) return tpl;
  return tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => {
    if (!(n in PARTIALS)) throw new Error('找不到共用區塊：' + n);
    return withPartials(PARTIALS[n], depth + 1);
  });
}

/* ---------- 內容（資料夾與欄位沿用原官網後台） ---------- */
const rel = (p) => (typeof p === 'string' ? p.replace(/^\/+/, '') : p); // 圖片一律用相對路徑
const toDate = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v || '').slice(0, 10));
const list = (v) => (Array.isArray(v) ? v.filter((x) => x !== null && x !== '' && x !== undefined) : v ? [v] : []);
const on = (v) => v !== false && v !== 'false';
const fixImages = (o) => {
  if (Array.isArray(o)) return o.map(fixImages);
  if (o && typeof o === 'object' && !(o instanceof Date)) { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = /(image|photo|logo|cover|avatar)(_\d)?$/i.test(k) ? rel(v) : fixImages(v); return r; }
  return o;
};
function collection(dir) {
  if (!exists(dir)) return [];
  return fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.md')).map((f) => {
    const { data, content } = matter(read(path.join(dir, f)));
    return { ...fixImages(data), body: content, _file: f.replace(/\.md$/, '') };
  });
}
const json = (p, fb) => (exists(p) ? fixImages(JSON.parse(read(p))) : fb);
const slugOf = (file) => (/^[a-z0-9-]+$/i.test(file) ? file.toLowerCase() : `${(file.match(/^\d{4}-\d{2}-\d{2}/) || ['post'])[0]}-${crypto.createHash('sha1').update(file).digest('hex').slice(0, 6)}`);
const isExt = (u) => /^https?:/.test(u || '');

const settings = json('content/settings.json', {});
const linkOf = (l) => ({ line: settings.line_url, biz: settings.form_biz, personal: settings.form_personal, four: settings.form_four, beast: settings.form_beast, contact: 'contact.html' }[String(l || '').trim()] || l || settings.line_url);

const THUMBS = [];
const THUMB_SEEN = new Set();
const thumbOf = (src, w) => { const h = crypto.createHash('sha1').update(src + w).digest('hex').slice(0, 12); const out = `media/_t/${h}-${w}.jpg`; if (!THUMB_SEEN.has(out)) { THUMB_SEEN.add(out); THUMBS.push({ src, out, w }); } return out; };
// 文章：SEO 設定（標題、描述、網址 slug、關鍵字、封面 alt）、文末 FAQ、延伸閱讀、行動呼籲
const RESERVED = ['index', 'about', 'consultants', 'consultant-eling', 'consultant-vessi', 'consultant-su', 'articles', 'news', 'marketing', 'training', 'courses', 'contact', 'recaps', 'member', 'privacy', '404'];
const cleanSlug = (v) => String(v || '').trim().toLowerCase().replace(/\.html$/, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
const articlesRaw = collection('content/articles').filter((a) => on(a.published)).map((a) => {
  const date = toDate(a.date), seo = a.seo || {};
  let slug = cleanSlug(seo.slug) || 'article-' + slugOf(a._file);
  if (RESERVED.includes(slug)) slug = 'article-' + slug;
  return { ...a, seo, date, date_dot: date.replace(/-/g, '.'), slug, old_url: `article-${slugOf(a._file)}.html`, url: `${slug}.html`, excerpt: a.excerpt || '', cover: a.cover || '' };
}).sort((a, b) => b.date.localeCompare(a.date));
// 延伸閱讀連結：可填頁面（about.html）、文章 slug、文章標題或完整網址
const resolveLink = (v) => {
  const s = String(v || '').trim(); if (!s) return null;
  if (/^(https?:|mailto:|tel:|#)/.test(s)) return { url: s, ext: /^https?:/.test(s) };
  const k = cleanSlug(s), hit = articlesRaw.find((x) => x.slug === k || x.title === s || cleanSlug(x._file) === k);
  if (hit) return { url: hit.url, title: hit.title };
  return { url: /\.html$/.test(s) || s.includes('#') ? s : s + '.html' };
};
// 內文插入的圖片：自動壓縮成 1280px 寬，加上延遲載入
const bodyImages = (html) => html.replace(/<img([^>]*?)src="\/?(media\/[^"]+\.(?:jpe?g|png|webp))"([^>]*)>/gi, (m, a, src, b) => {
  const s = decodeURI(src);
  return `<img${a}src="${exists(s) ? thumbOf(s, 1280) : src}"${b} loading="lazy">`;
});
const articles = articlesRaw.map((a) => {
  const faqA = list(a.faq).filter((x) => x && x.q).map((x) => ({ q: x.q, a: String(x.a || ''), a_html: esc(String(x.a || '')).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>') }));
  const links = list(a.links).map((l) => { const r = resolveLink(l && l.link); return r ? { label: (l.label || r.title || r.url), url: r.url, ext: !!r.ext } : null; }).filter(Boolean);
  const cta = a.cta && a.cta.link ? { text: a.cta.text || '', button: a.cta.button || '立即預約', link: linkOf(a.cta.link), ext: isExt(linkOf(a.cta.link)) } : null;
  return { ...a, html: bodyImages(marked.parse(a.body || '')), faq_list: faqA, links_list: links, cta_box: cta ? [cta] : [] };
});
const featured = articles.find((a) => a.featured) || articles[0];

const news = collection('content/news').filter((n) => on(n.published)).map((n) => ({ ...n, date: toDate(n.date), link: n.link || settings.ig_url })).sort((a, b) => b.date.localeCompare(a.date));

const courses = collection('content/courses').filter((c) => on(c.show)).sort((a, b) => (a.order || 99) - (b.order || 99))
  .map((c) => { const link = linkOf(c.link); return { ...c, link, is_price: /^NT\$/.test(String(c.price || '')), external: isExt(link) }; });

const consultants = collection('content/consultants').filter((c) => on(c.show)).sort((a, b) => (a.order || 99) - (b.order || 99))
  .map((c) => ({ ...c, tags: list(c.tags), url: c.page ? `${c.page}.html` : settings.line_url }));

const plans = json('content/plans.json', []).map((p) => { const link = linkOf(p.link); return { ...p, bullets: list(p.bullets), link, external: isExt(link) }; });
const partners = json('content/partners.json', []);
// 常見問題（後台可新增、修改）：回答可換行，網址會自動變成連結
const faqRaw = json('content/faq.json', {});
const faq = {};
for (const [k, v] of Object.entries(faqRaw)) faq[k] = list(v).filter((x) => x && x.q && on(x.show)).map((x) => ({ ...x, a_html: esc(String(x.a || '')).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>') }));
const forms = json('content/forms.json', {});
function buildForm(key) {
  const f = forms[key]; if (!f) return {};
  return {
    form_name: f.name || key, form_ok: f.ok || '', form_agree: f.agree || '我已閱讀並同意隱私權政策', form_submit: f.submit || '送出',
    fields: list(f.fields).map((x, i) => {
      const type = x.type || 'text';
      return {
        ...x, id: `${key}-${i}`, required: !!x.required, full: ['textarea', 'checks', 'radios'].includes(type) || !!x.full,
        is_text: ['text', 'email', 'tel'].includes(type), input_type: type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'text',
        is_textarea: type === 'textarea', is_select: type === 'select', is_checks: type === 'checks', is_radios: type === 'radios',
        options: list(x.options), placeholder: x.placeholder || (type === 'select' ? '請選擇' : ''),
      };
    }),
  };
}

// 課程回顧：照片在建置時自動壓縮成縮圖（480px）與看大圖用（1280px），原圖不放上網站
const recapsRaw = collection('content/recaps').filter((r) => on(r.show)).map((r) => {
  const date = toDate(r.date);
  return { ...r, date, date_dot: date.replace(/-/g, '.'), html: marked.parse(r.body || ''), photos: list(r.photos).slice(0, 10).map((p) => (typeof p === 'object' && p ? rel(p.image || p.src || '') : rel(p))).filter(Boolean) };
}).sort((a, b) => b.date.localeCompare(a.date));
const recaps = recapsRaw.map((r) => ({ ...r, photos: r.photos.map((p) => ({ thumb: thumbOf(p, 480), big: thumbOf(p, 1280), src: p })), count: r.photos.length }));

// 各頁面的固定文字與圖片（後台「頁面內容」）：content/pages/*.json
const pagesData = {};
if (exists('content/pages')) for (const f of fs.readdirSync(path.join(ROOT, 'content/pages')).filter((x) => x.endsWith('.json'))) pagesData[f.replace(/\.json$/, '')] = json('content/pages/' + f, {});
// 講座照片：同場次只在第一張標說明；YouTube 網址自動取出影片代碼；流程箭頭
const ytId = (u) => { const m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : ''; };
function prepPage(p, key) {
  const walk = (o) => {
    if (Array.isArray(o)) return o.filter((x) => x !== null && x !== undefined && x !== '').map(walk);
    if (!o || typeof o !== 'object') return o;
    const r = {}; for (const [k, v] of Object.entries(o)) r[k] = walk(v);
    if (Array.isArray(r.sessions)) { r.sessions = r.sessions.map((s, si) => ({ ...s, photos: list(s.photos).map((ph, i) => ({ src: rel(typeof ph === 'object' ? ph.image : ph), lb: key, caption_alt: s.title, caption: i === 0 ? s.title : '', big_first: si === 0 && i === 0 && r.big_first !== false })) })); }
    if (r.youtube_url !== undefined) r.youtube_id = ytId(r.youtube_url);
    if (typeof r.text === 'string' && r.title !== undefined) r.text_html = esc(r.text).replace(/\n/g, '<br>');
    if (Array.isArray(r.flow)) r.flow_items = r.flow.map((t, i) => ({ text: t, first: i === 0 }));
    for (const k of Object.keys(r)) if (/(photos|boards|screenshots|images)$/.test(k) && Array.isArray(r[k])) r[k] = r[k].map((x) => (typeof x === 'string' ? rel(x) : x));
    return r;
  };
  return walk(p);
}
for (const k of Object.keys(pagesData)) pagesData[k] = prepPage(pagesData[k], k);
if (pagesData.marketing) for (const id of ['startup', 'brand', 'video', 'ai', 'seo', 'pos', 'ads']) if (pagesData.marketing[id]) pagesData.marketing[id].id = id;
const PAGE_DATA = { index: 'home', 'consultant-eling': 'eling', 'consultant-vessi': 'vessi', 'consultant-su': 'su' };

const base = {
  common: pagesData.common || {},
  settings, consultants, courses, plans, partners, faq, recaps, recaps_home: recaps.slice(0, 3),
  articles_home: articles.slice(0, 3), articles_featured: featured ? [featured] : [], articles_rest: articles.filter((a) => a !== featured),
  news_home: news.slice(0, 4), news_all: news,
  year: new Date().getFullYear(),
};

/* ---------- 頁面（網址與原官網相同） ---------- */
const PAGES = [
  ['index', '首頁', 'home'], ['about', '關於7E', 'about'], ['consultants', '顧問團隊', 'consultants'],
  ['consultant-eling', '黃凱鈴｜顧問團隊', 'consultants', 'eling'], ['consultant-vessi', '林彥廷｜顧問團隊', 'consultants', 'vessi'], ['consultant-su', '蘇琮瑜｜顧問團隊', 'consultants', 'su'],
  ['articles', '最新文章', 'articles'], ['news', '最新消息', 'news'],
  ['marketing', '品牌行銷服務', 'marketing'], ['training', '企業內訓', 'training', 'training'], ['courses', '商業教育課程', 'courses'],
  ['contact', '聯絡我們', 'contact', 'contact'], ['recaps', '課程回顧', 'courses'], ['member', '加入會員', 'member'], ['privacy', '隱私權政策', 'privacy'],
];
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
const out = [];
const SITE_URL = (settings.site_url || '').replace(/\/$/, '');
const pageUrl = (file) => `${SITE_URL}/${file === 'index.html' ? '' : encodeURI(file.replace(/\.html$/, ''))}`;
function page(file, tplName, view) {
  const tpl = withPartials(read(`templates/${tplName}.html`));
  const html = render(tpl, [{ ...base, canonical: SITE_URL ? pageUrl(file) : '', ...view }]);
  if (/\{\{/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) console.warn('提醒：' + file + ' 還有未套用的 {{ }} 標籤');
  // 輸出前壓縮 HTML（移除註解與多餘換行），原始碼不易閱讀
  const min = html.replace(/<!--(?!\[if)[\s\S]*?-->/g, '').replace(/>\s*\n\s*</g, '><').replace(/\s*\n\s*/g, ' ');
  fs.writeFileSync(path.join(DIST, file), min); out.push(file);
}
for (const [name, title, nav, form] of PAGES) page(`${name}.html`, `pages/${name}`, { page_title: title, active: { [nav]: true }, p: pagesData[PAGE_DATA[name] || name] || {}, ...(form ? buildForm(form) : {}) });
// 結構化資料（Google 搜尋、AI 摘要用）：文章、FAQ、麵包屑
const ld = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
for (const a of articles) {
  const url = SITE_URL ? pageUrl(a.url) : '', img = a.cover ? (SITE_URL ? `${SITE_URL}/${encodeURI(a.cover)}` : a.cover) : '';
  const desc = a.seo.description || a.excerpt || '';
  const graph = [
    { '@type': 'Article', headline: a.title, description: desc, image: img || undefined, datePublished: a.date, dateModified: a.date, inLanguage: 'zh-Hant-TW', keywords: [a.seo.keyword, a.seo.keywords].filter(Boolean).join('、') || undefined,
      author: { '@type': 'Organization', name: '7E商學院', url: SITE_URL || undefined }, publisher: { '@type': 'Organization', name: '7E商學院 7E Business Academy', logo: SITE_URL ? { '@type': 'ImageObject', url: `${SITE_URL}/media/site/8aba46176fdb.png` } : undefined }, mainEntityOfPage: url || undefined },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '首頁', item: SITE_URL ? SITE_URL + '/' : undefined }, { '@type': 'ListItem', position: 2, name: '最新文章', item: SITE_URL ? pageUrl('articles.html') : undefined }, { '@type': 'ListItem', position: 3, name: a.title, item: url || undefined }] },
  ];
  if (a.faq_list.length) graph.push({ '@type': 'FAQPage', mainEntity: a.faq_list.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  page(a.url, 'pages/_article', {
    ...a, page_title: a.title, body: a.html, active: { articles: true },
    seo_title: a.seo.title || '', meta_desc: desc, meta_keywords: [a.seo.keyword, a.seo.keywords].filter(Boolean).join(',').replace(/、/g, ','), og_image: img, og_type: 'article',
    cover_alt: a.seo.cover_alt || a.title, jsonld: ld({ '@context': 'https://schema.org', '@graph': graph }),
  });
}

for (const dir of ['media', 'images', 'assets']) if (exists(dir)) fs.cpSync(path.join(ROOT, dir), path.join(DIST, dir), { recursive: true });
fs.writeFileSync(path.join(DIST, '404.html'), fs.readFileSync(path.join(DIST, 'index.html')));
// 舊的手機版網址（/m/…）與已下架頁面，自動導向新頁面
fs.writeFileSync(path.join(DIST, '_redirects'), ['/m/menu.html /index.html 301', '/m/ / 301', '/m/* /:splat 301', '/consultant-joey.html /consultants.html 301', ...articles.filter((a) => a.old_url !== a.url).flatMap((a) => [`/${a.old_url} /${a.slug} 301`, `/${a.old_url.replace(/\.html$/, '')} /${a.slug} 301`]), ''].join('\n'));
// 產生縮圖（Cloudflare 建置時會安裝 sharp；沒有 sharp 時直接用原圖）
let sharp = null;
try { sharp = (await import('sharp')).default; } catch (e) { console.warn('提醒：沒有安裝 sharp，課程回顧照片直接使用原圖'); }
for (const t of THUMBS) {
  const src = path.join(ROOT, t.src), out = path.join(DIST, t.out);
  if (!fs.existsSync(src)) { console.warn('找不到照片：' + t.src); continue; }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (sharp) { try { await sharp(src).rotate().resize({ width: t.w, height: t.w, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: t.w > 600 ? 80 : 72, mozjpeg: true }).toFile(out); continue; } catch (e) { console.warn('縮圖失敗，改用原圖：' + t.src); } }
  fs.copyFileSync(src, out);
}
// 原圖不放上網站（只保留縮圖）
fs.rmSync(path.join(DIST, 'media/recaps'), { recursive: true, force: true });

const site = (settings.site_url || '').replace(/\/$/, '');
if (site) {
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${out.map((p) => `<url><loc>${pageUrl(p)}</loc></url>`).join('')}</urlset>`);
  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`);
}
console.log(`完成：${out.length} 頁（文章 ${articles.length}、消息 ${news.length}、課程 ${courses.length}、顧問 ${consultants.length}、課程回顧 ${recaps.length}）`);
