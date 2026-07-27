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
import {
  DEFAULT_SHEET_GID,
  DEFAULT_SPREADSHEET_ID,
  loadGoogleSheetData,
} from './googleSheets.js';
import {
  escapeTelegramHtml,
  isTelegramConfigured,
  sendClinicUpdateNotification,
  sendTelegramMessage,
} from './telegram.js';
import {
  createUser,
  deleteUser,
  findUser,
  listUsers,
  ServerAppUser,
  updateUser,
  UserProvider,
  UserRole,
  UserStatus,
} from './userRepository.js';

type AuthProvider = UserProvider;
type AdminRole = UserRole;
type AdminStatus = UserStatus;

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

async function sendServerTelegramNotification(text: string): Promise<boolean> {
  try {
    await sendTelegramMessage(text, 'HTML');
    return true;
  } catch (err) {
    console.warn('Server Telegram notification failed:', err);
    return false;
  }
}

async function registerOrFindOAuthUser(
  provider: AuthProvider,
  identifier: string,
  displayName: string
): Promise<AdminRecord> {
  const cleanId = identifier.trim().toLocaleLowerCase('en-US');
  const existing = await findUser(provider, cleanId);

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

  const { user: newPendingUser, created } = await createUser({
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
  });

  if (created) {
    const nowStr = new Date().toLocaleString('th-TH');
    await sendServerTelegramNotification(
      `🔔 <b>[มีเจ้าหน้าที่ใหม่ลงทะเบียนเข้าใช้งาน]</b>\n\n` +
      `👤 <b>ชื่อ-นามสกุล:</b> ${escapeTelegramHtml(newPendingUser.name)}\n` +
      `💼 <b>ตำแหน่ง:</b> ${escapeTelegramHtml(newPendingUser.position)}\n` +
      `📧 <b>บัญชีใช้งาน:</b> ${escapeTelegramHtml(newPendingUser.emailOrId)} (${provider.toUpperCase()})\n` +
      `⏳ <b>สถานะ:</b> รอ Super Admin ตรวจสอบและอนุมัติ\n\n` +
      `🗓️ <b>เวลาลงทะเบียน:</b> ${escapeTelegramHtml(nowStr)} น.`
    );
  }

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

async function readPersistentSession(req: Request): Promise<ServerAppUser | null> {
  const session = readSession(req);
  if (!session) return null;
  return findUser(session.provider, session.emailOrId);
}

async function requireSuperAdmin(
  req: Request,
  res: Response
): Promise<ServerAppUser | null> {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({
      status: 'error',
      code: 'AUTH_REQUIRED',
      message: 'กรุณาเข้าสู่ระบบก่อนจัดการผู้ใช้งาน',
    });
    return null;
  }

  const currentUser = await findUser(session.provider, session.emailOrId);
  if (
    !currentUser ||
    currentUser.status !== 'active' ||
    currentUser.role !== 'super_admin'
  ) {
    res.status(403).json({
      status: 'error',
      code: 'SUPER_ADMIN_REQUIRED',
      message: 'คำสั่งนี้อนุญาตเฉพาะ Super Admin ที่ใช้งานอยู่',
    });
    return null;
  }
  return currentUser;
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'RDU Clinics Satun OAuth Server',
    version: '3.0.0',
    oauth: {
      google: { configured: Boolean(providerConfig('google')) },
      line: { configured: Boolean(providerConfig('line')) },
      session: { configured: isJwtConfigured() },
    },
    services: {
      persistentUsers: {
        configured: Boolean(
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
            process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
        ),
      },
      telegram: { configured: isTelegramConfigured() },
    },
  });
});

app.get('/api/google-sheet', async (req, res) => {
  const spreadsheetId =
    typeof req.query.spreadsheetId === 'string' && req.query.spreadsheetId.trim()
      ? req.query.spreadsheetId
      : DEFAULT_SPREADSHEET_ID;
  const gid =
    typeof req.query.gid === 'string' && req.query.gid.trim()
      ? req.query.gid
      : DEFAULT_SHEET_GID;

  try {
    const data = await loadGoogleSheetData(spreadsheetId, gid);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ไม่สามารถอ่าน Google Sheet ได้';
    console.error('Google Sheet sync failed', error);
    return res.status(502).json({
      status: 'error',
      code: 'GOOGLE_SHEET_SYNC_FAILED',
      message,
    });
  }
});

