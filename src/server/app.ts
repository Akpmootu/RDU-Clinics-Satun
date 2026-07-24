import express, { Request, Response } from 'express';
import {
  AdminJwtPayload,
  createSignedOauthState,
  generateCsrfState,
  isJwtConfigured,
  maskIdentifier,
  signAdminToken,
  verifyAdminToken,
  verifySignedOauthState,
} from './auth.js';

type AuthProvider = 'google' | 'line';
type AdminRole = 'super_admin' | 'admin' | 'viewer';
type AdminStatus = 'active' | 'pending' | 'suspended';

interface AdminRecord {
  id: string;
  emailOrId: string;
  provider: AuthProvider;
  role: AdminRole;
  status: AdminStatus;
  name: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  id?: string;
  email?: string;
  name?: string;
  verified_email?: boolean;
}

interface LineTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface LineUserInfo {
  sub?: string;
  name?: string;
  picture?: string;
}

const app = express();
const SESSION_COOKIE = 'satun_admin_token';
const OAUTH_COOKIE_MAX_AGE = 10 * 60 * 1000;
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;

app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
}

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function csvEnv(name: string): string[] {
  return (process.env[name] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseCookies(req: Request): Record<string, string> {
  const cookies: Record<string, string> = {};

  for (const item of (req.headers.cookie || '').split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0) continue;

    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (!key) continue;

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  return cookies;
}

function providerConfig(provider: AuthProvider) {
  if (provider === 'google') {
    const clientId = envValue('GOOGLE_CLIENT_ID');
    const clientSecret = envValue('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) return null;
    return {
      clientId,
      clientSecret,
      redirectUri:
        envValue('GOOGLE_REDIRECT_URI') ||
        'https://rdu-clinics-satun.vercel.app/api/auth/google/callback',
    };
  }

  const clientId = envValue('LINE_CHANNEL_ID');
  const clientSecret = envValue('LINE_CHANNEL_SECRET');
  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    redirectUri:
      envValue('LINE_REDIRECT_URI') ||
      'https://rdu-clinics-satun.vercel.app/api/auth/line/callback',
  };
}

function oauthCookieName(provider: AuthProvider): string {
  return `satun_oauth_${provider}_state`;
}

function oauthCookieOptions(provider: AuthProvider) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax' as const,
    path: `/api/auth/${provider}/callback`,
  };
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax' as const,
    path: '/',
  };
}

function setOauthStateCookie(
  res: Response,
  provider: AuthProvider,
  state: string
): void {
  res.cookie(oauthCookieName(provider), createSignedOauthState(provider, state), {
    ...oauthCookieOptions(provider),
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });
}

function clearOauthStateCookie(res: Response, provider: AuthProvider): void {
  res.clearCookie(oauthCookieName(provider), oauthCookieOptions(provider));
}

function validateOauthState(
  req: Request,
  provider: AuthProvider,
  state: unknown
): boolean {
  if (typeof state !== 'string') return false;
  const signedState = parseCookies(req)[oauthCookieName(provider)];
  return verifySignedOauthState(provider, state, signedState);
}

function redirectToLogin(
  res: Response,
  status: string,
  provider?: AuthProvider
) {
  const params = new URLSearchParams({ auth: status });
  if (provider) params.set('provider', provider);
  return res.redirect(`/admin/login?${params.toString()}`);
}

function findGoogleAdmin(email: string, displayName: string): AdminRecord | null {
  const normalizedEmail = email.toLowerCase();
  const builtIn: AdminRecord[] = [
    {
      id: 'usr_super_admin',
      emailOrId: 'akaporn1234@gmail.com',
      provider: 'google',
      role: 'super_admin',
      status: 'active',
      name: 'Akaporn (Super Admin)',
    },
    {
      id: 'usr_admin_1',
      emailOrId: 'satun.rdu.admin@gmail.com',
      provider: 'google',
      role: 'admin',
      status: 'active',
      name: 'เจ้าหน้าที่กลุ่มงานเภสัชกรรม สสจ.สตูล',
    },
  ];

  const builtInMatch = builtIn.find(
    (record) => record.emailOrId.toLowerCase() === normalizedEmail
  );
  if (builtInMatch) return builtInMatch;

  const superAdminEmails = csvEnv('SUPER_ADMIN_GOOGLE_EMAILS').map((value) =>
    value.toLowerCase()
  );
  const adminEmails = csvEnv('ADMIN_GOOGLE_EMAILS').map((value) =>
    value.toLowerCase()
  );

  if (superAdminEmails.includes(normalizedEmail)) {
    return {
      id: `usr_g_${normalizedEmail}`,
      emailOrId: normalizedEmail,
      provider: 'google',
      role: 'super_admin',
      status: 'active',
      name: displayName || normalizedEmail,
    };
  }

  if (adminEmails.includes(normalizedEmail)) {
    return {
      id: `usr_g_${normalizedEmail}`,
      emailOrId: normalizedEmail,
      provider: 'google',
      role: 'admin',
      status: 'active',
      name: displayName || normalizedEmail,
    };
  }

  return null;
}

