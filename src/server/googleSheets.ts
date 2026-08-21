import { createHash, createSign, randomUUID } from 'node:crypto';

export const DEFAULT_SPREADSHEET_ID = '1yLfjRD0PGXLJpsCyM8F9HsJfgb5gaDLAGhUjiB_eUY4';
export const DEFAULT_SHEET_GID = '1062888583';

const DISTRICTS = ['เมือง', 'ท่าแพ', 'ละงู', 'ควนกาหลง', 'ควนโดน', 'ทุ่งหว้า', 'มะนัง'] as const;
const ASSESSMENT_STATUSES = ['ประเมินแล้ว', 'รอประเมิน', 'ยังไม่ประเมิน'] as const;
const PASS_CRITERIA = ['ผ่าน', 'ไม่ผ่าน', 'รอการประเมิน'] as const;
const BUSINESS_STATUSES = ['เปิดดำเนินการ', 'พักใช้', 'ปิดกิจการ'] as const;
const CLINIC_REGISTRY_SHEET = 'ClinicRegistry';
const ASSESSMENTS_SHEET = 'Assessments';
const ASSESSMENT_PERIODS_SHEET = 'AssessmentPeriods';
const AUDIT_LOG_SHEET = 'AuditLogs';
const WRITE_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

type DistrictName = (typeof DISTRICTS)[number];
type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];
type PassCriteria = (typeof PASS_CRITERIA)[number];
type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export interface GoogleSheetClinic {
  id: string;
  version?: string;
  no: number;
  district: DistrictName;
  name: string;
  type: string;
  licensee: string;
  address?: string;
  phone?: string;
  latitude?: number | null;
  longitude?: number | null;
  businessStatus?: BusinessStatus;
  businessStatusNote?: string;
  updatedAt?: string;
  updatedBy?: string;
  fiscalYear?: number;
  assessmentDate?: string;
  assessmentStatus: AssessmentStatus;
  assessmentLevel: number | null;
  passCriteria: PassCriteria;
  remarks: string;
}

export interface GoogleSheetAuditLog {
  id: string;
  timestamp: string;
  district: string;
  clinicName: string;
  previousStatus: string;
  newStatus: string;
  previousLevel: string;
  newLevel: string;
  editedBy: string;
  remarks: string;
  telegramSent: boolean;
}

export interface GoogleSheetAssessmentPeriod {
  fiscalYear: number;
  label: string;
  startDate: string;
  endDate: string;
  targetPercentage: number | null;
}

export interface GoogleSheetData {
  clinics: GoogleSheetClinic[];
  auditLogs: GoogleSheetAuditLog[];
  assessmentPeriods?: GoogleSheetAssessmentPeriod[];
  source: 'google-sheets-api' | 'public-csv';
}

export type ClinicMutationInput = Partial<Omit<GoogleSheetClinic, 'id' | 'version' | 'updatedAt' | 'updatedBy'>> & {
  clinicId?: string;
  expectedVersion?: string;
};

export class ClinicMutationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ClinicMutationError';
  }
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleApiError {
  error?: { message?: string };
}

interface GoogleValuesResponse extends GoogleApiError {
  values?: unknown[][];
  valueRanges?: Array<{ range?: string; values?: unknown[][] }>;
}

interface SpreadsheetMetadata extends GoogleApiError {
  sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
}

interface SheetParseOptions {
  district?: string;
  idPrefix?: string;
}

interface RegistryRecord {
  clinicId: string;
  district: DistrictName;
  no: number;
  name: string;
  type: string;
  licensee: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  businessStatus: BusinessStatus;
  businessStatusNote: string;
  updatedAt: string;
  updatedBy: string;
  rowNumber: number;
}

interface AssessmentRecord {
  id: string;
  fiscalYear: number;
  clinicId: string;
  assessmentStatus: AssessmentStatus;
  assessmentLevel: number | null;
  passCriteria: PassCriteria;
  assessmentDate: string;
  remarks: string;
  updatedAt: string;
  updatedBy: string;
  rowNumber: number;
}

const DELETED_MARKER = '[SYSTEM_DELETED]';

function isSoftDeleted(record: Pick<RegistryRecord, 'businessStatus' | 'businessStatusNote'>): boolean {
  return record.businessStatus === 'ปิดกิจการ' && record.businessStatusNote.startsWith(DELETED_MARKER);
}

const REGISTRY_HEADERS = [
  'clinicId', 'district', 'no', 'name', 'type', 'licensee', 'address', 'phone',
  'latitude', 'longitude', 'businessStatus', 'businessStatusNote', 'updatedAt', 'updatedBy',
] as const;
const ASSESSMENT_HEADERS = [
  'id', 'fiscalYear', 'clinicId', 'assessmentStatus', 'assessmentLevel', 'passCriteria',
  'assessmentDate', 'remarks', 'updatedAt', 'updatedBy',
] as const;

const HEADER_ALIASES = {
  no: ['ลำดับที่', 'ลำดับ', 'ที่'], district: ['อำเภอ', 'เขตอำเภอ'],
  name: ['ชื่อสถานพยาบาล', 'ชื่อคลินิก', 'สถานพยาบาล', 'คลินิก'],
  type: ['ประเภท', 'ประเภทคลินิก', 'ประเภทสถานพยาบาล'], licensee: ['ผู้รับอนุญาต', 'ชื่อผู้รับอนุญาต'],
  status: ['ประเมิน rdu', 'สถานะการประเมิน', 'สถานะ rdu', 'สถานะ'],
  level: ['ระดับผลการประเมิน', 'ระดับการประเมิน', 'ระดับผลประเมิน', 'ระดับ'],
  pass: ['เกณฑ์ผ่าน', 'ผลการประเมิน', 'ผ่านเกณฑ์'], remarks: ['หมายเหตุ', 'บันทึกเพิ่มเติม'],
} as const;

