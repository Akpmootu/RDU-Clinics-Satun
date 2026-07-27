import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClinicUpdateMessage,
  dashboardReplyMarkup,
  DEFAULT_DASHBOARD_URL,
  escapeTelegramHtml,
} from './telegram.js';

test('Telegram dynamic fields are escaped for HTML parse mode', () => {
  assert.equal(escapeTelegramHtml('A&B <Clinic>'), 'A&amp;B &lt;Clinic&gt;');
});

test('clinic update message contains the assessment result without raw HTML input', () => {
  const message = buildClinicUpdateMessage({
    clinicName: '<script>คลินิก</script>',
    district: 'เมือง',
    assessmentStatus: 'ประเมินแล้ว',
    assessmentLevel: 2,
    editedBy: 'ผู้ทดสอบ',
    remarks: 'ทดสอบ & ยืนยัน',
    timestamp: '27/07/2569 18:00:00',
  });

  assert.match(message, /ผ่านเกณฑ์/);
  assert.doesNotMatch(message, /<script>/);
  assert.match(message, /&lt;script&gt;/);
  assert.match(message, /ทดสอบ &amp; ยืนยัน/);
});

test('inline dashboard button always opens the production website', () => {
  const previousUrl = process.env.DASHBOARD_URL;
  delete process.env.DASHBOARD_URL;

  try {
    assert.equal(
      dashboardReplyMarkup().inline_keyboard[0][0].url,
      DEFAULT_DASHBOARD_URL
    );
  } finally {
    if (previousUrl === undefined) {
      delete process.env.DASHBOARD_URL;
    } else {
      process.env.DASHBOARD_URL = previousUrl;
    }
  }
});
