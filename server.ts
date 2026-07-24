import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  signAdminToken,
  verifyAdminToken,
  generateCsrfStateToken,
  verifyCsrfStateToken,
  maskIdentifier,
  AdminJwtPayload,
} from './src/server/auth.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- OAuth Environment Configuration ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID || '';
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';

/**
 * Dynamic Callback Origin Detection
 * ตรวจสอบ Protocol และ Host จาก Request Headers แบบไดนามิก
 * รองรับทั้ง Vercel Production, AI Studio Cloud Run Preview, และ Localhost
 */
function getCallbackUrl(req: Request, provider: 'google' | 'line'): string {
  const envUri = provider === 'google' ? process.env.GOOGLE_REDIRECT_URI : process.env.LINE_REDIRECT_URI;
  if (envUri && envUri.trim().length > 0) {
    return envUri.trim();
  }

  const proto = (req.headers['x-forwarded-proto'] as string) || (req.socket && (req.socket as any).encrypted ? 'https' : 'http');
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'rdu-clinics-satun.vercel.app';
  return `${proto}://${host}/api/auth/${provider}/callback`;
}

// รายชื่อผู้ได้รับการแต่งตั้งเป็น Admin & User Status Database
const ALLOWED_ADMINS: Array<{
  id: string;
  emailOrId: string;
  provider: 'google' | 'line';
  role: 'super_admin' | 'admin' | 'viewer';
  status: 'active' | 'pending' | 'suspended';
  name: string;
}> = [
  { id: 'usr_super_admin', emailOrId: 'akaporn1234@gmail.com', provider: 'google', role: 'super_admin', status: 'active', name: 'Akaporn (Super Admin)' },
  { id: 'usr_admin_1', emailOrId: 'satun.rdu.admin@gmail.com', provider: 'google', role: 'admin', status: 'active', name: 'เจ้าหน้าที่กลุ่มงานเภสัชกรรม สสจ.สตูล' },
  { id: 'usr_line_admin', emailOrId: 'satun_rdu_line', provider: 'line', role: 'admin', status: 'active', name: 'แอดมิน LINE สสจ.สตูล' },
];

// Helper: อ่าน Cookie
function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
      }
    });
  }
  return list;
}

// --- Middleware ตรวจสอบสิทธิ์ Admin (JWT + Role Authorization) ---
function requireAdminRole(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookies(req);
  const token = cookies.satun_admin_token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'ไม่พบ Token การเข้าถึง กรุณาเข้าสู่ระบบด้วย Google หรือ LINE',
    });
  }

  const decoded = verifyAdminToken(token);
  if (!decoded) {
    return res.status(401).json({
      status: 'error',
      code: 'SESSION_EXPIRED',
      message: 'Session หมดอายุ หรือ Token ไม่ถูกต้อง กรุณาล็อกอินใหม่',
    });
  }

  if (decoded.status === 'pending') {
    return res.status(403).json({
      status: 'error',
      code: 'PENDING_APPROVAL',
      message: 'บัญชีของคุณกำลังรอการตรวจสอบอนุมัติสิทธิ์จาก Super Admin',
      user: decoded,
    });
  }

  if (decoded.status === 'suspended') {
    return res.status(403).json({
      status: 'error',
      code: 'ACCOUNT_SUSPENDED',
      message: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
      user: decoded,
    });
  }

  if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
    return res.status(403).json({
      status: 'error',
      code: 'ACCESS_DENIED',
      message: 'ปฏิเสธการเข้าถึง! บัญชีนี้ไม่มีสิทธิ์ระดับผู้ดูแลระบบ (Admin Only)',
      user: decoded,
    });
  }

  (req as any).user = decoded;
  next();
}

// --- API ROUTES ---

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'RDU Clinics Satun OAuth Server 2569', version: '1.0.0' });
});

// 2. Google OAuth Initialization Route
app.get('/api/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).send('Google OAuth Client credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not configured in environment variables.');
  }
  const state = generateCsrfStateToken('google');
  const redirectUri = getCallbackUrl(req, 'google');

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('prompt', 'select_account');

  res.redirect(googleAuthUrl.toString());
});

