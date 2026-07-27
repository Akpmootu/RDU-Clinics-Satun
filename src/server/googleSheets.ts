import { createSign } from 'node:crypto';

export const DEFAULT_SPREADSHEET_ID = '1yLfjRD0PGXLJpsCyM8F9HsJfgb5gaDLAGhUjiB_eUY4';
export const DEFAULT_SHEET_GID = '1062888583';

const DISTRICTS = ['เมือง', 'ท่าแพ', 'ละงู', 'ควนกาหลง', 'ควนโดน', 'ทุ่งหว้า', 'มะนัง'] as const;
const AUDIT_LOG_SHEET = 'AuditLogs';

type DistrictName = (typeof DISTRICTS)[number];

export interface GoogleSheetClinic {
  id: string;
  no: number;
  district: DistrictName;
  name: string;
  type: string;
  licensee: string;
  assessmentStatus: 'ประเมินแล้ว' | 'รอประเมิน' | 'ยังไม่ประเมิน';
  assessmentLevel: number | null;
  passCriteria: 'ผ่าน' | 'ไม่ผ่าน' | 'รอการประเมิน';
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

export interface GoogleSheetData {
  clinics: GoogleSheetClinic[];
  auditLogs: GoogleSheetAuditLog[];
  source: 'google-sheets-api' | 'public-csv';
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleValuesResponse {
  valueRanges?: Array<{
    range?: string;
    values?: unknown[][];
  }>;
  error?: {
    message?: string;
  };
}

interface SheetParseOptions {
  district?: string;
  idPrefix?: string;
}

const HEADER_ALIASES = {
  no: ['ลำดับที่', 'ลำดับ', 'ที่'],
  district: ['อำเภอ', 'เขตอำเภอ'],
  name: ['ชื่อสถานพยาบาล', 'ชื่อคลินิก', 'สถานพยาบาล', 'คลินิก'],
  type: ['ประเภท', 'ประเภทคลินิก', 'ประเภทสถานพยาบาล'],
  licensee: ['ผู้รับอนุญาต', 'ชื่อผู้รับอนุญาต'],
  status: ['ประเมิน rdu', 'สถานะการประเมิน', 'สถานะ rdu', 'สถานะ'],
  level: ['ระดับผลการประเมิน', 'ระดับการประเมิน', 'ระดับผลประเมิน', 'ระดับ'],
  pass: ['เกณฑ์ผ่าน', 'ผลการประเมิน', 'ผ่านเกณฑ์'],
  remarks: ['หมายเหตุ', 'บันทึกเพิ่มเติม'],
} as const;

function normalizeCell(value: unknown): string {
  return String(value ?? '').replace(/\uFEFF/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeHeader(value: unknown): string {
  return normalizeCell(value)
    .toLocaleLowerCase('th-TH')
    .replace(/[()≥>=:_\-./\s]+/g, '');
}

function matchesHeader(value: unknown, aliases: readonly string[]): boolean {
  const normalized = normalizeHeader(value);
  return aliases.some((alias) => {
    const normalizedAlias = normalizeHeader(alias);
    return normalized === normalizedAlias || normalized.includes(normalizedAlias);
  });
}

function findHeaderRow(rows: unknown[][]): number {
  const searchLimit = Math.min(rows.length, 12);

  for (let rowIndex = 0; rowIndex < searchLimit; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    if (row.length < 2) continue;

    const hasName = row.some((cell) => matchesHeader(cell, HEADER_ALIASES.name));
    const hasSupportingColumn = row.some(
      (cell) =>
        matchesHeader(cell, HEADER_ALIASES.type) ||
        matchesHeader(cell, HEADER_ALIASES.status) ||
        matchesHeader(cell, HEADER_ALIASES.level)
    );

    if (hasName && hasSupportingColumn) return rowIndex;
  }

  return -1;
}

function findColumn(header: unknown[], aliases: readonly string[], fallback: number): number {
  const index = header.findIndex((cell) => matchesHeader(cell, aliases));
  return index >= 0 ? index : fallback;
}

function normalizeDistrict(value: unknown, fallback?: string): DistrictName | null {
  const candidate = normalizeCell(value || fallback)
    .replace(/^อำเภอ/, '')
    .replace(/^อ\./, '')
    .trim();

  if (candidate === 'เมืองสตูล') return 'เมือง';

  const exact = DISTRICTS.find((district) => candidate === district);
  if (exact) return exact;

  const partial = DISTRICTS.find(
    (district) => candidate.includes(district) || district.includes(candidate)
  );
  return partial || null;
}

function normalizeAssessmentLevel(value: unknown): number | null {
  const text = normalizeCell(value);
  if (!text || text === '-' || /ยังไม่|รอ/.test(text)) return null;

  const match = text.match(/[1-3]/);
  if (!match) return null;

  const level = Number(match[0]);
  return Number.isInteger(level) && level >= 1 && level <= 3 ? level : null;
}

function normalizeAssessmentStatus(
  value: unknown,
  level: number | null
): GoogleSheetClinic['assessmentStatus'] {
  const text = normalizeCell(value);

  if (level !== null || /ประเมินแล้ว|ดำเนินการแล้ว|แล้วเสร็จ/.test(text)) {
    return 'ประเมินแล้ว';
  }
  if (/ยังไม่ประเมิน/.test(text)) return 'ยังไม่ประเมิน';
  return 'รอประเมิน';
}

function normalizePassCriteria(
  value: unknown,
  level: number | null
): GoogleSheetClinic['passCriteria'] {
  if (level !== null) return level >= 2 ? 'ผ่าน' : 'ไม่ผ่าน';

  const text = normalizeCell(value);
  if (/ไม่ผ่าน/.test(text)) return 'ไม่ผ่าน';
  if (/ผ่าน/.test(text)) return 'ผ่าน';
  return 'รอการประเมิน';
}

function isSummaryRow(name: string, firstCell: string): boolean {
  return (
    !name ||
    name.includes('ภาพรวม') ||
    name.startsWith('รวม') ||
    firstCell.includes('ภาพรวม') ||
    firstCell.startsWith('รวม')
  );
}

function safePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(normalizeCell(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];

    if (inQuotes) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  return rows;
}

export function parseClinicRows(
  rows: unknown[][],
  options: SheetParseOptions = {}
): GoogleSheetClinic[] {
  const headerRowIndex = findHeaderRow(rows);
  const usesFallbackLayout = headerRowIndex < 0;
  const header = usesFallbackLayout ? [] : rows[headerRowIndex] || [];
  const dataStart = usesFallbackLayout ? Math.min(2, rows.length) : headerRowIndex + 1;

  const columns = {
    no: findColumn(header, HEADER_ALIASES.no, 0),
    district: findColumn(header, HEADER_ALIASES.district, -1),
    name: findColumn(header, HEADER_ALIASES.name, 1),
    type: findColumn(header, HEADER_ALIASES.type, 2),
    licensee: findColumn(header, HEADER_ALIASES.licensee, 3),
    status: findColumn(header, HEADER_ALIASES.status, 4),
    level: findColumn(header, HEADER_ALIASES.level, 5),
    pass: findColumn(header, HEADER_ALIASES.pass, 6),
    remarks: findColumn(header, HEADER_ALIASES.remarks, 7),
  };

  const clinics: GoogleSheetClinic[] = [];

  for (let rowIndex = dataStart; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const name = normalizeCell(row[columns.name]);
    const firstCell = normalizeCell(row[0]);
    if (isSummaryRow(name, firstCell)) continue;

    const district = normalizeDistrict(
      columns.district >= 0 ? row[columns.district] : undefined,
      options.district
    );
    if (!district) continue;

    const assessmentLevel = normalizeAssessmentLevel(row[columns.level]);
    const no = safePositiveInteger(row[columns.no], clinics.length + 1);
    const idPrefix = options.idPrefix || district;

    clinics.push({
      id: `STN-${idPrefix}-${no}`,
      no,
      district,
      name,
      type: normalizeCell(row[columns.type]) || 'คลินิกเวชกรรม',
      licensee: normalizeCell(row[columns.licensee]) || '-',
      assessmentStatus: normalizeAssessmentStatus(row[columns.status], assessmentLevel),
      assessmentLevel,
      passCriteria: normalizePassCriteria(row[columns.pass], assessmentLevel),
      remarks: normalizeCell(row[columns.remarks]),
    });
  }

  return clinics;
}

export function parseAuditLogRows(rows: unknown[][]): GoogleSheetAuditLog[] {
  if (rows.length <= 1) return [];

  return rows
    .slice(1)
    .filter((row) => normalizeCell(row[0]))
    .map((row) => ({
      id: normalizeCell(row[0]),
      timestamp: normalizeCell(row[1]),
      district: normalizeCell(row[2]),
      clinicName: normalizeCell(row[3]),
      previousStatus: normalizeCell(row[4]),
      newStatus: normalizeCell(row[5]),
      previousLevel: normalizeCell(row[6]),
      newLevel: normalizeCell(row[7]),
      editedBy: normalizeCell(row[8]),
      remarks: normalizeCell(row[9]),
      telegramSent: true,
    }))
    .reverse();
}

function validateSpreadsheetId(spreadsheetId: string): string {
  const value = spreadsheetId.trim();
  if (!/^[a-zA-Z0-9_-]{20,100}$/.test(value)) {
    throw new Error('Spreadsheet ID ไม่ถูกต้อง');
  }
  return value;
}

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function getServiceAccountAccessToken(
  scope = 'https://www.googleapis.com/auth/spreadsheets.readonly'
): Promise<string> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

  if (!clientEmail || !privateKey) {
    throw new Error('ยังไม่ได้ตั้งค่า Google service account');
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope,
      aud: 'https://oauth2.googleapis.com/token',
      iat: issuedAt,
      exp: issuedAt + 3600,
    })
  );
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer
    .sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedToken}.${signature}`,
    }),
  });
  const json = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !json.access_token) {
    throw new Error(
      json.error_description || json.error || 'Google service account authentication failed'
    );
  }

  return json.access_token;
}

function sheetRange(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

async function loadViaGoogleSheetsApi(spreadsheetId: string): Promise<GoogleSheetData> {
  const accessToken = await getServiceAccountAccessToken();
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchGet`
  );

  for (const sheetName of [...DISTRICTS, AUDIT_LOG_SHEET]) {
    url.searchParams.append('ranges', sheetRange(sheetName));
  }
  url.searchParams.set('majorDimension', 'ROWS');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await response.json()) as GoogleValuesResponse;

  if (!response.ok) {
    throw new Error(json.error?.message || `Google Sheets API ตอบกลับ HTTP ${response.status}`);
  }

  const valueRanges = json.valueRanges || [];
  const clinics = DISTRICTS.flatMap((district, index) =>
    parseClinicRows(valueRanges[index]?.values || [], {
      district,
      idPrefix: district,
    })
  );
  const auditLogs = parseAuditLogRows(valueRanges[DISTRICTS.length]?.values || []);

  return {
    clinics: deduplicateClinics(clinics),
    auditLogs,
    source: 'google-sheets-api',
  };
}

