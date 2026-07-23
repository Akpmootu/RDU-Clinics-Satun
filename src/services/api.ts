import { Clinic, AuditLog, DistrictSummary, ProvincialSummary, SettingsConfig } from '../types';
import { INITIAL_CLINICS, INITIAL_AUDIT_LOGS, SATUN_DISTRICTS } from '../data/initialData';

const SETTINGS_STORAGE_KEY = 'rdu_satun_settings_v1';
const CLINICS_STORAGE_KEY = 'rdu_satun_clinics_v1';
const LOGS_STORAGE_KEY = 'rdu_satun_logs_v1';

export const DEFAULT_SETTINGS: SettingsConfig = {
  gasWebAppUrl: '',
  spreadsheetId: '1AbC_Satun_RDU_Private_Clinics_Sheet_2569',
  telegramBotToken: '',
  telegramChatId: '',
  autoSyncInterval: 0,
  isLiveApiActive: false,
};

// --- Storage Utilities ---
export function loadSettings(): SettingsConfig {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: SettingsConfig): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function loadLocalClinics(): Clinic[] {
  try {
    const saved = localStorage.getItem(CLINICS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_CLINICS;
  } catch {
    return INITIAL_CLINICS;
  }
}

export function saveLocalClinics(clinics: Clinic[]): void {
  localStorage.setItem(CLINICS_STORAGE_KEY, JSON.stringify(clinics));
}

export function loadLocalLogs(): AuditLog[] {
  try {
    const saved = localStorage.getItem(LOGS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export function saveLocalLogs(logs: AuditLog[]): void {
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
}

// --- Calculation Logic ---
export function calculateSummaries(clinics: Clinic[]): ProvincialSummary {
  const districtSummaries: DistrictSummary[] = SATUN_DISTRICTS.map((district) => {
    const districtClinics = clinics.filter((c) => c.district === district);
    const total = districtClinics.length;
    const assessed = districtClinics.filter((c) => c.assessmentStatus === 'ประเมินแล้ว').length;
    const passed = districtClinics.filter(
      (c) => c.assessmentLevel !== null && c.assessmentLevel >= 2
    ).length;
    const pending = total - assessed;
    const passPct = total > 0 ? parseFloat(((passed / total) * 100).toFixed(1)) : 0;

    return {
      district,
      totalClinics: total,
      assessedCount: assessed,
      passedCount: passed,
      pendingCount: pending,
      passPercentage: passPct,
      targetPercentage: 25.0,
      isTargetAchieved: passPct >= 25.0,
    };
  });

  const totalTargetClinics = clinics.length;
  const assessedClinics = clinics.filter((c) => c.assessmentStatus === 'ประเมินแล้ว').length;
  const passedClinics = clinics.filter(
    (c) => c.assessmentLevel !== null && c.assessmentLevel >= 2
  ).length;
  const pendingClinics = totalTargetClinics - assessedClinics;
  const overallPassPercentage =
    totalTargetClinics > 0
      ? parseFloat(((passedClinics / totalTargetClinics) * 100).toFixed(1))
      : 0;

  return {
    totalTargetClinics,
    assessedClinics,
    passedClinics,
    pendingClinics,
    overallPassPercentage,
    overallTargetPercentage: 25.0,
    isProvinceTargetAchieved: overallPassPercentage >= 25.0,
    districtSummaries,
  };
}

// --- Live Google Apps Script API Calls ---
export async function fetchFromGas(webAppUrl: string) {
  if (!webAppUrl) throw new Error('กรุณาระบุ URL ของ Google Apps Script Web App');
  
  const response = await fetch(webAppUrl + '?action=getAllData', {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(`การเชื่อมต่อล้มเหลว (HTTP ${response.status})`);
  }
  
  const json = await response.json();
  if (json.status !== 'success') {
    throw new Error(json.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets');
  }
  
  return json.data;
}

export async function updateClinicStatusApi(
  clinic: Clinic,
  newStatus: 'ประเมินแล้ว' | 'รอประเมิน' | 'ยังไม่ประเมิน',
  newLevel: number | null,
  editedBy: string,
  remarks: string,
  settings: SettingsConfig
): Promise<{ updatedClinic: Clinic; newLog: AuditLog; telegramSent: boolean }> {
  const nowStr = new Date().toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const passCriteria = newLevel !== null ? (newLevel >= 2 ? 'ผ่าน' : 'ไม่ผ่าน') : 'รอการประเมิน';

  const updatedClinic: Clinic = {
    ...clinic,
    assessmentStatus: newStatus,
    assessmentLevel: newLevel,
    passCriteria: passCriteria as 'ผ่าน' | 'ไม่ผ่าน' | 'รอการประเมิน',
    updatedAt: nowStr,
    updatedBy: editedBy || 'เจ้าหน้าที่ สสจ.สตูล',
    remarks: remarks || 'อัปเดตผ่านระบบ Dashboard',
  };

  const newLog: AuditLog = {
    id: `LOG-${Date.now().toString().slice(-6)}`,
    timestamp: nowStr,
    district: clinic.district,
    clinicId: clinic.id,
    clinicName: clinic.name,
    previousStatus: `${clinic.assessmentStatus}${clinic.assessmentLevel ? ` (ระดับ ${clinic.assessmentLevel})` : ''}`,
    newStatus: `${newStatus}${newLevel ? ` (ระดับ ${newLevel})` : ''}`,
    previousLevel: clinic.assessmentLevel ? `ระดับ ${clinic.assessmentLevel}` : '-',
    newLevel: newLevel ? `ระดับ ${newLevel}` : '-',
    editedBy: editedBy || 'เจ้าหน้าที่ สสจ.สตูล',
    remarks: remarks || 'อัปเดตข้อมูลการประเมิน RDU',
    telegramSent: false,
  };

  let telegramSent = false;

  // 1. Send via GAS if Live API is active
  if (settings.isLiveApiActive && settings.gasWebAppUrl) {
    try {
      const response = await fetch(settings.gasWebAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateClinicStatus',
          data: {
            district: clinic.district,
            clinicId: clinic.id,
            clinicName: clinic.name,
            assessmentStatus: newStatus,
            assessmentLevel: newLevel,
            editedBy: editedBy,
            remarks: remarks,
          },
        }),
      });

      if (response.ok) {
        const resJson = await response.json().catch(() => null);
        if (resJson && resJson.status === 'success') {
          telegramSent = true;
        }
      } else {
        console.warn(`GAS HTTP response status: ${response.status}`);
      }
    } catch (err) {
      console.warn('Live GAS update failed, saving locally:', err);
    }
  }

  // 2. Direct Telegram notification if token & chat_id provided
  if (!telegramSent && settings.telegramBotToken && settings.telegramChatId) {
    try {
      await sendDirectTelegramMessage(
        settings.telegramBotToken,
        settings.telegramChatId,
        updatedClinic,
        newLog
      );
      telegramSent = true;
    } catch (err) {
      console.warn('Telegram direct notification failed:', err);
    }
  }

  newLog.telegramSent = telegramSent;

  // 3. Save to Local Storage as fallback / instant cache
  const currentClinics = loadLocalClinics();
  const nextClinics = currentClinics.map((c) => (c.id === clinic.id ? updatedClinic : c));
  saveLocalClinics(nextClinics);

  const currentLogs = loadLocalLogs();
  const nextLogs = [newLog, ...currentLogs];
  saveLocalLogs(nextLogs);

  return { updatedClinic, newLog, telegramSent };
}

export async function sendDirectTelegramMessage(
  token: string,
  chatId: string,
  clinic: Clinic,
  log: AuditLog
) {
  const levelText = clinic.assessmentLevel !== null ? `ระดับ ${clinic.assessmentLevel} ⭐` : 'ยังไม่ระบุ';
  const passText = clinic.assessmentLevel !== null && clinic.assessmentLevel >= 2 ? '✅ ผ่านเกณฑ์ (≥ระดับ 2)' : '⏳ รอการประเมิน/ปรับปรุง';

  const text =
    `🔔 *[แจ้งเตือนการอัปเดต RDU คลินิกเอกชน สตูล]*\n\n` +
    `🏥 *คลินิก:* ${clinic.name}\n` +
    `📍 *อำเภอ:* ${clinic.district}\n` +
    `📊 *สถานะการประเมิน:* ${clinic.assessmentStatus}\n` +
    `⭐ *ระดับที่ได้:* ${levelText}\n` +
    `🎯 *ผลการประเมิน:* ${passText}\n` +
    `👤 *ผู้บันทึก:* ${log.editedBy}\n` +
    `📝 *หมายเหตุ:* ${log.remarks}\n\n` +
    `🗓️ *เวลาบันทึก:* ${log.timestamp} น.`;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌐 เปิดระบบ Dashboard', url: window.location.href }
          ]
        ]
      }
    })
  });

  if (!response.ok) {
    throw new Error('Telegram Bot API Response Error');
  }
}
