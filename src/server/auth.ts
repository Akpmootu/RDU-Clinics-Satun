import crypto from 'node:crypto';

export interface AdminJwtPayload {
  id: string;
  emailOrId: string;
  displayName: string;
  provider: 'google' | 'line';
  role: 'super_admin' | 'admin' | 'viewer' | 'user';
  status: 'active' | 'pending' | 'suspended' | 'blocked';
  exp?: number;
  iat?: number;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET');
}

/**
 * สร้าง JWT Token (HS256) ด้วย crypto ในตัว Node.js
 */
export function signAdminToken(payload: Omit<AdminJwtPayload, 'exp' | 'iat'>, expiresInHours: number = 8): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInHours * 3600;
  
  const fullPayload: AdminJwtPayload = {
    ...payload,
    iat: now,
    exp: exp,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${b64Header}.${b64Payload}`)
    .digest('base64url');

  return `${b64Header}.${b64Payload}.${signature}`;
}

/**
 * ตรวจสอบความถูกต้องของ JWT Token และวันหมดอายุ
 */
export function verifyAdminToken(token: string): AdminJwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [b64Header, b64Payload, sigB64] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${b64Header}.${b64Payload}`)
      .digest('base64url');

    if (sigB64 !== expectedSignature) return null;

    const payload: AdminJwtPayload = JSON.parse(
      Buffer.from(b64Payload, 'base64url').toString('utf-8')
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return null; // Token หมดอายุแล้ว
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * สร้าง State Nonce สุ่มป้องกันการโจมตีแบบ CSRF
 */
export function generateCsrfState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * ทำ Privacy Masking ปิดกั้นอักขระอีเมลตามกฎหมาย PDPA
 */
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
