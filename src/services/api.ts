import { Clinic, AuditLog, DistrictSummary, ProvincialSummary, SettingsConfig } from '../types';
import { INITIAL_CLINICS, INITIAL_AUDIT_LOGS, SATUN_DISTRICTS } from '../data/initialData';

const SETTINGS_STORAGE_KEY = 'rdu_satun_settings_v1';
const CLINICS_STORAGE_KEY = 'rdu_satun_clinics_v1';
const LOGS_STORAGE_KEY = 'rdu_satun_logs_v1';

export const PRESET_GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwXONrK9d6i12UOjUrYiN9t-Nv3ompuh1iFFlm4E4qXqRiRKbVGcgsqJyxncq7g-vxcw/exec';
export const PRESET_SPREADSHEET_ID = '1yLfjRD0PGXLJpsCyM8F9HsJfgb5gaDLAGhUjiB_eUY4';
export const PRESET_SHEET_GID = '1062888583';
const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};

export const DEFAULT_SETTINGS: SettingsConfig = {
  gasWebAppUrl: env.VITE_GAS_WEB_APP_URL || PRESET_GAS_WEB_APP_URL,
  spreadsheetId: env.VITE_SPREADSHEET_ID || PRESET_SPREADSHEET_ID,
  telegramBotToken: '',
  telegramChatId: '',
  autoSyncInterval: 0,
  isLiveApiActive: true,
};

// --- Storage Utilities ---
export function loadSettings(): SettingsConfig {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(saved);
    const savedUrl = parsed.gasWebAppUrl?.trim();
    const isUrlPlaceholder = !savedUrl || savedUrl.includes('AKfycbxSatunRDUClinics2569WebAppService');

    const savedSpreadsheetId = parsed.spreadsheetId?.trim();
    const spreadsheetIdIsPlaceholder =
      !savedSpreadsheetId ||
      savedSpreadsheetId === '1AbC_Satun_RDU_Private_Clinics_Sheet_2569';

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      gasWebAppUrl: !isUrlPlaceholder ? savedUrl : DEFAULT_SETTINGS.gasWebAppUrl,
      spreadsheetId: spreadsheetIdIsPlaceholder
        ? DEFAULT_SETTINGS.spreadsheetId
        : savedSpreadsheetId,
      telegramBotToken: '',
      telegramChatId: '',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: SettingsConfig): void {
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      ...settings,
      telegramBotToken: '',
      telegramChatId: '',
    })
  );
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

export async function fetchFromGoogleSheet(spreadsheetId: string) {
  const cleanSpreadsheetId = spreadsheetId.trim();
  if (!cleanSpreadsheetId) {
    throw new Error('ยังไม่ได้ระบุ Google Spreadsheet ID');
  }

  const query = new URLSearchParams({
    spreadsheetId: cleanSpreadsheetId,
    gid: PRESET_SHEET_GID,
  });
  const response = await fetch(`/api/google-sheet?${query.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const json = await response.json().catch(() => null);

  if (!response.ok || json?.status !== 'success') {
    throw new Error(
      json?.message || `การเชื่อมต่อ Google Sheet ล้มเหลว (HTTP ${response.status})`
    );
  }

  return json.data;
}

// --- Live Google Apps Script API Calls ---
export async function fetchFromGas(webAppUrl: string) {
  if (!webAppUrl || !webAppUrl.trim()) {
    throw new Error('ยังไม่ได้ระบุ URL ของ Google Apps Script Web App');
  }

  const cleanUrl = webAppUrl.trim();

  // If the URL is still using the default placeholder or invalid structure, don't trigger fetch to avoid CORS errors
  if (
    cleanUrl.includes('AKfycbxSatunRDUClinics2569WebAppService') ||
    !cleanUrl.startsWith('https://script.google.com/macros/s/')
  ) {
    throw new Error('ยังไม่ได้ระบุ Web App URL จริง กรุณานำ URL ที่ได้จากการ Deploy ใน Google Apps Script มาใส่ในหน้าตั้งค่า');
  }

  try {
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const response = await fetch(`${cleanUrl}${separator}action=getAllData`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`การเชื่อมต่อล้มเหลว (HTTP ${response.status})`);
    }

    const json = await response.json();
    if (json.status !== 'success') {
      throw new Error(json.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets');
    }

    return json.data;
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch')) {
      throw new Error('ไม่สามารถเชื่อมต่อกับ Google Apps Script Web App ได้ (กรุณาตรวจสอบ URL หรือตั้งค่า Web App ให้สิทธิ์เป็น "Anyone / ทุกคน")');
    }
    throw err;
  }
}

async function clinicMutationRequest(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<Clinic | null> {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const json = await response.json().catch(() => null);

  if (!response.ok || json?.status !== 'success') {
    throw new Error(json?.message || `จัดการข้อมูลคลินิกไม่สำเร็จ (HTTP ${response.status})`);
  }
  return json.clinic || null;
}

export async function createClinicApi(
  clinic: Omit<Clinic, 'id' | 'no' | 'passCriteria'> & { id?: string; no?: number },
): Promise<Clinic> {
  const created = await clinicMutationRequest('/api/clinics', 'POST', { clinic });
  if (!created) throw new Error('ระบบไม่ส่งข้อมูลคลินิกที่สร้างกลับมา');
  return created;
}

export async function updateClinicApi(clinic: Clinic, expectedVersion = clinic.version): Promise<Clinic> {
  const updated = await clinicMutationRequest(
    `/api/clinics/${encodeURIComponent(clinic.id)}`,
    'PATCH',
    { clinic: { ...clinic, expectedVersion } },
  );
  if (!updated) throw new Error('ระบบไม่ส่งข้อมูลคลินิกที่แก้ไขกลับมา');
  return updated;
}

export async function deleteClinicApi(clinicId: string, expectedVersion?: string): Promise<void> {
  await clinicMutationRequest(`/api/clinics/${encodeURIComponent(clinicId)}`, 'DELETE', { expectedVersion });
}

export async function updateClinicStatusApi(
  clinic: Clinic,
  newStatus: 'ประเมินแล้ว' | 'รอประเมิน' | 'ยังไม่ประเมิน',
  newLevel: number | null,
  editedBy: string,
  remarks: string,
  _settings: SettingsConfig
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

  // 1. Persist through the authenticated backend using the stable clinicId.
  // This avoids fuzzy clinic-name matching and keeps Google credentials off the client.
  const persistedClinic = await updateClinicApi(updatedClinic, clinic.version);
  Object.assign(updatedClinic, persistedClinic);

  // 2. Send Telegram from our server so the bot token is never exposed to the browser.
  try {
    await sendClinicUpdateTelegramNotification(updatedClinic, newLog);
    telegramSent = true;
  } catch (err) {
    console.warn('Telegram server notification failed:', err);
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

export async function sendClinicUpdateTelegramNotification(
  clinic: Clinic,
  log: AuditLog
) {
  const response = await fetch('/api/telegram/clinic-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clinic,
      log,
    }),
    credentials: 'same-origin',
  });
  const json = await response.json().catch(() => null);

  if (!response.ok || json?.status !== 'success' || json?.telegramSent !== true) {
    throw new Error(json?.message || `Telegram notification failed (HTTP ${response.status})`);
  }
}
