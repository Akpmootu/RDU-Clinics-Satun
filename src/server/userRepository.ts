import { createHash } from 'node:crypto';
import {
  DEFAULT_SPREADSHEET_ID,
  getServiceAccountAccessToken,
} from './googleSheets.js';

export type UserProvider = 'google' | 'line';
export type UserRole = 'super_admin' | 'admin' | 'viewer' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'blocked';

export interface ServerAppUser {
  id: string;
  emailOrId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  workGroup?: string;
  affiliation?: string;
  phone?: string;
  provider: UserProvider;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  avatarUrl?: string;
  updatedAt?: string;
}

interface GoogleApiError {
  error?: { message?: string };
}

interface SpreadsheetMetadata extends GoogleApiError {
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
}

interface ValuesResponse extends GoogleApiError {
  values?: unknown[][];
}

const WRITE_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
export const SYSTEM_USERS_SHEET = 'SystemUsers';
export const OWNER_EMAIL = 'akaporn1234@gmail.com';
export const USER_HEADERS = [
  'id',
  'emailOrId',
  'name',
  'firstName',
  'lastName',
  'position',
  'workGroup',
  'affiliation',
  'phone',
  'provider',
  'role',
  'status',
  'createdAt',
  'approvedBy',
  'approvedAt',
  'avatarUrl',
  'updatedAt',
] as const;

const OWNER_USER: ServerAppUser = {
  id: 'usr_super_admin',
  emailOrId: OWNER_EMAIL,
  name: 'เอกภรณ์ สุวรรณฉวี',
  firstName: 'เอกภรณ์',
  lastName: 'สุวรรณฉวี',
  position: 'ภก.ชำนาญการพิเศษ (Super Admin)',
  workGroup: 'กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค',
  affiliation: 'สำนักงานสาธารณสุขจังหวัดสตูล',
  phone: '081-234-5678',
  provider: 'google',
  role: 'super_admin',
  status: 'active',
  createdAt: '2569-01-01 09:00',
  avatarUrl:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
};

function spreadsheetId(): string {
  return process.env.USER_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID;
}

function sheetRange(range: string): string {
  return `'${SYSTEM_USERS_SHEET}'!${range}`;
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

function cleanCell(value: unknown): string {
  return String(value ?? '').trim();
}

function isProvider(value: string): value is UserProvider {
  return value === 'google' || value === 'line';
}

function isRole(value: string): value is UserRole {
  return ['super_admin', 'admin', 'viewer', 'user'].includes(value);
}

function isStatus(value: string): value is UserStatus {
  return ['pending', 'active', 'suspended', 'blocked'].includes(value);
}

export function stableUserId(provider: UserProvider, identifier: string): string {
  const digest = createHash('sha256')
    .update(`${provider}:${normalizeIdentifier(identifier)}`)
    .digest('hex')
    .slice(0, 18);
  return `usr_${provider}_${digest}`;
}

export function userToRow(user: ServerAppUser): string[] {
  return USER_HEADERS.map((header) => cleanCell(user[header]));
}

export function parseUserRows(rows: unknown[][]): ServerAppUser[] {
  if (rows.length === 0) return [];
  const header = rows[0].map(cleanCell);
  const indexes = new Map(header.map((name, index) => [name, index]));
  const value = (row: unknown[], name: (typeof USER_HEADERS)[number]) =>
    cleanCell(row[indexes.get(name) ?? -1]);

  return rows.slice(1).flatMap((row) => {
    const provider = value(row, 'provider');
    const role = value(row, 'role');
    const status = value(row, 'status');
    const emailOrId = value(row, 'emailOrId');
    if (!emailOrId || !isProvider(provider) || !isRole(role) || !isStatus(status)) {
      return [];
    }

    const user: ServerAppUser = {
      id: value(row, 'id') || stableUserId(provider, emailOrId),
      emailOrId,
      name: value(row, 'name') || emailOrId,
      firstName: value(row, 'firstName'),
      lastName: value(row, 'lastName'),
      position: value(row, 'position'),
      workGroup: value(row, 'workGroup'),
      affiliation: value(row, 'affiliation'),
      phone: value(row, 'phone'),
      provider,
      role,
      status,
      createdAt: value(row, 'createdAt'),
      approvedBy: value(row, 'approvedBy'),
      approvedAt: value(row, 'approvedAt'),
      avatarUrl: value(row, 'avatarUrl'),
      updatedAt: value(row, 'updatedAt'),
    };
    return [user];
  });
}

async function googleRequest<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const token = accessToken || (await getServiceAccountAccessToken(WRITE_SCOPE));
  const response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const json = (await response.json().catch(() => ({}))) as T & GoogleApiError;
  if (!response.ok) {
    const message =
      json.error?.message ||
      `Google Sheets API ตอบกลับ HTTP ${response.status}`;
    if (response.status === 403) {
      throw new Error(
        `${message} กรุณาแชร์ Google Sheet ให้ service account เป็น Editor`
      );
    }
    throw new Error(message);
  }
  return json;
}