function normalizeCell(value: unknown): string {
  return String(value ?? '').replace(/\uFEFF/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeHeader(value: unknown): string {
  return normalizeCell(value).toLocaleLowerCase('th-TH').replace(/[()≥>=:_\-./\s]+/g, '');
}

function matchesHeader(value: unknown, aliases: readonly string[]): boolean {
  const normalized = normalizeHeader(value);
  return aliases.some((alias) => normalized === normalizeHeader(alias) || normalized.includes(normalizeHeader(alias)));
}

function findHeaderRow(rows: unknown[][]): number {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 12); rowIndex += 1) {
    const row = rows[rowIndex] || [];
    if (row.length < 2) continue;
    if (row.some((cell) => matchesHeader(cell, HEADER_ALIASES.name)) && row.some((cell) => matchesHeader(cell, HEADER_ALIASES.type) || matchesHeader(cell, HEADER_ALIASES.status) || matchesHeader(cell, HEADER_ALIASES.level))) return rowIndex;
  }
  return -1;
}

function findColumn(header: unknown[], aliases: readonly string[], fallback: number): number {
  const index = header.findIndex((cell) => matchesHeader(cell, aliases));
  return index >= 0 ? index : fallback;
}

function normalizeDistrict(value: unknown, fallback?: string): DistrictName | null {
  const candidate = normalizeCell(value || fallback).replace(/^อำเภอ/, '').replace(/^อ\./, '').trim();
  if (candidate === 'เมืองสตูล') return 'เมือง';
  return DISTRICTS.find((district) => candidate === district) || DISTRICTS.find((district) => candidate.includes(district) || district.includes(candidate)) || null;
}

function normalizeAssessmentLevel(value: unknown): number | null {
  const text = normalizeCell(value);
  if (!text || text === '-' || /ยังไม่|รอ/.test(text)) return null;
  const level = Number(text.match(/[1-3]/)?.[0]);
  return Number.isInteger(level) && level >= 1 && level <= 3 ? level : null;
}

function normalizeAssessmentStatus(value: unknown, level: number | null): AssessmentStatus {
  const text = normalizeCell(value);
  if (level !== null || /ประเมินแล้ว|ดำเนินการแล้ว|แล้วเสร็จ/.test(text)) return 'ประเมินแล้ว';
  if (/ยังไม่ประเมิน/.test(text)) return 'ยังไม่ประเมิน';
  return 'รอประเมิน';
}

function normalizePassCriteria(value: unknown, level: number | null): PassCriteria {
  if (level !== null) return level >= 2 ? 'ผ่าน' : 'ไม่ผ่าน';
  const text = normalizeCell(value);
  if (/ไม่ผ่าน/.test(text)) return 'ไม่ผ่าน';
  if (/ผ่าน/.test(text)) return 'ผ่าน';
  return 'รอการประเมิน';
}

function safePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(normalizeCell(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nullableNumber(value: unknown): number | null {
  const text = normalizeCell(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function headerIndexes(rows: unknown[][]): Map<string, number> {
  return new Map((rows[0] || []).map((cell, index) => [normalizeCell(cell), index]));
}

function rowValue(row: unknown[], indexes: Map<string, number>, name: string): string {
  return normalizeCell(row[indexes.get(name) ?? -1]);
}

export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQuotes = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (inQuotes) {
      if (character === '"' && csv[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') inQuotes = false;
      else field += character;
    } else if (character === '"') inQuotes = true;
    else if (character === ',') { row.push(field); field = ''; }
    else if (character === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += character;
  }
  if (field.length > 0 || row.length > 0) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

export function parseClinicRows(rows: unknown[][], options: SheetParseOptions = {}): GoogleSheetClinic[] {
  const headerRowIndex = findHeaderRow(rows);
  const fallback = headerRowIndex < 0;
  const header = fallback ? [] : rows[headerRowIndex] || [];
  const dataStart = fallback ? Math.min(2, rows.length) : headerRowIndex + 1;
  const columns = {
    no: findColumn(header, HEADER_ALIASES.no, 0), district: findColumn(header, HEADER_ALIASES.district, -1),
    name: findColumn(header, HEADER_ALIASES.name, 1), type: findColumn(header, HEADER_ALIASES.type, 2),
    licensee: findColumn(header, HEADER_ALIASES.licensee, 3), status: findColumn(header, HEADER_ALIASES.status, 4),
    level: findColumn(header, HEADER_ALIASES.level, 5), pass: findColumn(header, HEADER_ALIASES.pass, 6),
    remarks: findColumn(header, HEADER_ALIASES.remarks, 7),
  };
  const clinics: GoogleSheetClinic[] = [];
  for (let rowIndex = dataStart; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const name = normalizeCell(row[columns.name]);
    const firstCell = normalizeCell(row[0]);
    if (!name || name.includes('ภาพรวม') || name.startsWith('รวม') || firstCell.includes('ภาพรวม') || firstCell.startsWith('รวม')) continue;
    const district = normalizeDistrict(columns.district >= 0 ? row[columns.district] : undefined, options.district);
    if (!district) continue;
    const assessmentLevel = normalizeAssessmentLevel(row[columns.level]);
    const no = safePositiveInteger(row[columns.no], clinics.length + 1);
    clinics.push({
      id: `STN-${options.idPrefix || district}-${no}`, no, district, name,
      type: normalizeCell(row[columns.type]) || 'คลินิกเวชกรรม', licensee: normalizeCell(row[columns.licensee]) || '-',
      assessmentStatus: normalizeAssessmentStatus(row[columns.status], assessmentLevel), assessmentLevel,
      passCriteria: normalizePassCriteria(row[columns.pass], assessmentLevel), remarks: normalizeCell(row[columns.remarks]),
    });
  }
  return clinics;
}

export function parseClinicRegistryRows(rows: unknown[][]): RegistryRecord[] {
  if (rows.length < 2) return [];
  const indexes = headerIndexes(rows);
  return rows.slice(1).flatMap((row, index) => {
    const clinicId = rowValue(row, indexes, 'clinicId');
    const district = normalizeDistrict(rowValue(row, indexes, 'district'));
    const name = rowValue(row, indexes, 'name');
    if (!clinicId || !district || !name) return [];
    const rawBusinessStatus = rowValue(row, indexes, 'businessStatus');
    const businessStatus = BUSINESS_STATUSES.includes(rawBusinessStatus as BusinessStatus) ? rawBusinessStatus as BusinessStatus : 'เปิดดำเนินการ';
    return [{
      clinicId, district, no: safePositiveInteger(rowValue(row, indexes, 'no'), index + 1), name,
      type: rowValue(row, indexes, 'type') || 'คลินิกเวชกรรม', licensee: rowValue(row, indexes, 'licensee') || '-',
      address: rowValue(row, indexes, 'address'), phone: rowValue(row, indexes, 'phone'),
      latitude: nullableNumber(rowValue(row, indexes, 'latitude')), longitude: nullableNumber(rowValue(row, indexes, 'longitude')),
      businessStatus, businessStatusNote: rowValue(row, indexes, 'businessStatusNote'),
      updatedAt: rowValue(row, indexes, 'updatedAt'), updatedBy: rowValue(row, indexes, 'updatedBy'), rowNumber: index + 2,
    }];
  });
}

export function parseAssessmentRows(rows: unknown[][]): AssessmentRecord[] {
  if (rows.length < 2) return [];
  const indexes = headerIndexes(rows);
  return rows.slice(1).flatMap((row, index) => {
    const clinicId = rowValue(row, indexes, 'clinicId');
    const fiscalYear = Number.parseInt(rowValue(row, indexes, 'fiscalYear'), 10);
    if (!clinicId || !Number.isInteger(fiscalYear)) return [];
    const level = normalizeAssessmentLevel(rowValue(row, indexes, 'assessmentLevel'));
    return [{
      id: rowValue(row, indexes, 'id') || `assessment-${clinicId}-${fiscalYear}`, fiscalYear, clinicId,
      assessmentStatus: normalizeAssessmentStatus(rowValue(row, indexes, 'assessmentStatus'), level), assessmentLevel: level,
      passCriteria: normalizePassCriteria(rowValue(row, indexes, 'passCriteria'), level),
      assessmentDate: rowValue(row, indexes, 'assessmentDate'), remarks: rowValue(row, indexes, 'remarks'),
      updatedAt: rowValue(row, indexes, 'updatedAt'), updatedBy: rowValue(row, indexes, 'updatedBy'), rowNumber: index + 2,
    }];
  });
}

export function parseAssessmentPeriodRows(rows: unknown[][]): GoogleSheetAssessmentPeriod[] {
  if (rows.length < 2) return [];
  const indexes = headerIndexes(rows);
  return rows.slice(1).flatMap((row) => {
    const fiscalYear = Number.parseInt(rowValue(row, indexes, 'fiscalYear'), 10);
    if (!Number.isInteger(fiscalYear)) return [];
    return [{ fiscalYear, label: rowValue(row, indexes, 'label'), startDate: rowValue(row, indexes, 'startDate'), endDate: rowValue(row, indexes, 'endDate'), targetPercentage: nullableNumber(rowValue(row, indexes, 'targetPercentage')) }];
  });
}

function selectedFiscalYear(assessments: AssessmentRecord[], periods: GoogleSheetAssessmentPeriod[], now = new Date()): number | undefined {
  const date = now.toISOString().slice(0, 10);
  const active = periods.filter((period) => period.startDate && period.endDate && period.startDate <= date && date <= period.endDate).map((period) => period.fiscalYear);
  if (active.length) return Math.max(...active);
  const years = [...assessments.map((item) => item.fiscalYear), ...periods.map((item) => item.fiscalYear)];
  return years.length ? Math.max(...years) : undefined;
}

export function mergeClinicData(registry: RegistryRecord[], assessments: AssessmentRecord[], periods: GoogleSheetAssessmentPeriod[] = []): GoogleSheetClinic[] {
  const preferredYear = selectedFiscalYear(assessments, periods);
  return registry.map((record) => {
    const candidates = assessments.filter((item) => item.clinicId === record.clinicId);
    const assessment = candidates.find((item) => item.fiscalYear === preferredYear) || candidates.sort((a, b) => b.fiscalYear - a.fiscalYear || b.updatedAt.localeCompare(a.updatedAt))[0];
    const timestampVersion = assessment?.updatedAt || record.updatedAt;
    const version = timestampVersion || `legacy_${createHash('sha256').update(JSON.stringify({
      clinicId: record.clinicId,
      district: record.district,
      no: record.no,
      name: record.name,
      type: record.type,
      licensee: record.licensee,
      address: record.address,
      phone: record.phone,
      latitude: record.latitude,
      longitude: record.longitude,
      businessStatus: record.businessStatus,
      businessStatusNote: record.businessStatusNote,
      assessment: assessment ? {
        id: assessment.id,
        fiscalYear: assessment.fiscalYear,
        assessmentStatus: assessment.assessmentStatus,
        assessmentLevel: assessment.assessmentLevel,
        passCriteria: assessment.passCriteria,
        assessmentDate: assessment.assessmentDate,
        remarks: assessment.remarks,
      } : null,
    })).digest('hex').slice(0, 24)}`;
    return {
      id: record.clinicId, version, no: record.no, district: record.district, name: record.name, type: record.type, licensee: record.licensee,
      address: record.address, phone: record.phone, latitude: record.latitude, longitude: record.longitude,
      businessStatus: record.businessStatus, businessStatusNote: record.businessStatusNote,
      updatedAt: assessment?.updatedAt || record.updatedAt, updatedBy: assessment?.updatedBy || record.updatedBy,
      fiscalYear: assessment?.fiscalYear || preferredYear, assessmentDate: assessment?.assessmentDate || '',
      assessmentStatus: assessment?.assessmentStatus || 'ยังไม่ประเมิน', assessmentLevel: assessment?.assessmentLevel ?? null,
      passCriteria: assessment?.passCriteria || 'รอการประเมิน', remarks: assessment?.remarks || '',
    };
  });
}

export function parseAuditLogRows(rows: unknown[][]): GoogleSheetAuditLog[] {
  return rows.slice(1).filter((row) => {
    const id = normalizeCell(row[0]);
    return id && !id.startsWith('lock_') && !id.startsWith('unlock_');
  }).map((row) => ({
    id: normalizeCell(row[0]), timestamp: normalizeCell(row[1]), district: normalizeCell(row[2]), clinicName: normalizeCell(row[3]),
    previousStatus: normalizeCell(row[4]), newStatus: normalizeCell(row[5]), previousLevel: normalizeCell(row[6]),
    newLevel: normalizeCell(row[7]), editedBy: normalizeCell(row[8]), remarks: normalizeCell(row[9]), telegramSent: true,
  })).reverse();
}

function validateSpreadsheetId(spreadsheetId: string): string {
  const value = spreadsheetId.trim();
  if (!/^[a-zA-Z0-9_-]{20,100}$/.test(value)) throw new Error('Spreadsheet ID ไม่ถูกต้อง');
  return value;
}

function configuredSpreadsheetId(): string {
  return validateSpreadsheetId(process.env.CLINIC_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID);
}

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function getServiceAccountAccessToken(scope = 'https://www.googleapis.com/auth/spreadsheets.readonly'): Promise<string> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  if (!clientEmail || !privateKey) throw new Error('ยังไม่ได้ตั้งค่า Google service account');
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({ iss: clientEmail, scope, aud: 'https://oauth2.googleapis.com/token', iat: issuedAt, exp: issuedAt + 3600 }));
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256'); signer.update(unsignedToken); signer.end();
  const signature = signer.sign(privateKey, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsignedToken}.${signature}` }) });
  const json = await response.json() as GoogleTokenResponse;
  if (!response.ok || !json.access_token) throw new Error(json.error_description || json.error || 'Google service account authentication failed');
  return json.access_token;
}

function sheetRange(sheetName: string, range?: string): string {
  const name = `'${sheetName.replace(/'/g, "''")}'`;
  return range ? `${name}!${range}` : name;
}

async function googleRequest<T>(spreadsheetId: string, path: string, init: RequestInit, token: string): Promise<T> {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  const json = await response.json().catch(() => ({})) as T & GoogleApiError;
  if (!response.ok) {
    const message = json.error?.message || `Google Sheets API ตอบกลับ HTTP ${response.status}`;
    throw new Error(response.status === 403 ? `${message} กรุณาแชร์ Google Sheet ให้ service account เป็น Editor` : message);
  }
  return json;
}

async function batchGet(spreadsheetId: string, token: string, sheetNames: string[]): Promise<unknown[][][]> {
  const params = new URLSearchParams({ majorDimension: 'ROWS' });
  sheetNames.forEach((name) => params.append('ranges', sheetRange(name)));
  const result = await googleRequest<GoogleValuesResponse>(spreadsheetId, `/values:batchGet?${params}`, {}, token);
  return sheetNames.map((_, index) => result.valueRanges?.[index]?.values || []);
}

async function loadViaGoogleSheetsApi(spreadsheetId: string): Promise<GoogleSheetData> {
  const token = await getServiceAccountAccessToken();
  try {
    const [registryRows, assessmentRows, periodRows, auditRows] = await batchGet(spreadsheetId, token, [CLINIC_REGISTRY_SHEET, ASSESSMENTS_SHEET, ASSESSMENT_PERIODS_SHEET, AUDIT_LOG_SHEET]);
    const registry = parseClinicRegistryRows(registryRows).filter((record) => !isSoftDeleted(record));
    if (registry.length || registryRows.length) {
      const assessmentPeriods = parseAssessmentPeriodRows(periodRows);
      return { clinics: mergeClinicData(registry, parseAssessmentRows(assessmentRows), assessmentPeriods), auditLogs: parseAuditLogRows(auditRows), assessmentPeriods, source: 'google-sheets-api' };
    }
  } catch (error) {
    console.warn('Confirmed clinic sheets unavailable; trying legacy district tabs', error);
  }
  const rows = await batchGet(spreadsheetId, token, [...DISTRICTS, AUDIT_LOG_SHEET]);
  const clinics = DISTRICTS.flatMap((district, index) => parseClinicRows(rows[index] || [], { district, idPrefix: district }));
  return { clinics: deduplicateClinics(clinics), auditLogs: parseAuditLogRows(rows[DISTRICTS.length] || []), source: 'google-sheets-api' };
}

async function fetchPublicCsv(spreadsheetId: string, selector: { sheet?: string; gid?: string }): Promise<string> {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq`);
  url.searchParams.set('tqx', 'out:csv'); if (selector.sheet) url.searchParams.set('sheet', selector.sheet); if (selector.gid) url.searchParams.set('gid', selector.gid);
  const response = await fetch(url, { headers: { Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.1', 'User-Agent': 'RDU-Clinics-Satun/1.0' }, redirect: 'follow' });
  if (!response.ok) {
    const error = new Error(response.status === 401 || response.status === 403 ? 'Google Sheet ยังจำกัดสิทธิ์การอ่าน กรุณาแชร์ให้ service account หรือเปิดสิทธิ์ผู้ที่มีลิงก์เป็นผู้มีสิทธิ์ดู' : `Google Sheets CSV ตอบกลับ HTTP ${response.status}`);
    Object.assign(error, { status: response.status }); throw error;
  }
  const text = await response.text();
  if (/^\s*</.test(text) || /google\.visualization\.Query\.setResponse/.test(text)) throw new Error('Google Sheets ไม่ได้ส่งข้อมูล CSV กลับมา');
  return text;
}

function deduplicateClinics(clinics: GoogleSheetClinic[]): GoogleSheetClinic[] {
  const seen = new Set<string>();
  return clinics.filter((clinic) => { const key = `${clinic.district}|${clinic.name}`.toLocaleLowerCase('th-TH'); if (seen.has(key)) return false; seen.add(key); return true; });
}

async function loadViaPublicCsv(spreadsheetId: string, gid: string): Promise<GoogleSheetData> {
  const results = await Promise.allSettled(DISTRICTS.map(async (district) => parseClinicRows(parseCsv(await fetchPublicCsv(spreadsheetId, { sheet: district })), { district, idPrefix: district })));
  let clinics = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  if (!clinics.length) clinics = parseClinicRows(parseCsv(await fetchPublicCsv(spreadsheetId, { gid })), { idPrefix: `GID-${gid}` });
  let auditLogs: GoogleSheetAuditLog[] = [];
  try { auditLogs = parseAuditLogRows(parseCsv(await fetchPublicCsv(spreadsheetId, { sheet: AUDIT_LOG_SHEET }))); } catch { /* optional */ }
  clinics = deduplicateClinics(clinics);
  if (!clinics.length) { const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected'); if (rejected) throw rejected.reason; throw new Error('ไม่พบข้อมูลคลินิกใน Google Sheet'); }
  return { clinics, auditLogs, source: 'public-csv' };
}

export async function loadGoogleSheetData(spreadsheetId = DEFAULT_SPREADSHEET_ID, gid = DEFAULT_SHEET_GID): Promise<GoogleSheetData> {
  const validSpreadsheetId = validateSpreadsheetId(spreadsheetId);
  const validGid = /^\d+$/.test(gid) ? gid : DEFAULT_SHEET_GID;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    try { return await loadViaGoogleSheetsApi(validSpreadsheetId); } catch (error) { console.warn('Google Sheets API failed; trying public CSV fallback', error); }
  }
  return loadViaPublicCsv(validSpreadsheetId, validGid);
}

function clean(value: unknown, field: string, max: number, required = false): string {
  const result = normalizeCell(value).slice(0, max);
  if (required && !result) throw new ClinicMutationError('INVALID_CLINIC', `กรุณาระบุ ${field}`, 400);
  return result;
}

function validateClinicId(value: unknown): string {
  const id = clean(value, 'clinicId', 100, true);
  if (!/^[A-Za-z0-9_-]{3,100}$/.test(id)) throw new ClinicMutationError('INVALID_CLINIC_ID', 'clinicId ต้องประกอบด้วยตัวอักษร ตัวเลข _ หรือ -', 400);
  return id;
}

function numberInRange(value: unknown, field: string, min: number, max: number, nullable = false): number | null {
  if ((value === '' || value === null || value === undefined) && nullable) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new ClinicMutationError('INVALID_CLINIC', `${field} ไม่ถูกต้อง`, 400);
  return parsed;
}

function sanitizeClinic(input: ClinicMutationInput, base: GoogleSheetClinic | undefined, actor: string, isCreate: boolean): GoogleSheetClinic {
  const pick = <K extends keyof ClinicMutationInput>(key: K): ClinicMutationInput[K] | undefined => Object.prototype.hasOwnProperty.call(input, key) ? input[key] : undefined;
  const districtRaw = pick('district') ?? base?.district;
  const district = normalizeDistrict(districtRaw);
  if (!district || normalizeCell(districtRaw) !== district) throw new ClinicMutationError('INVALID_CLINIC', 'อำเภอไม่ถูกต้อง', 400);
  const statusRaw = clean(pick('assessmentStatus') ?? base?.assessmentStatus ?? 'ยังไม่ประเมิน', 'สถานะการประเมิน', 30, true);
  if (!ASSESSMENT_STATUSES.includes(statusRaw as AssessmentStatus)) throw new ClinicMutationError('INVALID_CLINIC', 'สถานะการประเมินไม่ถูกต้อง', 400);
  const status = statusRaw as AssessmentStatus;
  let level = (pick('assessmentLevel') !== undefined ? pick('assessmentLevel') : base?.assessmentLevel) ?? null;
  level = level === null ? null : numberInRange(level, 'ระดับการประเมิน', 1, 3);
  if (status !== 'ประเมินแล้ว') level = null;
  const passCriteria = status === 'ประเมินแล้ว'
    ? (level !== null && level >= 2 ? 'ผ่าน' : 'ไม่ผ่าน')
    : 'รอการประเมิน';
  const requestedPass = pick('passCriteria');
  if (requestedPass !== undefined && clean(requestedPass, 'เกณฑ์ผ่าน', 30, true) !== passCriteria) {
    throw new ClinicMutationError('INVALID_CLINIC', 'เกณฑ์ผ่านไม่สอดคล้องกับสถานะหรือระดับการประเมิน', 400);
  }
  const businessRaw = clean(pick('businessStatus') ?? base?.businessStatus ?? 'เปิดดำเนินการ', 'สถานะกิจการ', 30, true);
  if (!BUSINESS_STATUSES.includes(businessRaw as BusinessStatus)) throw new ClinicMutationError('INVALID_CLINIC', 'สถานะกิจการไม่ถูกต้อง', 400);
  const fiscalYear = Math.trunc(numberInRange(pick('fiscalYear') ?? base?.fiscalYear ?? 2569, 'ปีงบประมาณ', 2400, 3000) as number);
  const no = Math.trunc(numberInRange(pick('no') ?? base?.no ?? 1, 'ลำดับ', 1, 100000) as number);
  const updatedAt = new Date().toISOString();
  return {
    id: isCreate ? validateClinicId(input.clinicId || `STN-${randomUUID()}`) : validateClinicId(base?.id), version: updatedAt, no, district,
    name: clean(pick('name') ?? base?.name, 'ชื่อคลินิก', 300, true), type: clean(pick('type') ?? base?.type, 'ประเภทคลินิก', 200, true),
    licensee: clean(pick('licensee') ?? base?.licensee, 'ผู้รับอนุญาต', 300, true), address: clean(pick('address') ?? base?.address, 'ที่อยู่', 1000),
    phone: clean(pick('phone') ?? base?.phone, 'โทรศัพท์', 100),
    latitude: numberInRange(pick('latitude') !== undefined ? pick('latitude') : base?.latitude, 'ละติจูด', -90, 90, true),
    longitude: numberInRange(pick('longitude') !== undefined ? pick('longitude') : base?.longitude, 'ลองจิจูด', -180, 180, true),
    businessStatus: businessRaw as BusinessStatus, businessStatusNote: clean(pick('businessStatusNote') ?? base?.businessStatusNote, 'หมายเหตุสถานะกิจการ', 1000),
    fiscalYear, assessmentDate: clean(pick('assessmentDate') ?? base?.assessmentDate, 'วันที่ประเมิน', 40),
    assessmentStatus: status, assessmentLevel: level, passCriteria,
    remarks: clean(pick('remarks') ?? base?.remarks, 'หมายเหตุ', 2000), updatedAt, updatedBy: clean(actor, 'ผู้แก้ไข', 320, true),
  };
}

function registryRow(clinic: GoogleSheetClinic): Array<string | number> {
  return [clinic.id, clinic.district, clinic.no, clinic.name, clinic.type, clinic.licensee, clinic.address || '', clinic.phone || '', clinic.latitude ?? '', clinic.longitude ?? '', clinic.businessStatus || 'เปิดดำเนินการ', clinic.businessStatusNote || '', clinic.updatedAt || '', clinic.updatedBy || ''];
}

function assessmentRow(clinic: GoogleSheetClinic, id?: string): Array<string | number> {
  return [id || `asm_${randomUUID()}`, clinic.fiscalYear || 2569, clinic.id, clinic.assessmentStatus, clinic.assessmentLevel ?? '', clinic.passCriteria, clinic.assessmentDate || '', clinic.remarks, clinic.updatedAt || '', clinic.updatedBy || ''];
}

async function appendValues(spreadsheetId: string, token: string, sheet: string, columns: string, values: unknown[][]): Promise<void> {
  await googleRequest(spreadsheetId, `/values/${encodeURIComponent(sheetRange(sheet, columns))}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: 'POST', body: JSON.stringify({ majorDimension: 'ROWS', values }) }, token);
}

