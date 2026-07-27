export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ==============================================================================
 * โค้ด Google Apps Script (Code.gs)
 * สำหรับระบบติดตามการประเมินการใช้ยาอย่างสมเหตุผล (RDU) ในคลินิกเอกชน จังหวัดสตูล
 * พัฒนาโดย: IT SSJ Satun 2569 (สำนักงานสาธารณสุขจังหวัดสตูล)
 * ==============================================================================
 * 
 * วิธีการติดตั้ง:
 * 1. เปิด Google Sheets ของท่าน
 * 2. สร้าง Sheet ย่อยตามชื่ออำเภอ: 'เมือง', 'ท่าแพ', 'ละงู', 'ควนกาหลง', 'ควนโดน', 'ทุ่งหว้า', 'มะนัง'
 * 3. สร้าง Sheet ย่อยชื่อ 'AuditLogs' สำหรับเก็บประวัติแก้ไข
 * 4. ไปที่ Extensions > Apps Script (ส่วนขยาย > Apps Script)
 * 5. วางโค้ดนี้ทั้งหมดลงใน Code.gs
 * 6. กำหนดค่า TELEGRAM_BOT_TOKEN และ TELEGRAM_CHAT_ID (ถ้าต้องการใช้งาน Telegram)
 * 7. กด Deploy > New deployment > Select type: Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 8. คัดลอก Web App URL มาใส่ในเมนูตั้งค่าของระบบ Dashboard
 */

// --- ตั้งค่าระบบ (CONFIGURATION) ---
const TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'; // เช่น '123456789:ABCdefGhIJKlmNoPQRstuVWXyz'
const TELEGRAM_CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID';     // เช่น '-1001234567890' หรือ '987654321'
const APP_NAME = 'ระบบติดตาม RDU คลินิกเอกชน สตูล';
const DISTRICTS = ['เมือง', 'ท่าแพ', 'ละงู', 'ควนกาหลง', 'ควนโดน', 'ทุ่งหว้า', 'มะนัง'];

/**
 * รองรับ HTTP GET - สำหรับดึงข้อมูลคลินิกและประวัติแก้ไข
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'getAllData';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'getAuditLogs') {
      return responseJSON({
        status: 'success',
        data: getAuditLogsFromSheet(ss)
      });
    }
    
    // Default action: getAllData
    const allClinics = getAllClinicsFromSheets(ss);
    const auditLogs = getAuditLogsFromSheet(ss);
    const summaries = calculateDistrictSummaries(allClinics);
    
    return responseJSON({
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        clinics: allClinics,
        summaries: summaries,
        auditLogs: auditLogs
      }
    });
  } catch (error) {
    return responseJSON({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * รองรับ HTTP POST - สำหรับอัปเดตสถานะการประเมิน
 */
