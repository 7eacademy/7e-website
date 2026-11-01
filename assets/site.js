/* 7E 商學院官網：選單、輪播、表單、文章篩選（響應式，單一版本） */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

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
          if (on) a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
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

  /* 文章分類與搜尋 */
  function filters() {
    var tabs = $$('[data-filter]'); if (!tabs.length) return;
    var search = $('.js-search'), items = $$('[data-cat]'), empty = $('.js-empty');
    var cur = decodeURIComponent((location.hash || '').slice(1));
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

  document.addEventListener('DOMContentLoaded', function () { drawer(); rails(); jumps(); forms(); filters(); });
})();
