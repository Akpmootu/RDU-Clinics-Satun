import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseUserRows,
  stableUserId,
  USER_HEADERS,
  userToRow,
} from './userRepository.js';

test('SystemUsers rows round-trip without losing permission fields', () => {
  const user = {
    id: 'usr_google_example',
    emailOrId: 'officer@example.com',
    name: 'เจ้าหน้าที่ ทดสอบ',
    firstName: 'เจ้าหน้าที่',
    lastName: 'ทดสอบ',
    position: 'เภสัชกร',
    workGroup: 'กลุ่มงานเภสัชกรรม',
    affiliation: 'สำนักงานสาธารณสุขจังหวัดสตูล',
    phone: '074-000-000',
    provider: 'google' as const,
    role: 'admin' as const,
    status: 'active' as const,
    createdAt: '2026-07-27 10:00',
    approvedBy: 'akaporn1234@gmail.com',
    approvedAt: '2026-07-27T10:01:00.000Z',
    avatarUrl: 'https://example.com/avatar.png',
    updatedAt: '2026-07-27T10:01:00.000Z',
  };

  assert.deepEqual(
    parseUserRows([[...USER_HEADERS], userToRow(user)]),
    [user]
  );
});

test('invalid SystemUsers rows are ignored', () => {
  const invalidRow = Array(USER_HEADERS.length).fill('');
  invalidRow[USER_HEADERS.indexOf('emailOrId')] = 'unknown@example.com';
  invalidRow[USER_HEADERS.indexOf('provider')] = 'unknown';
  invalidRow[USER_HEADERS.indexOf('role')] = 'owner';
  invalidRow[USER_HEADERS.indexOf('status')] = 'enabled';

  assert.deepEqual(parseUserRows([[...USER_HEADERS], invalidRow]), []);
});

test('stable user ids are deterministic and provider-specific', () => {
  assert.equal(
    stableUserId('google', ' Officer@Example.com '),
    stableUserId('google', 'officer@example.com')
  );
  assert.notEqual(
    stableUserId('google', 'officer@example.com'),
    stableUserId('line', 'officer@example.com')
  );
});