app.post('/api/telegram/clinic-update', async (req, res) => {
  let user: ServerAppUser | null = null;
  try {
    user = await readPersistentSession(req);
  } catch (error) {
    console.error('Unable to verify Telegram sender', error);
    return res.status(503).json({
      status: 'error',
      code: 'USER_STORE_UNAVAILABLE',
      message: 'ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้งานได้ในขณะนี้',
    });
  }
  if (
    !user ||
    user.status !== 'active' ||
    (user.role !== 'admin' && user.role !== 'super_admin')
  ) {
    return res.status(401).json({
      status: 'error',
      code: 'AUTH_REQUIRED',
      message: 'กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าหน้าที่ก่อนส่งการแจ้งเตือน',
    });
  }

  const clinic = req.body?.clinic;
  const log = req.body?.log;
  if (
    !clinic ||
    !log ||
    typeof clinic.name !== 'string' ||
    typeof clinic.district !== 'string' ||
    typeof clinic.assessmentStatus !== 'string' ||
    typeof log.editedBy !== 'string' ||
    typeof log.remarks !== 'string' ||
    typeof log.timestamp !== 'string'
  ) {
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_NOTIFICATION',
      message: 'ข้อมูลสำหรับส่ง Telegram ไม่ครบถ้วน',
    });
  }

  const assessmentLevel =
    typeof clinic.assessmentLevel === 'number' ? clinic.assessmentLevel : null;

  try {
    const result = await sendClinicUpdateNotification({
      clinicName: clinic.name.slice(0, 500),
      district: clinic.district.slice(0, 100),
      assessmentStatus: clinic.assessmentStatus.slice(0, 100),
      assessmentLevel,
      editedBy: log.editedBy.slice(0, 500),
      remarks: log.remarks.slice(0, 1000),
      timestamp: log.timestamp.slice(0, 100),
    });

    return res.json({
      status: 'success',
      telegramSent: true,
      messageId: result.messageId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ไม่สามารถส่ง Telegram ได้';
    console.error('Clinic Telegram notification failed', error);
    return res.status(502).json({
      status: 'error',
      code: 'TELEGRAM_SEND_FAILED',
      message,
    });
  }
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

    const record = await registerOrFindOAuthUser('google', email, user.name || email);
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

    const record = await registerOrFindOAuthUser('line', userId, user.name || 'LINE User');
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

app.get('/api/users', async (req, res) => {
  try {
    const actor = await requireSuperAdmin(req, res);
    if (!actor) return;
    return res.json({
      status: 'success',
      users: await listUsers(),
    });
  } catch (error) {
    console.error('Unable to load users', error);
    return res.status(503).json({
      status: 'error',
      code: 'USER_STORE_UNAVAILABLE',
      message: error instanceof Error ? error.message : 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้',
    });
  }
});

app.post('/api/users/register', async (req, res) => {
  const { firstName, lastName, position, workGroup, affiliation, phone, emailOrId, provider } = req.body || {};

  if (!emailOrId || (provider !== 'google' && provider !== 'line')) {
    return res.status(400).json({ status: 'error', message: 'กรุณาระบุข้อมูลให้ครบถ้วน' });
  }

  const cleanId = String(emailOrId).trim().slice(0, 320);
  if (
    cleanId.length < 3 ||
    (provider === 'google' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId))
  ) {
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_IDENTIFIER',
      message: provider === 'google' ? 'รูปแบบอีเมลไม่ถูกต้อง' : 'LINE ID ไม่ถูกต้อง',
    });
  }

  const clean = (value: unknown, maxLength: number) =>
    String(value || '').trim().slice(0, maxLength);
  const fullName = `${clean(firstName, 100)} ${clean(lastName, 100)}`.trim() || cleanId;
  const newUser: Omit<ServerAppUser, 'id'> = {
    emailOrId: cleanId,
    name: fullName,
    firstName: clean(firstName, 100),
    lastName: clean(lastName, 100),
    position: clean(position, 200) || 'เจ้าหน้าที่',
    workGroup: clean(workGroup, 200) || 'กลุ่มงาน',
    affiliation: clean(affiliation, 200) || 'สังกัด',
    phone: clean(phone, 50) || '-',
    provider,
    role: 'admin',
    status: 'pending',
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    avatarUrl:
      provider === 'google'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
  };

  try {
    const result = await createUser(newUser);
    if (!result.created) {
      return res.status(409).json({
        status: 'error',
        code: 'ACCOUNT_ALREADY_REGISTERED',
        message: 'บัญชีนี้ลงทะเบียนในระบบแล้ว กรุณาเข้าสู่ระบบหรือติดต่อ Super Admin',
      });
    }
    let notificationSent = false;
    const nowStr = new Date().toLocaleString('th-TH');
    notificationSent = await sendServerTelegramNotification(
      `🔔 <b>[มีเจ้าหน้าที่ใหม่ลงทะเบียนเข้าใช้งาน]</b>\n\n` +
      `👤 <b>ชื่อ-นามสกุล:</b> ${escapeTelegramHtml(result.user.name)}\n` +
      `💼 <b>ตำแหน่ง:</b> ${escapeTelegramHtml(result.user.position)}\n` +
      `🏢 <b>กลุ่มงาน:</b> ${escapeTelegramHtml(result.user.workGroup)}\n` +
      `🏥 <b>สังกัด:</b> ${escapeTelegramHtml(result.user.affiliation)}\n` +
      `📞 <b>เบอร์โทร:</b> ${escapeTelegramHtml(result.user.phone)}\n` +
      `📧 <b>บัญชีใช้งาน:</b> ${escapeTelegramHtml(result.user.emailOrId)} (${result.user.provider.toUpperCase()})\n` +
      `⏳ <b>สถานะ:</b> รอ Super Admin ตรวจสอบและอนุมัติ\n\n` +
      `🗓️ <b>เวลาลงทะเบียน:</b> ${escapeTelegramHtml(nowStr)} น.`
    );

    return res.status(201).json({
      status: 'success',
      user: result.user,
      notificationSent,
      message: 'ลงทะเบียนสำเร็จ ข้อมูลถูกส่งให้ Super Admin ตรวจสอบแล้ว',
    });
  } catch (error) {
    console.error('Unable to register user', error);
    return res.status(503).json({
      status: 'error',
      code: 'USER_REGISTRATION_FAILED',
      message: error instanceof Error ? error.message : 'ไม่สามารถบันทึกการลงทะเบียนได้',
    });
  }
});

