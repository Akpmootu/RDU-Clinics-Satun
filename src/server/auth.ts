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

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }
  return secret;
}

function secureEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function isJwtConfigured(): boolean {
  return Boolean(process.env.JWT_SECRET?.trim());
}

export function signAdminToken(
  payload: Omit<AdminJwtPayload, 'exp' | 'iat'>,
  expiresInHours: number = 8
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AdminJwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInHours * 3600,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${b64Header}.${b64Payload}`)
    .digest('base64url');

  return `${b64Header}.${b64Payload}.${signature}`;
}

export function verifyAdminToken(token: string): AdminJwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [b64Header, b64Payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${b64Header}.${b64Payload}`)
      .digest('base64url');

    if (!secureEquals(signature, expectedSignature)) return null;

    const payload: AdminJwtPayload = JSON.parse(
      Buffer.from(b64Payload, 'base64url').toString('utf-8')
    );
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function generateCsrfState(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function createSignedOauthState(
  provider: 'google' | 'line',
  state: string
): string {
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`oauth:${provider}:${state}`)
    .digest('base64url');

  return `${state}.${signature}`;
}

export function verifySignedOauthState(
  provider: 'google' | 'line',
  state: string,
  signedState: string | undefined
): boolean {
  if (!signedState) return false;
  return secureEquals(createSignedOauthState(provider, state), signedState);
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