function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const action = contents.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'updateClinicStatus') {
      const result = updateClinicInSheet(ss, contents.data);
      
      // ส่งแจ้งเตือน Telegram หากเปิดใช้งาน
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== 'YOUR_TELEGRAM_BOT_TOKEN') {
        sendTelegramNotification(contents.data);
      }
      
      return responseJSON({
        status: 'success',
        message: 'อัปเดตข้อมูลและบันทึกประวัติสำเร็จ',
        updatedClinic: result.clinic,
        logEntry: result.logEntry
      });
    }
    
    return responseJSON({
      status: 'error',
      message: 'Unknown action parameter'
    });
  } catch (error) {
    return responseJSON({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * ดึงข้อมูลคลินิกทั้งหมดจาก Sheet แต่ละอำเภอ
 * (เริ่มอ่านข้อมูลตั้งแต่ แถวที่ 3 เป็นต้นไป เนื่องจากแถว 1-2 เป็นหัวข้อและคอลัมน์)
 * (ข้ามแถวสุดท้ายที่เป็นภาพรวมสรุป เนื่องจากโปรแกรมคำนวณอัตโนมัติแล้ว)
 */
function getAllClinicsFromSheets(ss) {
  let clinics = [];
  
  DISTRICTS.forEach(districtName => {
    const sheet = ss.getSheetByName(districtName);
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 2) return; // ข้าม Row 1 (ชื่อเรื่อง) และ Row 2 (Headers)
    
    // Headers Expected (Row 2):
    // [0]: ลำดับที่, [1]: ชื่อสถานพยาบาล, [2]: ประเภท, [3]: ผู้รับอนุญาต, [4]: ประเมิน RDU, [5]: ระดับผลการประเมิน, [6]: เกณฑ์ผ่าน (>=ระดับ2), [7]: หมายเหตุ
    // เริ่มอ่านข้อมูลจริงตั้งแต่ index 2 (Row 3 ใน Google Sheets)
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      const clinicName = String(row[1] || '').trim();
      const colA = String(row[0] || '').trim();
      
      // ข้ามถ้าไม่มีชื่อสถานพยาบาล หรือเป็นแถวสรุปผล "ภาพรวม..."
      if (!clinicName) continue;
      if (clinicName.includes('ภาพรวม') || colA.includes('ภาพรวม') || clinicName.startsWith('รวม')) continue;
      
      const rduStatus = String(row[4] || '').trim();
      const levelVal = parseInt(row[5]) || null;
      
      let assessmentStatus = 'รอประเมิน';
      if (rduStatus === 'ประเมินแล้ว' || levelVal !== null) {
        assessmentStatus = 'ประเมินแล้ว';
      }
      
      let passCriteria = 'รอการประเมิน';
      if (levelVal !== null) {
        passCriteria = levelVal >= 2 ? 'ผ่าน' : 'ไม่ผ่าน';
      }
      
      clinics.push({
        id: 'STN-' + districtName + '-' + (i - 1),
        rowNumber: i + 1, // บรรทัดจริงใน Google Sheet
        no: row[0] || (i - 1),
        district: districtName,
        name: clinicName,
        type: String(row[2] || 'คลินิกเวชกรรม').trim(),
        licensee: String(row[3] || '-').trim(),
        assessmentStatus: assessmentStatus,
        assessmentLevel: levelVal,
        passCriteria: passCriteria,
        remarks: String(row[7] || '').trim()
      });
    }
  });
  
  return clinics;
}

/**
 * อัปเดตข้อมูลใน Sheet และบันทึก AuditLog
 */
function updateClinicInSheet(ss, payload) {
  const districtSheet = ss.getSheetByName(payload.district);
  if (!districtSheet) throw new Error('ไม่พบ Sheet อำเภอ: ' + payload.district);
  
  const data = districtSheet.getDataRange().getValues();
  let targetRowIndex = -1;
  let previousData = { status: 'รอประเมิน', level: '-' };
  
  // ค้นหาแถวตามชื่อสถานพยาบาล (เริ่มหาตั้งแต่ Row 3 index 2)
  const searchName = payload.clinicName.trim().toLowerCase().replace(/\s+/g, ' ');
  for (let i = 2; i < data.length; i++) {
    const cName = String(data[i][1] || '').trim();
    const normalizedCName = cName.toLowerCase().replace(/\s+/g, ' ');
    if (cName && !cName.includes('ภาพรวม') && (normalizedCName === searchName || normalizedCName.includes(searchName) || searchName.includes(normalizedCName))) {
      targetRowIndex = i + 1; // 1-indexed row in Google Sheet
      previousData = {
        status: data[i][4] || 'รอประเมิน',
        level: data[i][5] ? 'ระดับ ' + data[i][5] : '-'
      };
      break;
    }
  }
  
  if (targetRowIndex === -1) {
    throw new Error('ไม่พบสถานพยาบาลชื่อ: ' + payload.clinicName);
  }
  
  // คำนวณเกณฑ์ผ่าน
  const newLevel = payload.assessmentLevel !== null ? parseInt(payload.assessmentLevel) : null;
  const passText = newLevel !== null ? (newLevel >= 2 ? 'ผ่าน' : 'ไม่ผ่าน') : 'รอการประเมิน';
  const statusText = payload.assessmentStatus;
  
  // อัปเดตข้อมูลแถว (Column 5 = E, Column 6 = F, Column 7 = G, Column 8 = H)
  districtSheet.getRange(targetRowIndex, 5).setValue(statusText);
  districtSheet.getRange(targetRowIndex, 6).setValue(newLevel !== null ? newLevel : '');
  districtSheet.getRange(targetRowIndex, 7).setValue(passText);
  districtSheet.getRange(targetRowIndex, 8).setValue(payload.remarks || '');
  
  // บันทึก AuditLog
  const nowStr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
  const logEntry = {
    id: 'LOG-' + Date.now().toString().slice(-6),
    timestamp: nowStr,
    district: payload.district,
    clinicId: payload.clinicId || ('STN-' + payload.district + '-' + targetRowIndex),
    clinicName: payload.clinicName,
    previousStatus: previousData.status,
    newStatus: statusText,
    previousLevel: previousData.level,
    newLevel: newLevel !== null ? ('ระดับ ' + newLevel) : '-',
    editedBy: payload.editedBy || 'เจ้าหน้าที่ สสจ.สตูล',
    remarks: payload.remarks || 'อัปเดตผ่านระบบ Dashboard',
    telegramSent: true
  };
  
  appendAuditLog(ss, logEntry);
  
  return {
    clinic: {
      ...payload,
      assessmentStatus: statusText,
      assessmentLevel: newLevel,
      passCriteria: passText
    },
    logEntry: logEntry
  };
}

/**
 * บันทึกประวัติลง Sheet AuditLogs
 */
function appendAuditLog(ss, log) {
  let logSheet = ss.getSheetByName('AuditLogs');
  if (!logSheet) {
    logSheet = ss.insertSheet('AuditLogs');
    logSheet.appendRow([
      'Log ID', 'วันเวลา', 'อำเภอ', 'ชื่อคลินิก', 
      'สถานะเดิม', 'สถานะใหม่', 'ระดับเดิม', 'ระดับใหม่', 
      'ผู้แก้ไข', 'หมายเหตุ'
    ]);
    logSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#f1f5f9');
  }
  
  logSheet.appendRow([
    log.id, log.timestamp, log.district, log.clinicName,
    log.previousStatus, log.newStatus, log.previousLevel, log.newLevel,
    log.editedBy, log.remarks
  ]);
}

/**
 * ดึง AuditLogs ทั้งหมด
 */
function getAuditLogsFromSheet(ss) {
  const logSheet = ss.getSheetByName('AuditLogs');
  if (!logSheet) return [];
  
  const data = logSheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  let logs = [];
  for (let i = data.length - 1; i >= 1; i--) { // ล่าสุดขึ้นก่อน
    const row = data[i];
    logs.push({
      id: row[0],
      timestamp: String(row[1]),
      district: row[2],
      clinicName: row[3],
      previousStatus: row[4],
      newStatus: row[5],
      previousLevel: row[6],
      newLevel: row[7],
      editedBy: row[8],
      remarks: row[9],
      telegramSent: true
    });
  }
  return logs;
}

/**
 * คำนวณสรุปรายอำเภอ
 */
function calculateDistrictSummaries(clinics) {
  return DISTRICTS.map(district => {
    const districtClinics = clinics.filter(c => c.district === district);
    const total = districtClinics.length;
    const assessed = districtClinics.filter(c => c.assessmentStatus === 'ประเมินแล้ว').length;
    const passed = districtClinics.filter(c => c.assessmentLevel !== null && c.assessmentLevel >= 2).length;
    const pending = total - assessed;
    const passPct = total > 0 ? parseFloat(((passed / total) * 100).toFixed(1)) : 0;
    
    return {
      district: district,
      totalClinics: total,
      assessedCount: assessed,
      passedCount: passed,
      pendingCount: pending,
      passPercentage: passPct,
      targetPercentage: 25.0,
      isTargetAchieved: passPct >= 25.0
    };
  });
}

/**
 * ส่งการแจ้งเตือนไปยังกลุ่ม Telegram พร้อม Inline Keyboard Button
 */
function sendTelegramNotification(payload) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  
  const levelText = payload.assessmentLevel !== null ? ('ระดับ ' + payload.assessmentLevel + ' ⭐') : 'ยังไม่ระบุ';
  const passStatus = payload.assessmentLevel !== null && payload.assessmentLevel >= 2 ? '✅ ผ่านเกณฑ์ (≥ระดับ 2)' : '⏳ รอการประเมิน/ปรับปรุง';
  
  const message = 
    '🔔 *[แจ้งเตือนการอัปเดต RDU คลินิกเอกชน สตูล]* \\n\\n' +
    '🏥 *คลินิก:* ' + payload.clinicName + '\\n' +
    '📍 *อำเภอ:* ' + payload.district + '\\n' +
    '📊 *สถานะการประเมิน:* ' + payload.assessmentStatus + '\\n' +
    '⭐ *ระดับที่ได้:* ' + levelText + '\\n' +
    '🎯 *ผลการประเมิน:* ' + passStatus + '\\n' +
    '👤 *ผู้บันทึก:* ' + (payload.editedBy || 'เจ้าหน้าที่ สสจ.สตูล') + '\\n' +
    '📝 *หมายเหตุ:* ' + (payload.remarks || 'ไม่มี') + '\\n\\n' +
    '🗓️ *เวลาบันทึก:* ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss') + ' น.';
  
  const url = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌐 เปิดระบบ Dashboard', url: 'https://rdu-clinics-satun.vercel.app' }
          ]
        ]
      }
    }),
    muteHttpExceptions: true
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (err) {
    Logger.log('Telegram Send Error: ' + err.toString());
  }
}

/**
 * แปลงผลลัพธ์เป็น JSON สำหรับ Web API
 */
function responseJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
