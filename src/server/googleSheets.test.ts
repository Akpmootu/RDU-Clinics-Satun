import assert from 'node:assert/strict';
import test from 'node:test';
import { parseClinicRows, parseCsv } from './googleSheets.js';

test('parseCsv handles quoted commas, new lines and escaped quotes', () => {
  assert.deepEqual(parseCsv('a,"b,c","d""e"\r\n1,2,3'), [
    ['a', 'b,c', 'd"e'],
    ['1', '2', '3'],
  ]);
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
