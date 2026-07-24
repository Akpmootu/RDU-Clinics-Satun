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

const JWT_SECRET = process.env.JWT_SECRET || 'rdu-clinics-satun-default-jwt-secret-key-2569';

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
 * สร้าง HMAC-signed CSRF State Token สำหรับ Stateless OAuth (Vercel Serverless & Multi-instance compatible)
 */
export function generateCsrfStateToken(provider: 'google' | 'line'): string {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 นาที
  const nonce = crypto.randomBytes(12).toString('hex');
  const payload = `${provider}:${expiresAt}:${nonce}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payload)
    .digest('base64url');

  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
}

/**
 * ตรวจสอบความถูกต้องของ HMAC Signed CSRF State Token (Stateless Verification)
 */
export function verifyCsrfStateToken(stateToken: string, expectedProvider?: 'google' | 'line'): boolean {
  try {
    if (!stateToken) return false;
    const jsonStr = Buffer.from(stateToken, 'base64url').toString('utf-8');
    const { payload, signature } = JSON.parse(jsonStr);
    if (!payload || !signature) return false;

    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(payload)
      .digest('base64url');

    if (signature !== expectedSig) return false;

    const [provider, expiresAtStr] = payload.split(':');
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;
    if (expectedProvider && provider !== expectedProvider) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * สร้าง State Nonce สุ่มป้องกันการโจมตีแบบ CSRF (Backward Compatibility)
 */
export function generateCsrfState(): string {
  return generateCsrfStateToken('google');
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