app.post('/api/users/approve', async (req, res) => {
  const { userId, emailOrId, status, role } = req.body || {};
  const validStatuses: UserStatus[] = ['pending', 'active', 'suspended', 'blocked'];
  const validRoles: UserRole[] = ['super_admin', 'admin', 'viewer', 'user'];
  if (
    (!userId && !emailOrId) ||
    (status && !validStatuses.includes(status)) ||
    (role && !validRoles.includes(role))
  ) {
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_USER_UPDATE',
      message: 'ข้อมูลสถานะหรือระดับสิทธิ์ไม่ถูกต้อง',
    });
  }

  try {
    const actor = await requireSuperAdmin(req, res);
    if (!actor) return;
    const targetBefore = (await listUsers()).find(
      (user) =>
        (userId && user.id === userId) ||
        (emailOrId &&
          user.emailOrId.toLocaleLowerCase('en-US') ===
            String(emailOrId).trim().toLocaleLowerCase('en-US'))
    );
    if (!targetBefore) {
      return res.status(404).json({ status: 'error', message: 'ไม่พบผู้ใช้งานในระบบ' });
    }

    const nowIso = new Date().toISOString();
    const result = await updateUser(
      { userId, emailOrId },
      {
        ...(status ? { status } : {}),
        ...(role ? { role } : {}),
        ...(status === 'active'
          ? {
              approvedBy: actor.emailOrId,
              approvedAt: nowIso,
            }
          : {}),
      }
    );

    if (status === 'active' && targetBefore.status !== 'active') {
      const nowStr = new Date().toLocaleString('th-TH');
      await sendServerTelegramNotification(
        `✅ <b>[อนุมัติสิทธิ์เจ้าหน้าที่แล้ว]</b>\n\n` +
        `👤 <b>ชื่อ-นามสกุล:</b> ${escapeTelegramHtml(result.user.name)}\n` +
        `💼 <b>ตำแหน่ง:</b> ${escapeTelegramHtml(result.user.position || '-')}\n` +
        `🏥 <b>สังกัด:</b> ${escapeTelegramHtml(result.user.affiliation || result.user.workGroup || '-')}\n` +
        `📧 <b>บัญชีใช้งาน:</b> ${escapeTelegramHtml(result.user.emailOrId)}\n` +
        `🟢 <b>สถานะใหม่:</b> อนุมัติให้เข้าใช้งานแล้ว\n` +
        `🛡️ <b>ผู้อนุมัติ:</b> ${escapeTelegramHtml(actor.name)}\n\n` +
        `🗓️ <b>เวลาอนุมัติ:</b> ${escapeTelegramHtml(nowStr)} น.`
      );
    }

    return res.json({
      status: 'success',
      users: result.users,
      user: result.user,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'USER_NOT_FOUND') {
      return res.status(404).json({ status: 'error', message: 'ไม่พบผู้ใช้งานในระบบ' });
    }
    if (code === 'OWNER_PROTECTED') {
      return res.status(409).json({ status: 'error', message: 'ไม่สามารถเปลี่ยนสิทธิ์บัญชีเจ้าของระบบได้' });
    }
    console.error('Unable to update user', error);
    return res.status(503).json({
      status: 'error',
      code: 'USER_UPDATE_FAILED',
      message: error instanceof Error ? error.message : 'ไม่สามารถบันทึกข้อมูลผู้ใช้ได้',
    });
  }
});

