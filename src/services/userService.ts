import { AppUser, OfficerRegistrationData } from '../types';

const USERS_STORAGE_KEY = 'rdu_satun_app_users_v1';
const CURRENT_USER_KEY = 'rdu_satun_current_user_v1';

export const SUPER_ADMIN_EMAIL = 'akaporn1234@gmail.com';

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'usr_super_admin',
    emailOrId: 'akaporn1234@gmail.com',
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
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_admin_1',
    emailOrId: 'satun.rdu.admin@gmail.com',
    name: 'เจ้าหน้าที่ สสจ.สตูล',
    firstName: 'เจ้าหน้าที่',
    lastName: 'สสจ.สตูล',
    position: 'นักวิชาการสาธารณสุข',
    workGroup: 'กลุ่มงานพัฒนายุทธศาสตร์สาธารณสุข',
    affiliation: 'สำนักงานสาธารณสุขจังหวัดสตูล',
    phone: '074-711-071',
    provider: 'google',
    role: 'admin',
    status: 'active',
    createdAt: '2569-01-02 10:30',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_line_admin',
    emailOrId: 'satun_rdu_line',
    name: 'LINE Admin Satun',
    firstName: 'เจ้าหน้าที่',
    lastName: 'LINE Admin',
    position: 'เจ้าพนักงานสาธารณสุข',
    workGroup: 'กลุ่มงานควบคุมโรคติดต่อ',
    affiliation: 'สำนักงานสาธารณสุขอำเภอเมืองสตูล',
    phone: '074-721-123',
    provider: 'line',
    role: 'admin',
    status: 'active',
    createdAt: '2569-01-05 14:15',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
  }
];

export function loadAppUsers(): AppUser[] {
  try {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (!saved) {
      saveAppUsers(DEFAULT_USERS);
      return DEFAULT_USERS;
    }
    const parsed: AppUser[] = JSON.parse(saved);
    // Ensure Super Admin is always present
    const superAdminExists = parsed.some(
      (u) => u.emailOrId.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );
    if (!superAdminExists) {
      const updated = [DEFAULT_USERS[0], ...parsed];
      saveAppUsers(updated);
      return updated;
    }
    return parsed;
  } catch {
    return DEFAULT_USERS;
  }
}

export function saveAppUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users to localStorage', e);
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
  } catch (e) {
    console.error('Failed to save current user', e);
  }
}

export function maskIdentifier(identifier: string): string {
  if (!identifier) return '';
  if (identifier.includes('@')) {
    const [name, domain] = identifier.split('@');
    if (name.length <= 2) {
      return `${name.charAt(0)}*@${domain}`;
    }
    const maskedName = `${name.slice(0, 2)}${'*'.repeat(Math.min(name.length - 3, 5))}${name.slice(-1)}`;
    return `${maskedName}@${domain}`;
  }
  if (identifier.length <= 4) {
    return `${identifier.charAt(0)}***`;
  }
  return `${identifier.slice(0, 3)}***${identifier.slice(-2)}`;
}

export function registerOfficer(
  data: OfficerRegistrationData
): { success: boolean; user?: AppUser; message?: string } {
  const users = loadAppUsers();
  const cleanId = data.emailOrId.trim().toLowerCase();

  const existing = users.find(
    (u) => u.emailOrId.toLowerCase() === cleanId && u.provider === data.provider
  );

  if (existing) {
    return {
      success: false,
      message: `บัญชี ${maskIdentifier(data.emailOrId)} (${data.provider.toUpperCase()}) ได้มีการลงทะเบียนในระบบแล้ว`,
    };
  }

  const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
  const newUser: AppUser = {
    id: `usr_reg_${Date.now()}`,
    emailOrId: data.emailOrId.trim(),
    name: fullName,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    position: data.position.trim(),
    workGroup: data.workGroup.trim(),
    affiliation: data.affiliation.trim(),
    phone: data.phone.trim(),
    provider: data.provider,
    role: 'admin',
    status: 'pending',
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    avatarUrl:
      data.provider === 'google'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
  };

  const updatedUsers = [newUser, ...users];
  saveAppUsers(updatedUsers);

  return {
    success: true,
    user: newUser,
    message: 'ลงทะเบียนสำเร็จ! ข้อมูลของคุณถูกส่งไปยังผู้ดูแลระบบเพื่ออนุมัติสิทธิ์เรียบร้อยแล้ว',
  };
}

export function validateLogin(
  emailOrId: string,
  provider: 'google' | 'line'
): { success: boolean; user?: AppUser; message?: string } {
  const users = loadAppUsers();
  const cleanId = emailOrId.trim().toLowerCase();

  // Special check for primary Super Admin
  if (cleanId === SUPER_ADMIN_EMAIL.toLowerCase()) {
    let superAdmin = users.find(
      (u) => u.emailOrId.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );
    if (!superAdmin) {
      superAdmin = DEFAULT_USERS[0];
    }
    return { success: true, user: superAdmin };
  }

  const foundUser = users.find(
    (u) => u.emailOrId.toLowerCase() === cleanId && u.provider === provider
  );

  if (!foundUser) {
    return {
      success: false,
      message: `ไม่พบสิทธิ์การใช้งานแอดมินสำหรับบัญชี ${maskIdentifier(emailOrId)} (${provider.toUpperCase()})\nกรุณาลงทะเบียนเจ้าหน้าที่ หรือติดต่อ Super Admin เพื่อขอเพิ่มสิทธิ์เข้าใช้งาน`,
    };
  }

  if (foundUser.status === 'blocked') {
    return {
      success: false,
      message: `บัญชี ${maskIdentifier(emailOrId)} ถูกระงับสิทธิ์การใช้งาน กรุณาติดต่อ Super Admin`,
    };
  }

  return { success: true, user: foundUser };
}

