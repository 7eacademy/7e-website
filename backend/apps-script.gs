/**
 * 7E 商學院官網接收程式（Google Apps Script）
 * 1. 官網表單：顧問預約、企業內訓諮詢、聯絡我們 → 每種表單一個分頁
 * 2. LINE 會員加入：驗證 LINE 登入 → 寫入「會員名單」分頁
 * 送出後都會寄通知信到 NOTIFY_EMAIL。
 *
 * 安裝（詳見 README）：
 *   建立 Google 試算表 → 擴充功能 → Apps Script → 貼上本檔全部內容 → 儲存
 *   → 左側齒輪「專案設定」→ 指令碼屬性 → 新增：
 *        LINE_CHANNEL_ID      = 2012270476
 *        LINE_CHANNEL_SECRET  = （LINE Developers「7eacademy」頻道的 Channel secret）
 *   → 部署 → 新增部署作業 → 網頁應用程式；執行身分：我；存取權：所有人 → 部署 → 複製網址
 *   → 貼到官網後台「網站設定 → 官網表單接收網址」
 * Channel secret 只放在「指令碼屬性」，不要寫進程式碼或網站。
 */
const NOTIFY_EMAIL = '7eacademy.unicorn@gmail.com'; // 收通知的信箱，可改
const MEMBER_SHEET = '會員名單';
const MEMBER_HEADER = ['加入時間', '最後更新', 'LINE 使用者 ID', 'LINE 名稱', 'LINE 大頭照', 'LINE Email',
  '姓名', '手機', 'Email', '公司／品牌名稱', '職稱', '產業別', '公司人數', '有興趣的服務', '同意隱私權政策', '同意接收 7E 訊息', '來源頁面', '處理狀態'];

function doGet() {
  return ContentService.createTextOutput('7E 官網接收程式運作中');
}

function doPost(e) {
  // 會員功能用 JSON（Content-Type: text/plain），表單用一般 form 格式
  var raw = (e.postData && e.postData.contents) || '';
  if (raw.charAt(0) === '{') {
    var req;
    try { req = JSON.parse(raw); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }
    try {
      if (req.action === 'line_login') return json_(lineLogin_(req));
      if (req.action === 'member_join') return json_(memberJoin_(req));
      return json_({ ok: false, error: 'unknown_action' });
    } catch (err) {
      return json_({ ok: false, error: String(err && err.message || err).slice(0, 200) });
    }
  }
  return saveForm_(e);
}

/* ---------------- 官網表單 ---------------- */
function saveForm_(e) {
  var params = e.parameters || {};
  var formType = String((params.form_type || ['官網表單'])[0]).slice(0, 90);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(formType) || ss.insertSheet(formType);
  var keys = Object.keys(params).filter(function (k) { return k !== 'form_type'; });
  var header = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : ['送出時間', '處理狀態'];
  keys.forEach(function (k) { if (header.indexOf(k) < 0) header.push(k); });
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  sheet.appendRow(header.map(function (h) {
    if (h === '送出時間') return new Date();
    if (h === '處理狀態') return '未處理';
    return clean_((params[h] || []).join('、'));
  }));
  try {
    MailApp.sendEmail(NOTIFY_EMAIL, '【7E 官網】新的' + formType,
      keys.map(function (k) { return k + '：' + (params[k] || []).join('、'); }).join('\n'));
  } catch (err) { /* 通知信失敗不影響存檔 */ }
  return ContentService.createTextOutput('ok');
}

/* ---------------- LINE 會員 ---------------- */
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }

// 步驟 1：用 LINE 回傳的 code 換取身分，驗證後發一張 1 小時有效的暫時通行證
function lineLogin_(req) {
  var id = prop_('LINE_CHANNEL_ID'), secret = prop_('LINE_CHANNEL_SECRET');
  if (!id || !secret) return { ok: false, error: 'not_configured' };
  var redirect = String(req.redirect_uri || '');
  if (!/^https:\/\//.test(redirect)) return { ok: false, error: 'bad_redirect' };
  var tok = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'post', muteHttpExceptions: true,
    payload: { grant_type: 'authorization_code', code: String(req.code || ''), redirect_uri: redirect, client_id: id, client_secret: secret }
  });
  if (tok.getResponseCode() !== 200) return { ok: false, error: 'token_failed' };
  var t = JSON.parse(tok.getContentText());
  var ver = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'post', muteHttpExceptions: true, payload: { id_token: t.id_token, client_id: id }
  });
  if (ver.getResponseCode() !== 200) return { ok: false, error: 'verify_failed' };
  var v = JSON.parse(ver.getContentText());
  var profile = { userId: v.sub, name: v.name || '', picture: v.picture || '', email: v.email || '' };
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('m_' + token, JSON.stringify(profile), 3600);
  var existing = findMember_(profile.userId);
  return {
    ok: true, token: token,
    profile: { name: profile.name, picture: profile.picture, email: profile.email },
    member: existing ? existing.data : null
  };
}

// 步驟 2：填完資料送出，寫入（或更新）會員名單
function memberJoin_(req) {
  var cached = CacheService.getScriptCache().get('m_' + String(req.token || ''));
  if (!cached) return { ok: false, error: 'expired' };
  var p = JSON.parse(cached);
  var f = req.fields || {};
  var name = clean_(f.name), phone = clean_(f.phone), email = clean_(f.email);
  if (!name || !phone || !email || f.agree !== true) return { ok: false, error: 'missing' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'bad_email' };

  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var sheet = memberSheet_();
    var now = new Date();
    var found = findMember_(p.userId);
    var row = [
      found ? found.joined : now, now, p.userId, p.name, p.picture, p.email,
      name, phone, email, clean_(f.company), clean_(f.title), clean_(f.industry), clean_(f.size),
      clean_([].concat(f.interests || []).join('、')), '是', f.subscribe === true ? '是' : '否', clean_(f.page),
      found ? found.status : '新會員'
    ];
    if (found) sheet.getRange(found.row, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
    CacheService.getScriptCache().remove('m_' + req.token);
    try {
      MailApp.sendEmail(NOTIFY_EMAIL, (found ? '【7E 官網】會員資料更新：' : '【7E 官網】新會員加入：') + name,
        MEMBER_HEADER.map(function (h, i) { return h + '：' + row[i]; }).join('\n'));
    } catch (err) {}
    return { ok: true, updated: !!found };
  } finally { lock.releaseLock(); }
}

function memberSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MEMBER_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(MEMBER_SHEET, 0);
    sheet.getRange(1, 1, 1, MEMBER_HEADER.length).setValues([MEMBER_HEADER]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findMember_(userId) {
  if (!userId) return null;
  var sheet = memberSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var ids = sheet.getRange(2, 3, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === userId) {
      var r = sheet.getRange(i + 2, 1, 1, MEMBER_HEADER.length).getValues()[0];
      return {
        row: i + 2, joined: r[0], status: r[17] || '新會員',
        data: { name: r[6], phone: r[7], email: r[8], company: r[9], title: r[10], industry: r[11], size: r[12], interests: String(r[13] || '').split('、').filter(String), subscribe: r[15] === '是' }
      };
    }
  }
  return null;
}

// 防止試算表公式注入、限制長度
function clean_(v) {
  var s = String(v == null ? '' : v).trim().slice(0, 500);
  // 開頭是 = + - @ 的防公式注入；0 開頭的數字（手機、電話）保留開頭的 0
  return /^[=+\-@]/.test(s) || /^0\d/.test(s) ? "'" + s : s;
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