function findLineAdmin(userId: string, displayName: string): AdminRecord | null {
  const superAdminIds = csvEnv('SUPER_ADMIN_LINE_USER_IDS');
  const adminIds = csvEnv('ADMIN_LINE_USER_IDS');

  if (superAdminIds.includes(userId)) {
    return {
      id: `usr_l_${userId}`,
      emailOrId: userId,
      provider: 'line',
      role: 'super_admin',
      status: 'active',
      name: displayName || 'LINE Super Admin',
    };
  }

  if (adminIds.includes(userId)) {
    return {
      id: `usr_l_${userId}`,
      emailOrId: userId,
      provider: 'line',
      role: 'admin',
      status: 'active',
      name: displayName || 'LINE Admin',
    };
  }

  return null;
}

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
  provider: 'google' | 'line';
  role: 'super_admin' | 'admin' | 'viewer' | 'user';
  status: 'pending' | 'active' | 'suspended' | 'blocked';
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  avatarUrl?: string;
}

const DEFAULT_SERVER_USERS: ServerAppUser[] = [
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

const globalServerUsers: ServerAppUser[] = [...DEFAULT_SERVER_USERS];

async function sendServerTelegramNotification(text: string) {
  const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN || '8642457774:AAEssByKIIelsFpDnkz9ridr-IT--J2Ap9I';
  const chatId = process.env.VITE_TELEGRAM_CHAT_ID || '-5319646324';

  if (!botToken || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.warn('Server Telegram notification failed:', err);
  }
}

function registerOrFindOAuthUser(
  provider: AuthProvider,
  identifier: string,
  displayName: string
): AdminRecord {
  const cleanId = identifier.trim().toLowerCase();

  const envAdmin = provider === 'google' ? findGoogleAdmin(cleanId, displayName) : findLineAdmin(cleanId, displayName);
  if (envAdmin) return envAdmin;

  const existing = globalServerUsers.find(
    (u) => u.emailOrId.toLowerCase() === cleanId && u.provider === provider
  );

  if (existing) {
    return {
      id: existing.id,
      emailOrId: existing.emailOrId,
      provider: existing.provider,
      role: existing.role as AdminRole,
      status: existing.status as AdminStatus,
      name: existing.name,
    };
  }

  const newPendingUser: ServerAppUser = {
    id: `usr_${provider}_${Date.now()}`,
    emailOrId: identifier.trim(),
    name: displayName || (provider === 'line' ? `LINE User (${identifier.slice(0, 8)}...)` : identifier),
    position: `เจ้าหน้าที่ (ผ่าน ${provider.toUpperCase()})`,
    workGroup: 'รอระบุกลุ่มงาน',
    affiliation: 'รอระบุสังกัด',
    phone: '-',
    provider,
    role: 'admin',
    status: 'pending',
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    avatarUrl:
      provider === 'google'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
  };

  globalServerUsers.unshift(newPendingUser);

  const nowStr = new Date().toLocaleString('th-TH');
  sendServerTelegramNotification(
    `🔔 *[แจ้งเตือนเจ้าหน้าที่ใหม่ลงทะเบียนเข้าใช้งาน]*\n\n` +
    `👤 *ชื่อ-นามสกุล:* ${newPendingUser.name}\n` +
    `💼 *ตำแหน่ง:* ${newPendingUser.position}\n` +
    `📧 *บัญชีใช้งาน:* ${newPendingUser.emailOrId} (${provider.toUpperCase()})\n` +
    `⏳ *สถานะ:* รอการอนุมัติสิทธิ์จาก Super Admin\n\n` +
    `🗓️ *เวลาลงทะเบียน:* ${nowStr} น.`
  ).catch(() => {});

  return {
    id: newPendingUser.id,
    emailOrId: newPendingUser.emailOrId,
    provider: newPendingUser.provider,
    role: newPendingUser.role as AdminRole,
    status: newPendingUser.status as AdminStatus,
    name: newPendingUser.name,
  };
}

function issueSession(res: Response, record: AdminRecord): void {
  const token = signAdminToken(
    {
      id: record.id,
      emailOrId: record.emailOrId,
      displayName: record.name,
      provider: record.provider,
      role: record.role,
      status: record.status,
    },
    8
  );

  res.cookie(SESSION_COOKIE, token, {
    ...sessionCookieOptions(),
    maxAge: SESSION_MAX_AGE,
  });
}

function readSession(req: Request): AdminJwtPayload | null {
  const cookies = parseCookies(req);
  const token =
    cookies[SESSION_COOKIE] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '');

  return token ? verifyAdminToken(token) : null;
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'RDU Clinics Satun OAuth Server',
    version: '2.0.0',
    oauth: {
      google: { configured: Boolean(providerConfig('google')) },
      line: { configured: Boolean(providerConfig('line')) },
      session: { configured: isJwtConfigured() },
    },
  });
});