function auditRow(before: GoogleSheetClinic | undefined, after: GoogleSheetClinic | undefined, actor: string, action: string): Array<string | number> {
  const clinic = after || before;
  if (!clinic) throw new Error('ไม่พบข้อมูลสำหรับ Audit Log');
  return [`audit_${randomUUID()}`, new Date().toISOString(), clinic.district, clinic.name, before?.assessmentStatus || '', after?.assessmentStatus || action, before?.assessmentLevel ?? '', after?.assessmentLevel ?? '', actor, action];
}

type ExtendedValue = { stringValue: string } | { numberValue: number } | { boolValue: boolean };

function rowData(values: Array<string | number | boolean>): { values: Array<{ userEnteredValue: ExtendedValue }> } {
  return {
    values: values.map((value) => ({
      userEnteredValue: typeof value === 'number'
        ? { numberValue: value }
        : typeof value === 'boolean'
          ? { boolValue: value }
          : { stringValue: String(value) },
    })),
  };
}

function appendCells(sheetId: number, values: Array<string | number | boolean>) {
  return { appendCells: { sheetId, rows: [rowData(values)], fields: 'userEnteredValue' } };
}

function updateCells(sheetId: number, rowNumber: number, values: Array<string | number | boolean>) {
  return {
    updateCells: {
      range: { sheetId, startRowIndex: rowNumber - 1, endRowIndex: rowNumber, startColumnIndex: 0, endColumnIndex: values.length },
      rows: [rowData(values)],
      fields: 'userEnteredValue',
    },
  };
}

