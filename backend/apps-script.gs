/**
 * 7E 商學院官網表單接收程式（Google Apps Script）
 * 官網上的「顧問預約」「企業內訓諮詢」「聯絡我們」表單送出後，
 * 資料會寫進這份試算表（每種表單一個分頁），並寄通知信。
 *
 * 安裝：建立新的 Google 試算表 → 擴充功能 → Apps Script → 貼上本檔全部內容 → 儲存
 *      → 部署 → 新增部署作業 → 類型選「網頁應用程式」
 *      → 執行身分：我；誰可以存取：所有人 → 部署 → 複製網址
 *      → 貼到官網後台「網站設定 → 官網表單接收網址」
 */
const NOTIFY_EMAIL = '7eacademy.unicorn@gmail.com'; // 收通知的信箱，可改

function doPost(e) {
  const params = e.parameters || {};
  const formType = String((params.form_type || ['官網表單'])[0]).slice(0, 90);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(formType) || ss.insertSheet(formType);

  const keys = Object.keys(params).filter(function (k) { return k !== 'form_type'; });
  let header = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    : ['送出時間', '處理狀態'];
  keys.forEach(function (k) { if (header.indexOf(k) < 0) header.push(k); });
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');

  const row = header.map(function (h) {
    if (h === '送出時間') return new Date();
    if (h === '處理狀態') return '未處理';
    return (params[h] || []).join('、');
  });
  sheet.appendRow(row);

  try {
    const body = keys.map(function (k) { return k + '：' + (params[k] || []).join('、'); }).join('\n');
    MailApp.sendEmail(NOTIFY_EMAIL, '【7E 官網】新的' + formType, body);
  } catch (err) { /* 通知信失敗不影響存檔 */ }

  return ContentService.createTextOutput('ok');
}

function doGet() {
  return ContentService.createTextOutput('7E 官網表單接收程式運作中');
}