app.delete('/api/users/:userId', async (req, res) => {
  try {
    const actor = await requireSuperAdmin(req, res);
    if (!actor) return;
    const target = (await listUsers()).find((user) => user.id === req.params.userId);
    if (!target) {
      return res.status(404).json({ status: 'error', message: 'ไม่พบผู้ใช้งานในระบบ' });
    }
    const users = await deleteUser({ userId: req.params.userId });
    await sendServerTelegramNotification(
      `🗑️ <b>[ลบบัญชีผู้ใช้งานออกจากระบบ]</b>\n\n` +
      `👤 <b>บัญชีที่ลบ:</b> ${escapeTelegramHtml(target.name)}\n` +
      `📧 <b>ชื่อบัญชี:</b> ${escapeTelegramHtml(target.emailOrId)}\n` +
      `🛡️ <b>ดำเนินการโดย:</b> ${escapeTelegramHtml(actor.name)}\n\n` +
      `ℹ️ บัญชีนี้ถูกเพิกถอนสิทธิ์ทันที และต้องลงทะเบียนใหม่หากต้องการกลับมาใช้งาน`
    );
    return res.json({ status: 'success', users });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'OWNER_PROTECTED') {
      return res.status(409).json({ status: 'error', message: 'ไม่สามารถลบบัญชีเจ้าของระบบได้' });
    }
    console.error('Unable to delete user', error);
    return res.status(503).json({
      status: 'error',
      code: 'USER_DELETE_FAILED',
      message: error instanceof Error ? error.message : 'ไม่สามารถลบบัญชีได้',
    });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const session = readSession(req);
  if (!session) {
    return res.json({
      status: 'unauthenticated',
      user: null,
    });
  }

  try {
    const currentUser = await findUser(session.provider, session.emailOrId);
    if (!currentUser) {
      res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
      return res.status(401).json({
        status: 'unauthenticated',
        code: 'ACCOUNT_REMOVED',
        user: null,
      });
    }
    return res.json({
      status: 'success',
      user: {
        ...session,
        id: currentUser.id,
        displayName: currentUser.name,
        status: currentUser.status,
        role: currentUser.role,
        maskedIdentifier: maskIdentifier(currentUser.emailOrId),
      },
    });
  } catch (error) {
    console.error('Unable to verify session against user store', error);
    return res.status(503).json({
      status: 'error',
      code: 'USER_STORE_UNAVAILABLE',
      message: 'ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้งานได้ในขณะนี้',
    });
  }
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