async function atomicBatchUpdate(spreadsheetId: string, token: string, requests: unknown[]): Promise<void> {
  await googleRequest(spreadsheetId, ':batchUpdate', { method: 'POST', body: JSON.stringify({ requests }) }, token);
}

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

type MutationLockGuard = () => Promise<void>;

async function withMutationLock<T>(lockKey: string, task: (spreadsheetId: string, token: string, assertOwnership: MutationLockGuard) => Promise<T>): Promise<T> {
  const spreadsheetId = configuredSpreadsheetId();
  const token = await getServiceAccountAccessToken(WRITE_SCOPE);
  const lockToken = randomUUID();
  const lockId = `lock_${lockToken}`;
  const acquiredAt = new Date().toISOString();
  await appendValues(spreadsheetId, token, AUDIT_LOG_SHEET, 'A:J', [[lockId, acquiredAt, '', '', 'LOCK', lockKey, '', '', 'system', lockToken]]);

  try {
    const ownsLock = async () => {
      const [rows] = await batchGet(spreadsheetId, token, [AUDIT_LOG_SHEET]);
      const released = new Set(rows.slice(1).filter((row) => normalizeCell(row[0]).startsWith('unlock_')).map((row) => normalizeCell(row[9])));
      const activeLocks = rows.slice(1).filter((row) => {
        const id = normalizeCell(row[0]);
        const timestamp = Date.parse(normalizeCell(row[1]));
        return id.startsWith('lock_') && normalizeCell(row[5]) === lockKey && !released.has(normalizeCell(row[9])) && Number.isFinite(timestamp) && timestamp >= Date.now() - 120_000;
      });
      return normalizeCell(activeLocks[0]?.[0]) === lockId;
    };
    const assertOwnership: MutationLockGuard = async () => {
      if (!await ownsLock()) throw new ClinicMutationError('CLINIC_LOCK_LOST', 'สิทธิ์แก้ไขรายการนี้หมดอายุ กรุณารีเฟรชและลองใหม่อีกครั้ง', 409);
    };
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (await ownsLock()) return await task(spreadsheetId, token, assertOwnership);
      await sleep(200);
    }
    throw new ClinicMutationError('CLINIC_BUSY', 'มีเจ้าหน้าที่กำลังแก้ไขข้อมูลรายการนี้ กรุณาลองใหม่อีกครั้ง', 409);
  } finally {
    await appendValues(spreadsheetId, token, AUDIT_LOG_SHEET, 'A:J', [[`unlock_${lockToken}`, new Date().toISOString(), '', '', 'UNLOCK', lockKey, '', '', 'system', lockToken]]).catch((error) => {
      console.error('Unable to release Google Sheets mutation lock', error);
    });
  }
}

