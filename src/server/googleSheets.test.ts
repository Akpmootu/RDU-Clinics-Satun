import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeClinicData, parseAssessmentPeriodRows, parseAssessmentRows, parseAuditLogRows, parseClinicRegistryRows, parseClinicRows, parseCsv } from './googleSheets.js';

test('parseCsv handles quoted commas, new lines and escaped quotes', () => {
  assert.deepEqual(parseCsv('a,"b,c","d""e"\r\n1,2,3'), [
    ['a', 'b,c', 'd"e'],
    ['1', '2', '3'],
  ]);
});

test('parseAuditLogRows hides internal mutation lock events', () => {
  const rows = [
    ['id', 'timestamp', 'district', 'clinicName', 'previousStatus', 'newStatus', 'previousLevel', 'newLevel', 'editedBy', 'remarks'],
    ['lock_1', '2026-08-21T00:00:00.000Z', '', '', 'LOCK', 'clinic:STN-1', '', '', 'system', 'token-1'],
    ['audit_1', '2026-08-21T00:00:01.000Z', 'เมือง', 'คลินิก ก', 'รอประเมิน', 'ประเมินแล้ว', '', '2', 'admin', 'UPDATE'],
    ['unlock_1', '2026-08-21T00:00:02.000Z', '', '', 'UNLOCK', 'clinic:STN-1', '', '', 'system', 'token-1'],
  ];

  assert.deepEqual(parseAuditLogRows(rows).map((item) => item.id), ['audit_1']);
});

test('parseClinicRows maps the existing Google Sheet layout to the UI model', () => {
  const rows = [
    ['รายชื่อสถานพยาบาลกลุ่มเป้าหมายที่ต้องประเมินตนเองตามแบบประเมิน RDU ในคลินิกเขตอำเภอเมือง'],
    [
      'ลำดับที่',
      'ชื่อสถานพยาบาล',
      'ประเภท',
      'ผู้รับอนุญาต',
      'ประเมิน RDU',
      'ระดับผลการประเมิน',
      'เกณฑ์ผ่าน (>=ระดับ2)',
      'หมายเหตุ',
    ],
    ['1', 'คลินิกทดสอบ', 'คลินิกเวชกรรม', 'นาย ก', 'ประเมินแล้ว', 'ระดับ 2', 'ผ่าน', 'พร้อม'],
    ['ภาพรวม', 'ภาพรวมอำเภอเมือง', '', '', '', '', '', ''],
  ];

  assert.deepEqual(parseClinicRows(rows, { district: 'เมือง' }), [
    {
      id: 'STN-เมือง-1',
      no: 1,
      district: 'เมือง',
      name: 'คลินิกทดสอบ',
      type: 'คลินิกเวชกรรม',
      licensee: 'นาย ก',
      assessmentStatus: 'ประเมินแล้ว',
      assessmentLevel: 2,
      passCriteria: 'ผ่าน',
      remarks: 'พร้อม',
    },
  ]);
});

test('parseClinicRows supports a master sheet with a district column', () => {
  const rows = [
    ['ลำดับ', 'อำเภอ', 'ชื่อคลินิก', 'ประเภทคลินิก', 'ผู้รับอนุญาต', 'สถานะ', 'ระดับ', 'ผ่านเกณฑ์', 'หมายเหตุ'],
    ['7', 'อำเภอละงู', 'คลินิกตัวอย่าง', 'คลินิกทันตกรรม', 'นาง ข', 'รอประเมิน', '', '', ''],
  ];

  assert.equal(parseClinicRows(rows)[0]?.district, 'ละงู');
  assert.equal(parseClinicRows(rows)[0]?.assessmentLevel, null);
  assert.equal(parseClinicRows(rows)[0]?.passCriteria, 'รอการประเมิน');
});

test('confirmed sheets join by stable clinicId with the active fiscal year', () => {
  const registry = parseClinicRegistryRows([
    ['clinicId', 'district', 'no', 'name', 'type', 'licensee', 'address', 'phone', 'latitude', 'longitude', 'businessStatus', 'businessStatusNote', 'updatedAt', 'updatedBy'],
    ['STN-001', 'เมือง', '1', 'คลินิก schema', 'คลินิกเวชกรรม', 'นาย ก', '1 ถนนสตูล', '074123456', '6.62', '100.07', 'เปิดดำเนินการ', '', '2026-01-01', 'seed'],
  ]);
  const assessments = parseAssessmentRows([
    ['id', 'fiscalYear', 'clinicId', 'assessmentStatus', 'assessmentLevel', 'passCriteria', 'assessmentDate', 'remarks', 'updatedAt', 'updatedBy'],
    ['asm-old', '2568', 'STN-001', 'ประเมินแล้ว', '1', 'ไม่ผ่าน', '2025-02-01', 'เก่า', '2025-02-01', 'old@example.com'],
    ['asm-current', '2569', 'STN-001', 'ประเมินแล้ว', '3', 'ผ่าน', '2026-02-01', 'ล่าสุด', '2026-02-01', 'admin@example.com'],
  ]);
  const periods = parseAssessmentPeriodRows([
    ['fiscalYear', 'label', 'startDate', 'endDate', 'targetPercentage'],
    ['2569', 'ปี 2569', '2026-01-01', '2026-12-31', '80'],
  ]);
  const clinic = mergeClinicData(registry, assessments, periods)[0];
  assert.equal(clinic.id, 'STN-001');
  assert.equal(clinic.fiscalYear, 2569);
  assert.equal(clinic.assessmentLevel, 3);
  assert.equal(clinic.address, '1 ถนนสตูล');
  assert.equal(clinic.latitude, 6.62);
  assert.equal(clinic.updatedBy, 'admin@example.com');
  assert.equal(clinic.version, '2026-02-01');
});

test('join selects maximum assessment year when no period is active', () => {
  const registry = parseClinicRegistryRows([
    ['clinicId', 'district', 'no', 'name', 'type', 'licensee', 'address', 'phone', 'latitude', 'longitude', 'businessStatus', 'businessStatusNote', 'updatedAt', 'updatedBy'],
    ['STN-002', 'ละงู', '2', 'คลินิกปีล่าสุด', 'คลินิกทันตกรรม', 'นาง ข', '', '', '', '', 'พักใช้', 'ต่อใบอนุญาต', '', ''],
  ]);
  const assessments = parseAssessmentRows([
    ['id', 'fiscalYear', 'clinicId', 'assessmentStatus', 'assessmentLevel', 'passCriteria', 'assessmentDate', 'remarks', 'updatedAt', 'updatedBy'],
    ['a1', '2569', 'STN-002', 'ประเมินแล้ว', '2', 'ผ่าน', '', '', '', ''],
    ['a2', '2570', 'STN-002', 'ยังไม่ประเมิน', '', 'รอการประเมิน', '', 'ปีใหม่', '', ''],
  ]);
  const clinic = mergeClinicData(registry, assessments)[0];
  assert.equal(clinic.fiscalYear, 2570);
  assert.equal(clinic.assessmentStatus, 'ยังไม่ประเมิน');
  assert.equal(clinic.assessmentLevel, null);
  assert.equal(clinic.businessStatus, 'พักใช้');
  assert.match(clinic.version || '', /^legacy_[a-f0-9]{24}$/);
});