async function fetchPublicCsv(
  spreadsheetId: string,
  selector: { sheet?: string; gid?: string }
): Promise<string> {
  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq`
  );
  url.searchParams.set('tqx', 'out:csv');
  if (selector.sheet) url.searchParams.set('sheet', selector.sheet);
  if (selector.gid) url.searchParams.set('gid', selector.gid);

  const response = await fetch(url, {
    headers: {
      Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.1',
      'User-Agent': 'RDU-Clinics-Satun/1.0',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    const error = new Error(
      response.status === 401 || response.status === 403
        ? 'Google Sheet ยังจำกัดสิทธิ์การอ่าน กรุณาแชร์ให้ service account หรือเปิดสิทธิ์ผู้ที่มีลิงก์เป็นผู้มีสิทธิ์ดู'
        : `Google Sheets CSV ตอบกลับ HTTP ${response.status}`
    );
    Object.assign(error, { status: response.status });
    throw error;
  }

  const text = await response.text();
  if (/^\s*</.test(text) || /google\.visualization\.Query\.setResponse/.test(text)) {
    throw new Error('Google Sheets ไม่ได้ส่งข้อมูล CSV กลับมา');
  }
  return text;
}

function deduplicateClinics(clinics: GoogleSheetClinic[]): GoogleSheetClinic[] {
  const seen = new Set<string>();
  return clinics.filter((clinic) => {
    const key = `${clinic.district}|${clinic.name}`.toLocaleLowerCase('th-TH');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function loadViaPublicCsv(
  spreadsheetId: string,
  gid: string
): Promise<GoogleSheetData> {
  const districtResults = await Promise.allSettled(
    DISTRICTS.map(async (district) => {
      const csv = await fetchPublicCsv(spreadsheetId, { sheet: district });
      return parseClinicRows(parseCsv(csv), { district, idPrefix: district });
    })
  );

  let clinics = districtResults.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : []
  );

  if (clinics.length === 0) {
    const csv = await fetchPublicCsv(spreadsheetId, { gid });
    clinics = parseClinicRows(parseCsv(csv), { idPrefix: `GID-${gid}` });
  }

  let auditLogs: GoogleSheetAuditLog[] = [];
  try {
    const auditCsv = await fetchPublicCsv(spreadsheetId, { sheet: AUDIT_LOG_SHEET });
    auditLogs = parseAuditLogRows(parseCsv(auditCsv));
  } catch {
    // AuditLogs is optional. Clinic data remains usable when this tab does not exist.
  }

  const uniqueClinics = deduplicateClinics(clinics);
  if (uniqueClinics.length === 0) {
    const firstError = districtResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    if (firstError) throw firstError.reason;
    throw new Error('ไม่พบข้อมูลคลินิกใน Google Sheet');
  }

  return {
    clinics: uniqueClinics,
    auditLogs,
    source: 'public-csv',
  };
}

export async function loadGoogleSheetData(
  spreadsheetId = DEFAULT_SPREADSHEET_ID,
  gid = DEFAULT_SHEET_GID
): Promise<GoogleSheetData> {
  const validSpreadsheetId = validateSpreadsheetId(spreadsheetId);
  const validGid = /^\d+$/.test(gid) ? gid : DEFAULT_SHEET_GID;
  const hasServiceAccount = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );

  if (hasServiceAccount) {
    try {
      return await loadViaGoogleSheetsApi(validSpreadsheetId);
    } catch (error) {
      console.warn('Google Sheets API failed; trying public CSV fallback', error);
    }
  }

  return loadViaPublicCsv(validSpreadsheetId, validGid);
}
