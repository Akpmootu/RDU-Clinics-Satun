import { AppUser, OfficerRegistrationData } from '../types';

const USERS_STORAGE_KEY = 'rdu_satun_app_users_v1';
const CURRENT_USER_KEY = 'rdu_satun_current_user_v1';

export const SUPER_ADMIN_EMAIL = 'akaporn1234@gmail.com';

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'usr_super_admin',
    emailOrId: SUPER_ADMIN_EMAIL,
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
  },
];

export function loadAppUsers(): AppUser[] {
  try {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

export function saveAppUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Failed to cache users', error);
  }
}

export function loadCurrentUser(): AppUser | null {
  try {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveCurrentUser(user: AppUser | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (error) {
    console.error('Failed to save current user', error);
  }
}

export function maskIdentifier(identifier: string): string {
  if (!identifier) return '';
  if (identifier.includes('@')) {
    const [name, domain] = identifier.split('@');
    if (name.length <= 2) return `${name.charAt(0)}*@${domain}`;
    const maskedName = `${name.slice(0, 2)}${'*'.repeat(
      Math.min(name.length - 3, 5)
    )}${name.slice(-1)}`;
    return `${maskedName}@${domain}`;
  }
  if (identifier.length <= 4) return `${identifier.charAt(0)}***`;
  return `${identifier.slice(0, 3)}***${identifier.slice(-2)}`;
}

async function readApiResponse(response: Response): Promise<any> {
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.status !== 'success') {
    throw new Error(data?.message || `เซิร์ฟเวอร์ตอบกลับ HTTP ${response.status}`);
  }
  return data;
}

export async function fetchServerUsers(): Promise<AppUser[]> {
  const response = await fetch('/api/users', {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = await readApiResponse(response);
  if (!Array.isArray(data.users)) {
    throw new Error('รูปแบบรายชื่อผู้ใช้งานจากเซิร์ฟเวอร์ไม่ถูกต้อง');
  }
  saveAppUsers(data.users);
  return data.users;
}

export async function registerOfficerServer(
  data: OfficerRegistrationData
): Promise<{ success: boolean; user?: AppUser; message?: string }> {
  try {
    const response = await fetch('/api/users/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await readApiResponse(response);
    return {
      success: true,
      user: result.user,
      message:
        result.message ||
        'ลงทะเบียนสำเร็จ ข้อมูลถูกส่งให้ผู้ดูแลระบบตรวจสอบแล้ว',
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'ไม่สามารถบันทึกการลงทะเบียนได้',
    };
  }
}

export async function updateUserStatusServer(
  userId: string,
  emailOrId: string,
  status: 'pending' | 'active' | 'suspended' | 'blocked',
  role?: string
): Promise<AppUser[]> {
  const response = await fetch('/api/users/approve', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, emailOrId, status, role }),
  });
  const data = await readApiResponse(response);
  if (!Array.isArray(data.users)) {
    throw new Error('เซิร์ฟเวอร์ไม่ได้ส่งรายชื่อผู้ใช้ล่าสุดกลับมา');
  }
  saveAppUsers(data.users);
  return data.users;
}

export async function deleteUserServer(userId: string): Promise<AppUser[]> {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  const data = await readApiResponse(response);
  if (!Array.isArray(data.users)) {
    throw new Error('เซิร์ฟเวอร์ไม่ได้ส่งรายชื่อผู้ใช้ล่าสุดกลับมา');
  }
  saveAppUsers(data.users);
  return data.users;
}
