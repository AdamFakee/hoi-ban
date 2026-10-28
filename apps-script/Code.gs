/**
 * Người Quen Xì Gòn — nhận dữ liệu form và ghi vào Google Sheet.
 * Dán file này vào Extensions → Apps Script của CHÍNH Google Sheet cần lưu dữ liệu
 * (script gắn với Sheet nên dùng getActiveSpreadsheet được), rồi Deploy → Web app.
 */
const SHEET_NAME = 'Đăng ký';
const HEADERS = ['Thời gian gửi', 'Bạn là ai', 'Kèo đã chọn', 'Nguyện vọng riêng', 'Các ngày rảnh', 'Khung giờ', 'Muốn nấu xói ai (và nguyên liệu)', 'Ghi chú'];
const MAX_LEN = 800;

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);                       // tránh 2 người ghi trùng một dòng
    const p = (e && e.parameter) || {};
    if (p.website) return json_({ ok: true });  // honeypot: bot điền thì bỏ qua, vẫn trả "ok"

    const name = clean_(p.name);
    if (name.length < 2) return json_({ ok: false, error: 'invalid' });

    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      name,
      clean_(p.wishes),
      clean_(p.wishText),
      clean_(p.dates),
      clean_(p.slot),
      clean_(p.roast),
      clean_(p.note)
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// Mở URL /exec bằng trình duyệt để kiểm tra Web app đã chạy chưa.
function doGet() {
  return json_({ ok: true, service: 'hoi-keo' });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

// Cắt độ dài và chặn công thức (=, +, -, @ ở đầu ô sẽ bị Sheets hiểu là công thức)
function clean_(v) {
  let s = String(v == null ? '' : v).trim().slice(0, MAX_LEN);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