// 3. Google OAuth Callback Route
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code) {
    return res.status(400).send('Google Login Cancelled or Failed.');
  }

  if (!state || !verifyCsrfStateToken(state as string, 'google')) {
    return res.status(403).send('CSRF State Mismatch Failure (Security Error).');
  }

  const redirectUri = getCallbackUrl(req, 'google');

  try {
    // แลก เปลี่ยน Code เป็น Access Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || 'Failed to obtain Google access token');
    }

    // ดึงข้อมูลผู้ใช้จาก Google UserInfo API
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json();
    const userEmail = googleUser.email?.toLowerCase();

    // ตรวจสอบสิทธิ์ในตารางผู้ใช้ (OWASP Authorization & RBAC Check)
    let userMatch = ALLOWED_ADMINS.find(
      (a) => a.provider === 'google' && a.emailOrId.toLowerCase() === userEmail
    );

    // Auto-registration on first login if not found
    if (!userMatch) {
      userMatch = {
        id: `usr_g_${googleUser.id || Date.now()}`,
        emailOrId: userEmail,
        provider: 'google',
        role: 'viewer',
        status: 'pending',
        name: googleUser.name || userEmail.split('@')[0],
      };
      ALLOWED_ADMINS.push(userMatch);
    }

    if (userMatch.status === 'suspended') {
      return res.redirect('/admin/login?auth=suspended');
    }

    if (userMatch.status === 'pending') {
      const pendingJwt = signAdminToken({
        id: userMatch.id,
        emailOrId: userEmail,
        displayName: userMatch.name,
        provider: 'google',
        role: 'viewer',
        status: 'pending',
      }, 8);

      res.cookie('satun_admin_token', pendingJwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 3600 * 1000,
        path: '/',
      });

      return res.redirect('/admin/login?auth=pending');
    }

    // Active Admin / Super Admin
    const jwtToken = signAdminToken({
      id: userMatch.id,
      emailOrId: userEmail,
      displayName: userMatch.name,
      provider: 'google',
      role: userMatch.role,
      status: userMatch.status,
    }, 8);

    res.cookie('satun_admin_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 3600 * 1000,
      path: '/',
    });

    res.redirect('/admin/login?auth=success');
  } catch (err: any) {
    res.status(500).send(`Authentication Exception: ${err.message}`);
  }
});

// 4. LINE Login Initialization Route
app.get('/api/auth/line', (req, res) => {
  if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET) {
    return res.status(500).send('LINE OAuth credentials (LINE_CHANNEL_ID / LINE_CHANNEL_SECRET) are not configured in environment variables.');
  }
  const state = generateCsrfStateToken('line');
  const redirectUri = getCallbackUrl(req, 'line');

  const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  lineAuthUrl.searchParams.set('response_type', 'code');
  lineAuthUrl.searchParams.set('client_id', LINE_CHANNEL_ID);
  lineAuthUrl.searchParams.set('redirect_uri', redirectUri);
  lineAuthUrl.searchParams.set('state', state);
  lineAuthUrl.searchParams.set('scope', 'profile openid email');

  res.redirect(lineAuthUrl.toString());
});

// 5. LINE Login Callback Route
app.get('/api/auth/line/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code) {
    return res.status(400).send('LINE Login Cancelled or Failed.');
  }

  if (!state || !verifyCsrfStateToken(state as string, 'line')) {
    return res.status(403).send('CSRF State Mismatch Failure (Security Error).');
  }

  const redirectUri = getCallbackUrl(req, 'line');

  try {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || 'Failed to obtain LINE access token');
    }

    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const lineProfile = await profileRes.json();
    const lineUserId = lineProfile.userId;

    let userMatch = ALLOWED_ADMINS.find(
      (a) => a.provider === 'line' && (a.emailOrId === lineUserId || a.emailOrId === 'satun_rdu_line')
    );

    // Auto-registration on first login
    if (!userMatch) {
      userMatch = {
        id: `usr_l_${lineUserId}`,
        emailOrId: lineUserId,
        provider: 'line',
        role: 'viewer',
        status: 'pending',
        name: lineProfile.displayName || 'ผู้สมัครใช้งาน LINE',
      };
      ALLOWED_ADMINS.push(userMatch);
    }

    if (userMatch.status === 'suspended') {
      return res.redirect('/admin/login?auth=suspended');
    }

    if (userMatch.status === 'pending') {
      const pendingJwt = signAdminToken({
        id: userMatch.id,
        emailOrId: lineUserId,
        displayName: userMatch.name,
        provider: 'line',
        role: 'viewer',
        status: 'pending',
      }, 8);

      res.cookie('satun_admin_token', pendingJwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 3600 * 1000,
        path: '/',
      });

      return res.redirect('/admin/login?auth=pending');
    }

    const jwtToken = signAdminToken({
      id: userMatch.id,
      emailOrId: lineUserId,
      displayName: userMatch.name,
      provider: 'line',
      role: userMatch.role,
      status: userMatch.status,
    }, 8);

    res.cookie('satun_admin_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 3600 * 1000,
      path: '/',
    });

    res.redirect('/admin/login?auth=success');
  } catch (err: any) {
    res.status(500).send(`LINE Login Exception: ${err.message}`);
  }
});

// 6. Check Auth Status (Protected)
app.get('/api/auth/me', requireAdminRole, (req, res) => {
  const user = (req as any).user as AdminJwtPayload;
  res.json({
    status: 'success',
    user: {
      ...user,
      maskedIdentifier: maskIdentifier(user.emailOrId),
    },
  });
});

// 7. Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('satun_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  res.json({ status: 'success', message: 'ออกจากระบบสำเร็จ' });
});

export default app;

// --- VITE / STATIC SERVING HANDLER ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer();
}
