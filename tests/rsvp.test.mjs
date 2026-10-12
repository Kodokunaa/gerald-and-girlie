import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import handler, { validateRsvp } from '../api/rsvp.js';

const valid = { name: ' Jane Guest ', attendance: 'yes', message: ' Congrats! ', submissionId: '12345678-1234-1234-1234-123456789abc' };
test('RSVP validates names, attendance and message length', () => {
  assert.deepEqual(validateRsvp(valid), { ...valid, name: 'Jane Guest', message: 'Congrats!' });
  for (const body of [{ ...valid, name: '' }, { ...valid, attendance: 'maybe' }, { ...valid, message: 'a'.repeat(1001) }, { ...valid, submissionId: '' }, null]) assert.throws(() => validateRsvp(body));
});

function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
test('RSVP refuses to claim a save when Sheets is not configured', async () => {
  const previous = process.env.RSVP_SCRIPT_URL;
  delete process.env.RSVP_SCRIPT_URL;
  try {
    const res = response();
    await handler({ method: 'POST', headers: {}, body: valid }, res);
    assert.equal(res.code, 503); assert.ok(res.body.error); assert.notEqual(res.body.ok, true);
  } finally { if (previous !== undefined) process.env.RSVP_SCRIPT_URL = previous; }
});
test('RSVP requires the spreadsheet to acknowledge a successful write', async () => {
  const priorUrl = process.env.RSVP_SCRIPT_URL, priorSecret = process.env.RSVP_SCRIPT_SECRET, originalFetch = global.fetch;
  process.env.RSVP_SCRIPT_URL = 'https://script.google.com/macros/s/test/exec';
  process.env.RSVP_SCRIPT_SECRET = 'test-secret';
  try {
    let sent;
    global.fetch = async (url, options) => { sent = JSON.parse(options.body); return { ok: true, json: async () => ({ ok: true }) }; };
    const res = response();
    await handler({ method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://gerald-and-girlie.vercel.app' }, body: valid }, res);
    assert.equal(res.code, 200); assert.equal(sent.secret, 'test-secret'); assert.equal(sent.name, 'Jane Guest');
    global.fetch = async () => ({ ok: true, json: async () => ({ ok: false }) });
    const failed = response();
    await handler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: valid }, failed);
    assert.equal(failed.code, 502); assert.notEqual(failed.body.ok, true);
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of [['RSVP_SCRIPT_URL', priorUrl], ['RSVP_SCRIPT_SECRET', priorSecret]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test('Google receiver rejects unauthorized writes, deduplicates retries and escapes formulas', () => {
  const rows = [['headers']];
  const context = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => ({ RSVP_SECRET: 'secret', RSVP_SHEET_ID: 'sheet' })[key] }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, hasLock: () => true, releaseLock() {} }) },
    SpreadsheetApp: { flush() {}, openById: () => ({ getSheetByName: () => ({ getLastRow: () => rows.length, appendRow: row => rows.push(row), getRange: () => ({ createTextFinder: id => ({ matchEntireCell: () => ({ findNext: () => rows.some(row => row[5] === id) ? {} : null }) }) }) }) }) },
    Utilities: { formatDate: () => '2026-10-12 12:00:00' },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('integrations/rsvp-google-apps-script.gs', 'utf8'), context);
  const send = data => context.doPost({ postData: { contents: JSON.stringify(data) } });
  assert.equal(send({ ...valid, secret: 'wrong' }).ok, false);
  assert.equal(rows.length, 1);
  const record = { ...valid, name: '=IMPORTXML()', message: '+formula', secret: 'secret' };
  assert.equal(send(record).ok, true); assert.equal(send(record).ok, true);
  assert.equal(rows.length, 2); assert.equal(rows[1][1], "'=IMPORTXML()"); assert.equal(rows[1][4], "'+formula"); assert.equal(rows[1][3], 1);
});