app.get('/api/auth/google', (_req, res) => {
  const config = providerConfig('google');
  if (!config || !isJwtConfigured()) {
    return redirectToLogin(res, 'configuration_error', 'google');
  }

  const state = generateCsrfState();
  setOauthStateCookie(res, 'google', state);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  return res.redirect(authUrl.toString());
});

app.get('/api/auth/google/callback', async (req, res) => {
  const config = providerConfig('google');
  const { code, state, error } = req.query;

  if (error || typeof code !== 'string') {
    clearOauthStateCookie(res, 'google');
    return redirectToLogin(res, 'cancelled', 'google');
  }

  if (!config || !isJwtConfigured()) {
    clearOauthStateCookie(res, 'google');
    return redirectToLogin(res, 'configuration_error', 'google');
  }

  if (!validateOauthState(req, 'google', state)) {
    clearOauthStateCookie(res, 'google');
    return redirectToLogin(res, 'state_error', 'google');
  }
  clearOauthStateCookie(res, 'google');

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error || 'google_token_exchange_failed');
    }

    const userResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const user = (await userResponse.json()) as GoogleUserInfo;
    const email = user.email?.trim().toLowerCase();

    if (!userResponse.ok || !email || user.verified_email === false) {
      throw new Error('google_verified_email_missing');
    }

    const record = registerOrFindOAuthUser('google', email, user.name || email);
    issueSession(res, record);

    return redirectToLogin(
      res,
      record.status === 'active' ? 'success' : 'pending',
      'google'
    );
  } catch (error) {
    console.error('Google OAuth callback failed', error);
    return redirectToLogin(res, 'provider_error', 'google');
  }
});

app.get('/api/auth/line', (_req, res) => {
  const config = providerConfig('line');
  if (!config || !isJwtConfigured()) {
    return redirectToLogin(res, 'configuration_error', 'line');
  }

  const state = generateCsrfState();
  setOauthStateCookie(res, 'line', state);

  const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'profile openid');

  return res.redirect(authUrl.toString());
});

app.get('/api/auth/line/callback', async (req, res) => {
  const config = providerConfig('line');
  const { code, state, error } = req.query;

  if (error || typeof code !== 'string') {
    clearOauthStateCookie(res, 'line');
    return redirectToLogin(res, 'cancelled', 'line');
  }

  if (!config || !isJwtConfigured()) {
    clearOauthStateCookie(res, 'line');
    return redirectToLogin(res, 'configuration_error', 'line');
  }

  if (!validateOauthState(req, 'line', state)) {
    clearOauthStateCookie(res, 'line');
    return redirectToLogin(res, 'state_error', 'line');
  }
  clearOauthStateCookie(res, 'line');

  try {
    const tokenResponse = await fetch(
      'https://api.line.me/oauth2/v2.1/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
      }
    );
    const tokenData = (await tokenResponse.json()) as LineTokenResponse;

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error || 'line_token_exchange_failed');
    }

    const userResponse = await fetch(
      'https://api.line.me/oauth2/v2.1/userinfo',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const user = (await userResponse.json()) as LineUserInfo;
    const userId = user.sub?.trim();

    if (!userResponse.ok || !userId) {
      throw new Error('line_user_id_missing');
    }

    const record = registerOrFindOAuthUser('line', userId, user.name || 'LINE User');
    issueSession(res, record);

    return redirectToLogin(
      res,
      record.status === 'active' ? 'success' : 'pending',
      'line'
    );
  } catch (error) {
    console.error('LINE OAuth callback failed', error);
    return redirectToLogin(res, 'provider_error', 'line');
  }
});

app.get('/api/users', (_req, res) => {
  res.json({
    status: 'success',
    users: globalServerUsers,
  });
});