async function getSheetMetadata(accessToken: string): Promise<SpreadsheetMetadata> {
  return googleRequest<SpreadsheetMetadata>(
    `spreadsheets/${encodeURIComponent(spreadsheetId())}?fields=sheets.properties(sheetId,title)`,
    {},
    accessToken
  );
}

async function writeHeader(accessToken: string): Promise<void> {
  await googleRequest(
    `spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${encodeURIComponent(
      sheetRange(`A1:Q1`)
    )}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({ majorDimension: 'ROWS', values: [USER_HEADERS] }),
    },
    accessToken
  );
}

async function ensureUsersSheet(): Promise<{ accessToken: string; sheetId: number }> {
  const accessToken = await getServiceAccountAccessToken(WRITE_SCOPE);
  let metadata = await getSheetMetadata(accessToken);
  let properties = metadata.sheets?.find(
    (sheet) => sheet.properties?.title === SYSTEM_USERS_SHEET
  )?.properties;

  if (properties?.sheetId === undefined) {
    try {
      await googleRequest(
        `spreadsheets/${encodeURIComponent(spreadsheetId())}:batchUpdate`,
        {
          method: 'POST',
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: SYSTEM_USERS_SHEET,
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: USER_HEADERS.length,
                      frozenRowCount: 1,
                    },
                  },
                },
              },
            ],
          }),
        },
        accessToken
      );
    } catch (error) {
      // Another serverless request may have created the tab concurrently.
      metadata = await getSheetMetadata(accessToken);
      properties = metadata.sheets?.find(
        (sheet) => sheet.properties?.title === SYSTEM_USERS_SHEET
      )?.properties;
      if (properties?.sheetId === undefined) throw error;
    }
    metadata = await getSheetMetadata(accessToken);
    properties = metadata.sheets?.find(
      (sheet) => sheet.properties?.title === SYSTEM_USERS_SHEET
    )?.properties;
  }

  if (properties?.sheetId === undefined) {
    throw new Error(`ไม่สามารถสร้างชีต ${SYSTEM_USERS_SHEET} ได้`);
  }

  await writeHeader(accessToken);
  return { accessToken, sheetId: properties.sheetId };
}

async function loadRows(
  accessToken: string
): Promise<{ rows: unknown[][]; users: ServerAppUser[] }> {
  const result = await googleRequest<ValuesResponse>(
    `spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${encodeURIComponent(
      sheetRange('A:Q')
    )}?majorDimension=ROWS`,
    {},
    accessToken
  );
  const rows = result.values || [];
  return { rows, users: parseUserRows(rows) };
}

async function appendUser(user: ServerAppUser, accessToken: string): Promise<void> {
  await googleRequest(
    `spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${encodeURIComponent(
      sheetRange('A:Q')
    )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: [userToRow(user)],
      }),
    },
    accessToken
  );
}

async function ensureOwner(
  users: ServerAppUser[],
  accessToken: string
): Promise<ServerAppUser[]> {
  const owner = users.find(
    (user) =>
      user.provider === 'google' &&
      normalizeIdentifier(user.emailOrId) === OWNER_EMAIL
  );
  if (owner) return users;
  await appendUser(OWNER_USER, accessToken);
  return [...users, OWNER_USER];
}

