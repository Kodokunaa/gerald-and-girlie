// Paste into a standalone Google Apps Script project. Run setupRsvp once.
function setupRsvp() {
  const properties = PropertiesService.getScriptProperties();
  let id = properties.getProperty('RSVP_SHEET_ID');
  if (!id) {
    const book = SpreadsheetApp.create('Gerald & Girlie — RSVP Responses');
    const sheet = book.getSheets()[0];
    sheet.setName('Responses');
    sheet.appendRow(['Received (Asia/Manila)', 'Guest name', 'Attendance', 'Reserved seats', 'Message', 'Submission ID']);
    sheet.getRange('A1:F1').setBackground('#57362c').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 6, 180);
    sheet.setColumnWidth(5, 360);
    book.setSpreadsheetTimeZone('Asia/Manila');
    id = book.getId();
    properties.setProperty('RSVP_SHEET_ID', id);
  }
  if (!properties.getProperty('RSVP_SECRET')) properties.setProperty('RSVP_SECRET', Utilities.getUuid() + Utilities.getUuid());
  console.log('Spreadsheet: https://docs.google.com/spreadsheets/d/' + id + '/edit');
  console.log('RSVP_SCRIPT_SECRET: ' + properties.getProperty('RSVP_SECRET'));
}

function doPost(event) {
  const json = value => ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
  const lock = LockService.getScriptLock();
  try {
    const properties = PropertiesService.getScriptProperties();
    const data = JSON.parse(event.postData.contents);
    if (!properties.getProperty('RSVP_SECRET') || data.secret !== properties.getProperty('RSVP_SECRET')) return json({ ok: false });
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const message = typeof data.message === 'string' ? data.message.trim() : '';
    if (name.length < 2 || name.length > 100 || message.length > 1000 || !['yes', 'no'].includes(data.attendance) || !/^[a-f0-9-]{36}$/i.test(data.submissionId || '')) return json({ ok: false });
    lock.waitLock(10000);
    const sheet = SpreadsheetApp.openById(properties.getProperty('RSVP_SHEET_ID')).getSheetByName('Responses');
    if (sheet.getLastRow() > 1 && sheet.getRange(2, 6, sheet.getLastRow() - 1, 1).createTextFinder(data.submissionId).matchEntireCell(true).findNext()) return json({ ok: true });
    // Treat user text literally rather than allowing spreadsheet formulas.
    const literal = value => /^[=+\-@\t\r\n]/.test(value) ? "'" + value : value;
    sheet.appendRow([Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyy-MM-dd HH:mm:ss'), literal(name), data.attendance === 'yes' ? 'Attending' : 'Unable to attend', data.attendance === 'yes' ? 1 : 0, literal(message), data.submissionId]);
    SpreadsheetApp.flush();
    return json({ ok: true });
  } catch { return json({ ok: false }); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}
