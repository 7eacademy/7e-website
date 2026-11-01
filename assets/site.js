/* 7E 商學院官網：選單、輪播、表單、文章篩選（響應式，單一版本） */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var startHash = window.__startHash || '';
  /* 頁內跳轉（例如關於頁的標籤）用平滑捲動；換頁一律從頁首開始（見 head） */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href').slice(1); var t = id && document.getElementById(id); if (!t) return;
    e.preventDefault(); var hd = document.querySelector('.hd'), jb = document.querySelector('.jump');
    var off = (hd ? hd.offsetHeight : 0) + (jb ? jb.offsetHeight : 0) + 8;
    window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - off, behavior: 'smooth' });
  });

  /* 手機／平板選單 */
  function drawer() {
    var d = $('#drawer'); if (!d) return;
    function set(open) { d.classList.toggle('open', open); document.body.classList.toggle('lock', open); d.setAttribute('aria-hidden', open ? 'false' : 'true'); }
    $$('[data-open-menu]').forEach(function (b) { b.addEventListener('click', function () { set(true); }); });
    $$('[data-close-menu]', d).forEach(function (b) { b.addEventListener('click', function () { set(false); }); });
    $$('a', d).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  }

  /* 輪播（手機左右滑） */
  function rails() {
    $$('[data-rail]').forEach(function (rail) {
      var ctrl = rail.nextElementSibling; if (!ctrl || !ctrl.classList.contains('rail-ctrl')) return;
      var items = rail.children, dots = $('.rail-dots', ctrl);
      if (dots) for (var i = 0; i < items.length; i++) dots.appendChild(document.createElement('i'));
      function idx() {
        var x = rail.scrollLeft, best = 0, bd = 1e9;
        for (var i = 0; i < items.length; i++) { var d = Math.abs(items[i].offsetLeft - rail.offsetLeft - x - parseFloat(getComputedStyle(rail).paddingLeft)); if (d < bd) { bd = d; best = i; } }
        return best;
      }
      function paint() { if (!dots) return; var n = idx(); $$('i', dots).forEach(function (d, i) { d.classList.toggle('on', i === n); }); }
      function go(dir) { var n = Math.max(0, Math.min(items.length - 1, idx() + dir)); rail.scrollTo({ left: items[n].offsetLeft - rail.offsetLeft - parseFloat(getComputedStyle(rail).paddingLeft), behavior: 'smooth' }); }
      var p = $('[data-prev]', ctrl), n = $('[data-next]', ctrl);
      if (p) p.addEventListener('click', function () { go(-1); });
      if (n) n.addEventListener('click', function () { go(1); });
      rail.addEventListener('scroll', function () { window.requestAnimationFrame(paint); }, { passive: true });
      paint();
    });
  }

  /* 頁內跳轉標籤：捲動時標示目前段落 */
  function jumps() {
    var bar = $('.jump'); if (!bar || !('IntersectionObserver' in window)) return;
    var links = $$('a[href^="#"]', bar);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + e.target.id;
          a.classList.toggle('on', on);
          if (on) { var w = bar.querySelector('.wrap') || bar; var x = a.offsetLeft - (w.clientWidth - a.offsetWidth) / 2; if (Math.abs(w.scrollLeft - x) > 4) w.scrollLeft = x; }
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) io.observe(t); });
  }

  /* 表單送出 → Google 試算表 */
  function forms() {
    $$('form.js-form').forEach(function (f) {
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var msg = $('.msg', f);
        function show(t, bad) { if (!msg) return; msg.textContent = t; msg.className = 'msg full ' + (bad ? 'err' : 'ok'); }
        var bad = $$('[required]', f).filter(function (el) { return el.type === 'checkbox' ? !el.checked : !String(el.value || '').trim(); });
        $$('.fl[data-need-one]', f).forEach(function (g) { if (!$$('input:checked', g).length) bad.push(g); });
        if (bad.length) { show('請填寫標示 * 的必填欄位，並勾選同意隱私權政策。', true); (bad[0].focus || function () {}).call(bad[0]); return; }
        var ep = (window.SITE || {}).endpoint;
        if (!ep) { show('線上表單尚未開通，請先透過官方 LINE@ 與我們聯繫。', true); return; }
        var data = new URLSearchParams();
        data.append('form_type', f.getAttribute('data-form') || '官網表單');
        data.append('來源頁面', location.pathname);
        new FormData(f).forEach(function (v, k) { data.append(k, v); });
        var btn = $('button[type=submit]', f); if (btn) btn.disabled = true;
        fetch(ep, { method: 'POST', mode: 'no-cors', body: data })
          .then(function () { f.reset(); show(f.getAttribute('data-ok') || '已收到你的資料！7E 團隊會盡快與你聯繫。'); })
          .catch(function () { show('送出失敗，請稍後再試，或改用官方 LINE@ 聯繫。', true); })
          .then(function () { if (btn) btn.disabled = false; });
      });
    });
  }


  /* 照片燈箱：點縮圖看大圖 */
  function lightbox() {
    var links = $$('[data-lb]'); if (!links.length) return;
    var box = document.createElement('div'); box.className = 'lb';
    box.innerHTML = '<button class="x" aria-label="關閉">×</button><button class="pv" aria-label="上一張">‹</button><img alt=""><button class="nx" aria-label="下一張">›</button>';
    document.body.appendChild(box);
    var img = $('img', box), group = [], i = 0;
    function show() { img.src = group[i].getAttribute('href'); img.alt = (group[i].querySelector('img') || {}).alt || ''; }
    function close() { box.classList.remove('open'); document.body.classList.remove('lock'); img.removeAttribute('src'); }
    links.forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); var g = a.getAttribute('data-lb'); group = links.filter(function (x) { return x.getAttribute('data-lb') === g; }); i = group.indexOf(a); show(); box.classList.add('open'); document.body.classList.add('lock'); }); });
    $('.x', box).addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    $('.pv', box).addEventListener('click', function () { i = (i - 1 + group.length) % group.length; show(); });
    $('.nx', box).addEventListener('click', function () { i = (i + 1) % group.length; show(); });
    document.addEventListener('keydown', function (e) { if (!box.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') $('.pv', box).click(); if (e.key === 'ArrowRight') $('.nx', box).click(); });
  }
  /* YouTube：點了才載入播放器，頁面不卡 */
  function videos() {
    $$('[data-yt]').forEach(function (b) { b.addEventListener('click', function () { var f = document.createElement('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-yt') + '?autoplay=1&rel=0'; f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; f.allowFullscreen = true; f.title = b.getAttribute('aria-label') || 'YouTube'; b.replaceWith(f); }); });
  }
  /* 文章分類與搜尋 */
  function filters() {
    var tabs = $$('[data-filter]'); if (!tabs.length) return;
    var search = $('.js-search'), items = $$('[data-cat]'), empty = $('.js-empty');
    var cur = decodeURIComponent((location.hash || startHash || '').slice(1));
    function apply() {
      var q = search ? search.value.trim().toLowerCase() : '', n = 0;
      items.forEach(function (it) {
        var ok = (!cur || it.getAttribute('data-cat') === cur) && (!q || (it.getAttribute('data-text') || '').toLowerCase().indexOf(q) >= 0);
        it.style.display = ok ? '' : 'none'; if (ok) n++;
      });
      tabs.forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-filter') === cur); });
      if (empty) empty.style.display = n ? 'none' : 'block';
    }
    tabs.forEach(function (t) { t.addEventListener('click', function (e) { e.preventDefault(); cur = t.getAttribute('data-filter'); history.replaceState(null, '', cur ? '#' + cur : location.pathname); apply(); }); });
    if (search) search.addEventListener('input', apply);
    apply();
  }

  document.addEventListener('DOMContentLoaded', function () { drawer(); rails(); jumps(); forms(); filters(); lightbox(); videos(); });
})();
