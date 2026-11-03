/* 7E 會員加入：LINE Login → Google Apps Script 驗證 → 填資料 → 寫入會員名單 */
(function () {
  var app = document.getElementById('member-app'); if (!app) return;
  var $ = function (s) { return app.querySelector(s); };
  var M = {}, mm = document.getElementById('member-msg'); if (mm) ['not_ready', 'error', 'expired', 'missing', 'bad_email', 'fail'].forEach(function (k) { M[k] = mm.getAttribute('data-' + k) || ''; });
  var ep = (window.SITE || {}).endpoint, channel = app.getAttribute('data-channel');
  var redirect = location.origin + '/member';
  // 用 localStorage（同一個瀏覽器的分頁都讀得到）。手機瀏覽器登入時常會跳到 LINE App 再回來，
  // 回來的地方可能是另一個分頁或 LINE 內建瀏覽器，讀不到原本的紀錄，這時仍繼續（身分由後端用 Channel secret 驗證）。
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} } };
  var token = null, isUpdate = false;
  function step(name) { ['start', 'loading', 'form', 'done'].forEach(function (s) { var el = app.querySelector('[data-step="' + s + '"]'); if (el) el.hidden = s !== name; }); }
  function top(t, bad) { var m = $('[data-top-msg]'); m.textContent = t || ''; m.className = 'msg ' + (t ? (bad ? 'err' : 'ok') : ''); }
  function call(body) { return fetch(ep, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
  function rand() { var a = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }

  $('[data-line-login]').addEventListener('click', function () {
    if (!ep || !channel) { top(M.not_ready, true); return; }
    var state = rand(), nonce = rand(); store.set('7e_state', state); store.set('7e_state_at', String(Date.now()));
    location.href = 'https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=' + encodeURIComponent(channel) +
      '&redirect_uri=' + encodeURIComponent(redirect) + '&state=' + state + '&nonce=' + nonce + '&scope=' + encodeURIComponent('profile openid email');
  });

  var q = new URLSearchParams(location.search), code = q.get('code');
  if (q.get('error')) { history.replaceState(null, '', location.pathname); top(M.error, true); return; }
  if (!code) return;
  history.replaceState(null, '', location.pathname);
  if (!ep) { top(M.not_ready, true); return; }
  var saved = store.get('7e_state'), savedAt = +store.get('7e_state_at') || 0;
  // 同一個瀏覽器、10 分鐘內發出的登入，state 必須一致；其他情況（從 LINE App 回到別的瀏覽器）照常繼續
  if (saved && Date.now() - savedAt < 600000 && q.get('state') !== saved) { top(M.error, true); return; }
  store.del('7e_state_at');
  store.del('7e_state');
  step('loading');
  call({ action: 'line_login', code: code, redirect_uri: redirect }).then(function (r) {
    if (!r.ok) { step('start'); top(M.error, true); return; }
    token = r.token;
    var f = $('form'), p = r.profile || {}, m = r.member;
    $('[data-lname]').textContent = p.name || '';
    if (p.picture) { var img = $('[data-pic]'); img.src = p.picture; img.hidden = false; }
    f.email.value = (m && m.email) || p.email || '';
    if (m) {
      isUpdate = true; $('[data-existing]').hidden = false;
      ['name', 'phone', 'company', 'title', 'industry', 'size'].forEach(function (k) { if (m[k] && f[k]) f[k].value = m[k]; });
      Array.prototype.forEach.call(f.querySelectorAll('[name=interests]'), function (c) { c.checked = (m.interests || []).indexOf(c.value) >= 0; });
      f.subscribe.checked = !!m.subscribe;
      var b = $('[data-submit]'); b.firstChild.nodeValue = b.getAttribute('data-label-update') + ' ';
    }
    step('form');
  }).catch(function () { step('start'); top(M.fail, true); });

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = f.querySelector('.msg');
    function show(t, bad) { msg.textContent = t; msg.className = 'msg full ' + (bad ? 'err' : 'ok'); }
    var data = { name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), company: f.company.value.trim(), title: f.title.value.trim(), industry: f.industry.value, size: f.size.value,
      interests: Array.prototype.filter.call(f.querySelectorAll('[name=interests]'), function (c) { return c.checked; }).map(function (c) { return c.value; }),
      agree: f.agree.checked, subscribe: f.subscribe.checked, page: location.pathname };
    if (!data.name || !data.phone || !data.email || !data.agree) { show(M.missing, true); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) { show(M.bad_email, true); return; }
    var btn = f.querySelector('[data-submit]'); btn.disabled = true;
    call({ action: 'member_join', token: token, fields: data }).then(function (r) {
      btn.disabled = false;
      if (r.ok) { if (r.updated || isUpdate) { var t = $('[data-done-title]'); t.textContent = t.getAttribute('data-updated'); } step('done'); window.scrollTo(0, app.getBoundingClientRect().top + window.pageYOffset - 120); return; }
      show(M[r.error] || M.fail, true);
      if (r.error === 'expired') setTimeout(function () { step('start'); }, 1500);
    }).catch(function () { btn.disabled = false; show(M.fail, true); });
  });
})();