interface MutationContext {
  spreadsheetId: string;
  token: string;
  registryRows: unknown[][];
  assessmentRows: unknown[][];
  registrySheetId: number;
  assessmentSheetId: number;
  auditSheetId: number;
}

async function mutationContext(spreadsheetId: string, token: string): Promise<MutationContext> {
  const [registryRows, assessmentRows] = await batchGet(spreadsheetId, token, [CLINIC_REGISTRY_SHEET, ASSESSMENTS_SHEET]);
  const hasHeaders = (rows: unknown[][], expected: readonly string[]) =>
    expected.every((header, index) => normalizeCell(rows[0]?.[index]) === header);
  if (!hasHeaders(registryRows, REGISTRY_HEADERS)) throw new Error(`ชีต ${CLINIC_REGISTRY_SHEET} ไม่ตรงกับ schema ที่กำหนด`);
  if (!hasHeaders(assessmentRows, ASSESSMENT_HEADERS)) throw new Error(`ชีต ${ASSESSMENTS_SHEET} ไม่ตรงกับ schema ที่กำหนด`);
  const metadata = await googleRequest<SpreadsheetMetadata>(spreadsheetId, '?fields=sheets.properties(sheetId,title)', {}, token);
  const ids = new Map(metadata.sheets?.flatMap((sheet) => sheet.properties?.title && sheet.properties.sheetId !== undefined ? [[sheet.properties.title, sheet.properties.sheetId] as const] : []) || []);
  const registrySheetId = ids.get(CLINIC_REGISTRY_SHEET);
  const assessmentSheetId = ids.get(ASSESSMENTS_SHEET);
  const auditSheetId = ids.get(AUDIT_LOG_SHEET);
  if (registrySheetId === undefined || assessmentSheetId === undefined || auditSheetId === undefined) throw new Error('ไม่พบชีตที่จำเป็นสำหรับจัดการข้อมูลคลินิก');
  return { spreadsheetId, token, registryRows, assessmentRows, registrySheetId, assessmentSheetId, auditSheetId };
}