app.post('/api/users/register', (req, res) => {
  const { firstName, lastName, position, workGroup, affiliation, phone, emailOrId, provider } = req.body || {};

  if (!emailOrId || !provider) {
    return res.status(400).json({ status: 'error', message: 'กรุณาระบุข้อมูลให้ครบถ้วน' });
  }

  const cleanId = String(emailOrId).trim().toLowerCase();
  const existing = globalServerUsers.find((u) => u.emailOrId.toLowerCase() === cleanId && u.provider === provider);

  if (existing) {
    return res.json({ status: 'success', user: existing, message: 'บัญชีนี้ถูกบันทึกไว้ในระบบแล้ว' });
  }

  const fullName = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim() || cleanId;
  const newUser: ServerAppUser = {
    id: `usr_reg_${Date.now()}`,
    emailOrId: String(emailOrId).trim(),
    name: fullName,
    firstName: String(firstName || '').trim(),
    lastName: String(lastName || '').trim(),
    position: String(position || '').trim() || 'เจ้าหน้าที่',
    workGroup: String(workGroup || '').trim() || 'กลุ่มงาน',
    affiliation: String(affiliation || '').trim() || 'สังกัด',
    phone: String(phone || '').trim() || '-',
    provider: provider === 'line' ? 'line' : 'google',
    role: 'admin',
    status: 'pending',
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    avatarUrl:
      provider === 'google'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
  };

  globalServerUsers.unshift(newUser);

  const nowStr = new Date().toLocaleString('th-TH');
  sendServerTelegramNotification(
    `🔔 *[แจ้งเตือนเจ้าหน้าที่ใหม่ลงทะเบียนเข้าใช้งาน]*\n\n` +
    `👤 *ชื่อ-นามสกุล:* ${newUser.name}\n` +
    `💼 *ตำแหน่ง:* ${newUser.position}\n` +
    `🏢 *กลุ่มงาน:* ${newUser.workGroup}\n` +
    `🏥 *สังกัด:* ${newUser.affiliation}\n` +
    `📞 *เบอร์โทร:* ${newUser.phone}\n` +
    `📧 *บัญชีใช้งาน:* ${newUser.emailOrId} (${newUser.provider.toUpperCase()})\n` +
    `⏳ *สถานะ:* รอการอนุมัติสิทธิ์จาก Super Admin\n\n` +
    `🗓️ *เวลาลงทะเบียน:* ${nowStr} น.`
  ).catch(() => {});

  return res.json({
    status: 'success',
    user: newUser,
    message: 'ลงทะเบียนเจ้าหน้าที่สำเร็จ',
  });
});

app.post('/api/users/approve', (req, res) => {
  const { userId, emailOrId, status, role } = req.body || {};

  const target = globalServerUsers.find(
    (u) => (userId && u.id === userId) || (emailOrId && u.emailOrId.toLowerCase() === String(emailOrId).toLowerCase())
  );

  if (!target) {
    return res.status(404).json({ status: 'error', message: 'ไม่พบผู้ใช้งานในระบบ' });
  }

  if (status) target.status = status;
  if (role) target.role = role;

  if (status === 'active') {
    const nowStr = new Date().toLocaleString('th-TH');
    sendServerTelegramNotification(
      `✅ *[แจ้งเตือนการยืนยันรับ / อนุมัติสิทธิ์เจ้าหน้าที่]*\n\n` +
      `👤 *ชื่อ-นามสกุล:* ${target.name}\n` +
      `💼 *ตำแหน่ง:* ${target.position || '-'}\n` +
      `🏥 *สังกัด:* ${target.affiliation || target.workGroup || '-'}\n` +
      `📧 *บัญชีใช้งาน:* ${target.emailOrId}\n` +
      `🟢 *สถานะใหม่:* อนุมัติสิทธิ์เข้าใช้งานแล้ว (Active)\n\n` +
      `🗓️ *เวลาอนุมัติ:* ${nowStr} น.`
    ).catch(() => {});
  }

  return res.json({
    status: 'success',
    users: globalServerUsers,
    user: target,
  });
});

app.post('/api/users/reset', (_req, res) => {
  globalServerUsers.length = 0;
  globalServerUsers.push(...DEFAULT_SERVER_USERS);
  return res.json({ status: 'success', users: globalServerUsers });
});

app.get('/api/auth/me', (req, res) => {
  const user = readSession(req);
  if (!user) {
    return res.json({
      status: 'unauthenticated',
      user: null,
    });
  }

  const cleanId = user.emailOrId.toLowerCase();
  const serverUser = globalServerUsers.find((u) => u.emailOrId.toLowerCase() === cleanId);
  const effectiveStatus = serverUser ? serverUser.status : user.status;
  const effectiveRole = serverUser ? serverUser.role : user.role;

  return res.json({
    status: 'success',
    user: {
      ...user,
      status: effectiveStatus,
      role: effectiveRole,
      maskedIdentifier: maskIdentifier(user.emailOrId),
    },
  });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  return res.json({ status: 'success', message: 'ออกจากระบบสำเร็จ' });
});

app.use('/api', (error: unknown, _req: Request, res: Response, _next: unknown) => {
  console.error('Unhandled API error', error);
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง',
  });
});

export default app;