function sortUsers(users: ServerAppUser[]): ServerAppUser[] {
  return [...users].sort((a, b) => {
    if (normalizeIdentifier(a.emailOrId) === OWNER_EMAIL) return -1;
    if (normalizeIdentifier(b.emailOrId) === OWNER_EMAIL) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function listUsers(): Promise<ServerAppUser[]> {
  const { accessToken } = await ensureUsersSheet();
  const { users } = await loadRows(accessToken);
  return sortUsers(await ensureOwner(users, accessToken));
}

export async function findUser(
  provider: UserProvider,
  identifier: string
): Promise<ServerAppUser | null> {
  const cleanId = normalizeIdentifier(identifier);
  const users = await listUsers();
  return (
    users.find(
      (user) =>
        user.provider === provider &&
        normalizeIdentifier(user.emailOrId) === cleanId
    ) || null
  );
}

export async function createUser(
  input: Omit<ServerAppUser, 'id'> & { id?: string }
): Promise<{ user: ServerAppUser; created: boolean }> {
  const { accessToken } = await ensureUsersSheet();
  const { users } = await loadRows(accessToken);
  const cleanId = normalizeIdentifier(input.emailOrId);
  const existing = users.find(
    (user) =>
      user.provider === input.provider &&
      normalizeIdentifier(user.emailOrId) === cleanId
  );
  if (existing) return { user: existing, created: false };

  const user: ServerAppUser = {
    ...input,
    id: input.id || stableUserId(input.provider, input.emailOrId),
    emailOrId: input.emailOrId.trim(),
    updatedAt: new Date().toISOString(),
  };
  await appendUser(user, accessToken);
  return { user, created: true };
}

export async function updateUser(
  selector: { userId?: string; emailOrId?: string },
  changes: Partial<
    Pick<
      ServerAppUser,
      'role' | 'status' | 'approvedBy' | 'approvedAt'
    >
  >
): Promise<{ user: ServerAppUser; users: ServerAppUser[] }> {
  const { accessToken } = await ensureUsersSheet();
  const { rows, users } = await loadRows(accessToken);
  const index = users.findIndex(
    (user) =>
      (selector.userId && user.id === selector.userId) ||
      (selector.emailOrId &&
        normalizeIdentifier(user.emailOrId) ===
          normalizeIdentifier(selector.emailOrId))
  );
  if (index < 0) throw new Error('USER_NOT_FOUND');

  const current = users[index];
  const isOwner = normalizeIdentifier(current.emailOrId) === OWNER_EMAIL;
  if (
    isOwner &&
    ((changes.role && changes.role !== 'super_admin') ||
      (changes.status && changes.status !== 'active'))
  ) {
    throw new Error('OWNER_PROTECTED');
  }

  const updated: ServerAppUser = {
    ...current,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  const headerOffset = rows.length > 0 ? 2 : 1;
  const rowNumber = index + headerOffset;
  await googleRequest(
    `spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${encodeURIComponent(
      sheetRange(`A${rowNumber}:Q${rowNumber}`)
    )}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: [userToRow(updated)],
      }),
    },
    accessToken
  );

  users[index] = updated;
  return { user: updated, users: sortUsers(users) };
}

export async function deleteUser(
  selector: { userId?: string; emailOrId?: string }
): Promise<ServerAppUser[]> {
  const { accessToken, sheetId } = await ensureUsersSheet();
  const { users } = await loadRows(accessToken);
  const index = users.findIndex(
    (user) =>
      (selector.userId && user.id === selector.userId) ||
      (selector.emailOrId &&
        normalizeIdentifier(user.emailOrId) ===
          normalizeIdentifier(selector.emailOrId))
  );
  if (index < 0) throw new Error('USER_NOT_FOUND');
  if (normalizeIdentifier(users[index].emailOrId) === OWNER_EMAIL) {
    throw new Error('OWNER_PROTECTED');
  }

  await googleRequest(
    `spreadsheets/${encodeURIComponent(spreadsheetId())}:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: index + 1,
                endIndex: index + 2,
              },
            },
          },
        ],
      }),
    },
    accessToken
  );
  users.splice(index, 1);
  return sortUsers(users);
}
