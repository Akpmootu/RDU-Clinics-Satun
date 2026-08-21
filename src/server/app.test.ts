import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import http from 'node:http';
import { after, before, test } from 'node:test';
import app from './app.js';
import { signAdminToken } from './auth.js';
import { USER_HEADERS, userToRow } from './userRepository.js';

const owner = {
  id: 'usr_super_admin',
  emailOrId: 'akaporn1234@gmail.com',
  name: 'System Owner',
  provider: 'google' as const,
  role: 'super_admin' as const,
  status: 'active' as const,
  createdAt: '2026-01-01 09:00',
};

const pending = {
  id: 'usr_google_pending',
  emailOrId: 'pending@example.com',
  name: 'Pending User',
  provider: 'google' as const,
  role: 'admin' as const,
  status: 'pending' as const,
  createdAt: '2026-07-27 10:00',
};

let server: http.Server;
let port = 0;
let originalFetch: typeof fetch;

function request(
  path: string,
  cookie?: string,
  method = 'GET',
  body?: unknown
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            body: JSON.parse(body),
            headers: res.headers,
          });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

before(async () => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-api-tests';
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.iam.gserviceaccount.com';
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://oauth2.googleapis.com/token') {
      return Response.json({ access_token: 'test-access-token' });
    }
    if (url.includes('?fields=sheets.properties')) {
      return Response.json({
        sheets: [{ properties: { sheetId: 123, title: 'SystemUsers' } }],
      });
    }
    if (url.includes('/values/') && init?.method === 'PUT') {
      return Response.json({ updatedRows: 1 });
    }
    if (url.includes('/values/') && (!init?.method || init.method === 'GET')) {
      return Response.json({
        values: [
          [...USER_HEADERS],
          userToRow(owner),
          userToRow(pending),
        ],
      });
    }
    throw new Error(`Unexpected fetch in API test: ${init?.method || 'GET'} ${url}`);
  };

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      port = typeof address === 'object' && address ? address.port : 0;
      resolve();
    });
  });
});

after(async () => {
  globalThis.fetch = originalFetch;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('user list rejects unauthenticated requests', async () => {
  const response = await request('/api/users');
  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'AUTH_REQUIRED');
});

test('clinic mutations reject unauthenticated requests', async () => {
  const createResponse = await request('/api/clinics', undefined, 'POST', {});
  const updateResponse = await request('/api/clinics/STN-001', undefined, 'PATCH', {});
  const deleteResponse = await request('/api/clinics/STN-001', undefined, 'DELETE');
  for (const response of [createResponse, updateResponse, deleteResponse]) {
    assert.equal(response.status, 401);
    assert.equal(response.body.code, 'AUTH_REQUIRED');
  }
});

test('pending users cannot access Super Admin APIs even with a valid old token', async () => {
  const token = signAdminToken({
    id: pending.id,
    emailOrId: pending.emailOrId,
    displayName: pending.name,
    provider: pending.provider,
    role: 'super_admin',
    status: 'active',
  });
  const response = await request('/api/users', `satun_admin_token=${token}`);
  assert.equal(response.status, 403);
  assert.equal(response.body.code, 'SUPER_ADMIN_REQUIRED');
});

test('active Super Admin can read the persistent user list', async () => {
  const token = signAdminToken({
    id: owner.id,
    emailOrId: owner.emailOrId,
    displayName: owner.name,
    provider: owner.provider,
    role: owner.role,
    status: owner.status,
  });
  const response = await request('/api/users', `satun_admin_token=${token}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.users.length, 2);
});

test('a deleted account is logged out even when its JWT is still valid', async () => {
  const token = signAdminToken({
    id: 'usr_removed',
    emailOrId: 'removed@example.com',
    displayName: 'Removed User',
    provider: 'google',
    role: 'super_admin',
    status: 'active',
  });
  const response = await request('/api/auth/me', `satun_admin_token=${token}`);
  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'ACCOUNT_REMOVED');
  assert.match(String(response.headers['set-cookie']), /satun_admin_token=/);
});