function findUniqueRegistry(records: RegistryRecord[], clinicId: string): RegistryRecord {
  const matches = records.filter((record) => record.clinicId === clinicId && !isSoftDeleted(record));
  if (!matches.length) throw new ClinicMutationError('CLINIC_NOT_FOUND', 'ไม่พบคลินิกที่ระบุ', 404);
  if (matches.length > 1) throw new ClinicMutationError('DUPLICATE_CLINIC_ID', 'พบ clinicId ซ้ำใน ClinicRegistry กรุณาแก้ไขข้อมูลก่อน', 409);
  return matches[0];
}

function normalizedExisting(record: RegistryRecord, assessments: AssessmentRecord[]): GoogleSheetClinic {
  return mergeClinicData([record], assessments)[0];
}

function assertExpectedVersion(input: ClinicMutationInput, currentVersion: string | undefined): void {
  const expected = normalizeCell(input.expectedVersion);
  if (!expected || expected !== currentVersion) {
    throw new ClinicMutationError('CLINIC_VERSION_CONFLICT', 'ข้อมูลคลินิกถูกแก้ไขโดยผู้ใช้อื่นแล้ว กรุณารีเฟรชก่อนบันทึกอีกครั้ง', 409);
  }
}

export async function createClinic(input: ClinicMutationInput, actor: string): Promise<GoogleSheetClinic> {
  return withMutationLock('clinic:create', async (spreadsheetId, token, assertOwnership) => {
    const context = await mutationContext(spreadsheetId, token);
    const records = parseClinicRegistryRows(context.registryRows);
    const candidate = sanitizeClinic({ ...input, no: input.no ?? Math.max(0, ...records.filter((record) => normalizeDistrict(input.district) === record.district).map((record) => record.no)) + 1 }, undefined, actor, true);
    if (records.some((record) => record.clinicId === candidate.id)) throw new ClinicMutationError('CLINIC_ID_EXISTS', 'clinicId นี้เคยถูกใช้งานแล้วและไม่สามารถนำกลับมาใช้ซ้ำได้', 409);
    await assertOwnership();
    await atomicBatchUpdate(spreadsheetId, token, [
      appendCells(context.registrySheetId, registryRow(candidate)),
      appendCells(context.assessmentSheetId, assessmentRow(candidate)),
      appendCells(context.auditSheetId, auditRow(undefined, candidate, actor, 'CREATE')),
    ]);
    return candidate;
  });
}

