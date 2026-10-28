/* 7E 商學院官網：裝置切換、畫面縮放、表單送出、文章篩選 */
(function () {
  var path = location.pathname;
  var isM = /^\/m\//.test(path);
  var name = path.replace(/^\/m\//, '/').replace(/^\//, '') || 'index.html';
  var w = Math.min(window.innerWidth || 9999, screen.width || 9999);

  // 手機看電腦版 → 轉到 /m/；大螢幕看手機版 → 轉回電腦版
  if (name !== 'menu.html') {
    if (!isM && w < 820) { location.replace('/m/' + name + location.search + location.hash); return; }
    if (isM && w >= 1024) { location.replace('/' + name + location.search + location.hash); return; }
  }

  // 電腦版設計寬 1440，小於這個寬度時等比例縮小
  function fit() {
    if (isM) return;
    var z = Math.min(1, window.innerWidth / 1440);
    document.documentElement.style.zoom = z < 1 ? z : '';
  }
  fit();
  window.addEventListener('resize', fit);

  function show(msg, text, bad) {
    if (!msg) return;
    msg.textContent = text;
    msg.style.display = 'block';
    msg.style.background = bad ? '#FDF1EF' : '#F2F7EF';
    msg.style.color = bad ? '#9B2C1F' : '#2F5D2A';
  }

  function forms() {
    var list = document.querySelectorAll('form.js-form');
    for (var i = 0; i < list.length; i++) (function (f) {
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var msg = f.querySelector('.js-msg');
        var req = f.querySelectorAll('[required]');
        for (var j = 0; j < req.length; j++) {
          var el = req[j];
          var empty = el.type === 'checkbox' ? !el.checked : !String(el.value || '').trim();
          if (empty) { show(msg, '請填寫標示 * 的必填欄位，並勾選同意隱私權政策。', true); el.focus(); return; }
        }
        var ep = (window.SITE || {}).endpoint;
        if (!ep) { show(msg, '線上表單尚未開通，請先透過官方 LINE@ 與我們聯繫。', true); return; }
        var data = new URLSearchParams();
        data.append('form_type', f.getAttribute('data-form') || '官網表單');
        data.append('來源頁面', location.pathname);
        new FormData(f).forEach(function (v, k) { data.append(k, v); });
        var btn = f.querySelector('button[type=submit]');
        if (btn) btn.disabled = true;
        fetch(ep, { method: 'POST', mode: 'no-cors', body: data })
          .then(function () { f.reset(); show(msg, '已收到你的資料！7E 團隊會盡快與你聯繫。'); })
          .catch(function () { show(msg, '送出失敗，請稍後再試，或改用官方 LINE@ 聯繫。', true); })
          .then(function () { if (btn) btn.disabled = false; });
      });
    })(list[i]);
  }

  function filters() {
    var tabs = document.querySelectorAll('.js-tabs [data-filter]');
    if (!tabs.length) return;
    var search = document.querySelector('.js-search');
    var items = document.querySelectorAll('[data-cat]');
    var empty = document.querySelector('.js-empty');
    var current = decodeURIComponent((location.hash || '').slice(1));
    function apply() {
      var q = search ? search.value.trim().toLowerCase() : '';
      var n = 0;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var ok = (!current || it.getAttribute('data-cat') === current) &&
                 (!q || (it.getAttribute('data-text') || '').toLowerCase().indexOf(q) >= 0);
        it.style.display = ok ? '' : 'none';
        if (ok) n++;
      }
      for (var k = 0; k < tabs.length; k++) tabs[k].classList.toggle('on', tabs[k].getAttribute('data-filter') === current);
      if (empty) empty.style.display = n ? 'none' : 'block';
    }
    for (var t = 0; t < tabs.length; t++) tabs[t].addEventListener('click', function (e) {
      e.preventDefault();
      current = this.getAttribute('data-filter');
      history.replaceState(null, '', current ? '#' + current : location.pathname);
      apply();
    });
    if (search) search.addEventListener('input', apply);
    apply();
  }

  document.addEventListener('DOMContentLoaded', function () { forms(); filters(); });
})();