export async function updateClinic(clinicId: string, input: ClinicMutationInput, actor: string): Promise<GoogleSheetClinic> {
  const id = validateClinicId(clinicId);
  if (input.clinicId !== undefined && validateClinicId(input.clinicId) !== id) throw new ClinicMutationError('IMMUTABLE_CLINIC_ID', 'ไม่สามารถเปลี่ยน clinicId ได้', 400);
  return withMutationLock(`clinic:${id}`, async (spreadsheetId, token, assertOwnership) => {
    const context = await mutationContext(spreadsheetId, token);
    const assessments = parseAssessmentRows(context.assessmentRows);
    const record = findUniqueRegistry(parseClinicRegistryRows(context.registryRows), id);
    const before = normalizedExisting(record, assessments);
    assertExpectedVersion(input, before.version);
    if (input.fiscalYear !== undefined && Number(input.fiscalYear) !== before.fiscalYear) {
      throw new ClinicMutationError('IMMUTABLE_FISCAL_YEAR', 'ไม่สามารถเปลี่ยนปีงบประมาณของผลประเมินเดิมได้', 400);
    }
    const after = sanitizeClinic({ ...input, fiscalYear: before.fiscalYear }, before, actor, false);
    const sameYear = assessments.filter((item) => item.clinicId === id && item.fiscalYear === after.fiscalYear);
    if (sameYear.length > 1) throw new ClinicMutationError('DUPLICATE_ASSESSMENT', 'พบข้อมูลประเมินซ้ำสำหรับคลินิกและปีงบประมาณนี้', 409);
    const assessment = sameYear[0];
    const requests: unknown[] = [updateCells(context.registrySheetId, record.rowNumber, registryRow(after))];
    requests.push(assessment
      ? updateCells(context.assessmentSheetId, assessment.rowNumber, assessmentRow(after, assessment.id))
      : appendCells(context.assessmentSheetId, assessmentRow(after)));
    requests.push(appendCells(context.auditSheetId, auditRow(before, after, actor, 'UPDATE')));
    await assertOwnership();
    await atomicBatchUpdate(spreadsheetId, token, requests);
    return after;
  });
}

export async function deleteClinic(clinicId: string, actor: string, input: ClinicMutationInput = {}): Promise<GoogleSheetClinic> {
  const id = validateClinicId(clinicId);
  return withMutationLock(`clinic:${id}`, async (spreadsheetId, token, assertOwnership) => {
    const context = await mutationContext(spreadsheetId, token);
    const assessments = parseAssessmentRows(context.assessmentRows);
    const record = findUniqueRegistry(parseClinicRegistryRows(context.registryRows), id);
    const before = normalizedExisting(record, assessments);
    assertExpectedVersion(input, before.version);
    const deleted: GoogleSheetClinic = {
      ...before,
      businessStatus: 'ปิดกิจการ',
      businessStatusNote: `${DELETED_MARKER} ${before.businessStatusNote || ''}`.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: clean(actor, 'ผู้แก้ไข', 320, true),
    };
    await assertOwnership();
    await atomicBatchUpdate(spreadsheetId, token, [
      updateCells(context.registrySheetId, record.rowNumber, registryRow(deleted)),
      appendCells(context.auditSheetId, auditRow(before, undefined, actor, 'DELETE')),
    ]);
    return before;
  });
}
