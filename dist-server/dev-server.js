// dev-server.ts
import path from "node:path";
import express2 from "express";
import { createServer as createViteServer } from "vite";

// src/server/app.ts
import express from "express";

// src/server/auth.ts
import crypto from "node:crypto";
function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }
  return secret;
}
function secureEquals(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
function isJwtConfigured() {
  return Boolean(process.env.JWT_SECRET?.trim());
}
function signAdminToken(payload, expiresInHours = 8) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1e3);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInHours * 3600
  };
  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getJwtSecret()).update(`${b64Header}.${b64Payload}`).digest("base64url");
  return `${b64Header}.${b64Payload}.${signature}`;
}
function verifyAdminToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [b64Header, b64Payload, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", getJwtSecret()).update(`${b64Header}.${b64Payload}`).digest("base64url");
    if (!secureEquals(signature, expectedSignature)) return null;
    const payload = JSON.parse(
      Buffer.from(b64Payload, "base64url").toString("utf-8")
    );
    const now = Math.floor(Date.now() / 1e3);
    if (payload.exp && now >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
function generateCsrfState() {
  return crypto.randomBytes(24).toString("hex");
}
function createSignedOauthState(provider, state) {
  const signature = crypto.createHmac("sha256", getJwtSecret()).update(`oauth:${provider}:${state}`).digest("base64url");
  return `${state}.${signature}`;
}
function verifySignedOauthState(provider, state, signedState) {
  if (!signedState) return false;
  return secureEquals(createSignedOauthState(provider, state), signedState);
}
function maskIdentifier(identifier) {
  if (!identifier) return "";
  if (identifier.includes("@")) {
    const [name, domain] = identifier.split("@");
    if (name.length <= 2) return `${name.charAt(0)}*@${domain}`;
    const maskedName = `${name.slice(0, 2)}${"*".repeat(
      Math.min(name.length - 3, 5)
    )}${name.slice(-1)}`;
    return `${maskedName}@${domain}`;
  }
  if (identifier.length <= 4) return `${identifier.charAt(0)}***`;
  return `${identifier.slice(0, 3)}***${identifier.slice(-2)}`;
}

// src/server/app.ts
var app = express();
var SESSION_COOKIE = "satun_admin_token";
var OAUTH_COOKIE_MAX_AGE = 10 * 60 * 1e3;
var SESSION_MAX_AGE = 8 * 60 * 60 * 1e3;
app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
function isProduction() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}
function envValue(name) {
  const value = process.env[name]?.trim();
  return value || void 0;
}
function csvEnv(name) {
  return (process.env[name] || "").split(",").map((value) => value.trim()).filter(Boolean);
}
function parseCookies(req) {
  const cookies = {};
  for (const item of (req.headers.cookie || "").split(";")) {
    const separator = item.indexOf("=");
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
function providerConfig(provider) {
  if (provider === "google") {
    const clientId2 = envValue("GOOGLE_CLIENT_ID");
    const clientSecret2 = envValue("GOOGLE_CLIENT_SECRET");
    if (!clientId2 || !clientSecret2) return null;
    return {
      clientId: clientId2,
      clientSecret: clientSecret2,
      redirectUri: envValue("GOOGLE_REDIRECT_URI") || "https://rdu-clinics-satun.vercel.app/api/auth/google/callback"
    };
  }
  const clientId = envValue("LINE_CHANNEL_ID");
  const clientSecret = envValue("LINE_CHANNEL_SECRET");
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: envValue("LINE_REDIRECT_URI") || "https://rdu-clinics-satun.vercel.app/api/auth/line/callback"
  };
}
function oauthCookieName(provider) {
  return `satun_oauth_${provider}_state`;
}
function oauthCookieOptions(provider) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: `/api/auth/${provider}/callback`
  };
}
function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/"
  };
}
function setOauthStateCookie(res, provider, state) {
  res.cookie(oauthCookieName(provider), createSignedOauthState(provider, state), {
    ...oauthCookieOptions(provider),
    maxAge: OAUTH_COOKIE_MAX_AGE
  });
}
function clearOauthStateCookie(res, provider) {
  res.clearCookie(oauthCookieName(provider), oauthCookieOptions(provider));
}
function validateOauthState(req, provider, state) {
  if (typeof state !== "string") return false;
  const signedState = parseCookies(req)[oauthCookieName(provider)];
  return verifySignedOauthState(provider, state, signedState);
}
function redirectToLogin(res, status, provider) {
  const params = new URLSearchParams({ auth: status });
  if (provider) params.set("provider", provider);
  return res.redirect(`/admin/login?${params.toString()}`);
}
function findGoogleAdmin(email, displayName) {
  const normalizedEmail = email.toLowerCase();
  const builtIn = [
    {
      id: "usr_super_admin",
      emailOrId: "akaporn1234@gmail.com",
      provider: "google",
      role: "super_admin",
      status: "active",
      name: "Akaporn (Super Admin)"
    },
    {
      id: "usr_admin_1",
      emailOrId: "satun.rdu.admin@gmail.com",
      provider: "google",
      role: "admin",
      status: "active",
      name: "\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E40\u0E20\u0E2A\u0E31\u0E0A\u0E01\u0E23\u0E23\u0E21 \u0E2A\u0E2A\u0E08.\u0E2A\u0E15\u0E39\u0E25"
    }
  ];
  const builtInMatch = builtIn.find(
    (record) => record.emailOrId.toLowerCase() === normalizedEmail
  );
  if (builtInMatch) return builtInMatch;
  const superAdminEmails = csvEnv("SUPER_ADMIN_GOOGLE_EMAILS").map(
    (value) => value.toLowerCase()
  );
  const adminEmails = csvEnv("ADMIN_GOOGLE_EMAILS").map(
    (value) => value.toLowerCase()
  );
  if (superAdminEmails.includes(normalizedEmail)) {
    return {
      id: `usr_g_${normalizedEmail}`,
      emailOrId: normalizedEmail,
      provider: "google",
      role: "super_admin",
      status: "active",
      name: displayName || normalizedEmail
    };
  }
  if (adminEmails.includes(normalizedEmail)) {
    return {
      id: `usr_g_${normalizedEmail}`,
      emailOrId: normalizedEmail,
      provider: "google",
      role: "admin",
      status: "active",
      name: displayName || normalizedEmail
    };
  }
  return null;
}
function findLineAdmin(userId, displayName) {
  const superAdminIds = csvEnv("SUPER_ADMIN_LINE_USER_IDS");
  const adminIds = csvEnv("ADMIN_LINE_USER_IDS");
  if (superAdminIds.includes(userId)) {
    return {
      id: `usr_l_${userId}`,
      emailOrId: userId,
      provider: "line",
      role: "super_admin",
      status: "active",
      name: displayName || "LINE Super Admin"
    };
  }
  if (adminIds.includes(userId)) {
    return {
      id: `usr_l_${userId}`,
      emailOrId: userId,
      provider: "line",
      role: "admin",
      status: "active",
      name: displayName || "LINE Admin"
    };
  }
  return null;
}
function pendingRecord(provider, identifier, displayName) {
  return {
    id: `pending_${provider}_${identifier}`,
    emailOrId: identifier,
    provider,
    role: "viewer",
    status: "pending",
    name: displayName || "\u0E1C\u0E39\u0E49\u0E02\u0E2D\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"
  };
}
function issueSession(res, record) {
  const token = signAdminToken(
    {
      id: record.id,
      emailOrId: record.emailOrId,
      displayName: record.name,
      provider: record.provider,
      role: record.role,
      status: record.status
    },
    8
  );
  res.cookie(SESSION_COOKIE, token, {
    ...sessionCookieOptions(),
    maxAge: SESSION_MAX_AGE
  });
}
function readSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE] || req.headers.authorization?.replace(/^Bearer\s+/i, "");
  return token ? verifyAdminToken(token) : null;
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "RDU Clinics Satun OAuth Server",
    version: "2.0.0",
    oauth: {
      google: { configured: Boolean(providerConfig("google")) },
      line: { configured: Boolean(providerConfig("line")) },
      session: { configured: isJwtConfigured() }
    }
  });
});
app.get("/api/auth/google", (_req, res) => {
  const config = providerConfig("google");
  if (!config || !isJwtConfigured()) {
    return redirectToLogin(res, "configuration_error", "google");
  }
  const state = generateCsrfState();
  setOauthStateCookie(res, "google", state);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");
  return res.redirect(authUrl.toString());
});
app.get("/api/auth/google/callback", async (req, res) => {
  const config = providerConfig("google");
  const { code, state, error } = req.query;
  if (error || typeof code !== "string") {
    clearOauthStateCookie(res, "google");
    return redirectToLogin(res, "cancelled", "google");
  }
  if (!config || !isJwtConfigured()) {
    clearOauthStateCookie(res, "google");
    return redirectToLogin(res, "configuration_error", "google");
  }
  if (!validateOauthState(req, "google", state)) {
    clearOauthStateCookie(res, "google");
    return redirectToLogin(res, "state_error", "google");
  }
  clearOauthStateCookie(res, "google");
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code"
      })
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error || "google_token_exchange_failed");
    }
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const user = await userResponse.json();
    const email = user.email?.trim().toLowerCase();
    if (!userResponse.ok || !email || user.verified_email === false) {
      throw new Error("google_verified_email_missing");
    }
    const record = findGoogleAdmin(email, user.name || email) || pendingRecord("google", email, user.name || email);
    issueSession(res, record);
    return redirectToLogin(
      res,
      record.status === "active" ? "success" : "pending",
      "google"
    );
  } catch (error2) {
    console.error("Google OAuth callback failed", error2);
    return redirectToLogin(res, "provider_error", "google");
  }
});
app.get("/api/auth/line", (_req, res) => {
  const config = providerConfig("line");
  if (!config || !isJwtConfigured()) {
    return redirectToLogin(res, "configuration_error", "line");
  }
  const state = generateCsrfState();
  setOauthStateCookie(res, "line", state);
  const authUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "profile openid");
  return res.redirect(authUrl.toString());
});
app.get("/api/auth/line/callback", async (req, res) => {
  const config = providerConfig("line");
  const { code, state, error } = req.query;
  if (error || typeof code !== "string") {
    clearOauthStateCookie(res, "line");
    return redirectToLogin(res, "cancelled", "line");
  }
  if (!config || !isJwtConfigured()) {
    clearOauthStateCookie(res, "line");
    return redirectToLogin(res, "configuration_error", "line");
  }
  if (!validateOauthState(req, "line", state)) {
    clearOauthStateCookie(res, "line");
    return redirectToLogin(res, "state_error", "line");
  }
  clearOauthStateCookie(res, "line");
  try {
    const tokenResponse = await fetch(
      "https://api.line.me/oauth2/v2.1/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret
        })
      }
    );
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error || "line_token_exchange_failed");
    }
    const userResponse = await fetch(
      "https://api.line.me/oauth2/v2.1/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const user = await userResponse.json();
    const userId = user.sub?.trim();
    if (!userResponse.ok || !userId) {
      throw new Error("line_user_id_missing");
    }
    const record = findLineAdmin(userId, user.name || "LINE User") || pendingRecord("line", userId, user.name || "LINE User");
    issueSession(res, record);
    return redirectToLogin(
      res,
      record.status === "active" ? "success" : "pending",
      "line"
    );
  } catch (error2) {
    console.error("LINE OAuth callback failed", error2);
    return redirectToLogin(res, "provider_error", "line");
  }
});
app.get("/api/auth/me", (req, res) => {
  const user = readSession(req);
  if (!user) {
    return res.json({
      status: "unauthenticated",
      user: null
    });
  }
  return res.json({
    status: "success",
    user: {
      ...user,
      maskedIdentifier: maskIdentifier(user.emailOrId)
    }
  });
});
app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  return res.json({ status: "success", message: "\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" });
});
app.use("/api", (error, _req, res, _next) => {
  console.error("Unhandled API error", error);
  res.status(500).json({
    status: "error",
    code: "INTERNAL_ERROR",
    message: "\u0E23\u0E30\u0E1A\u0E1A\u0E02\u0E31\u0E14\u0E02\u0E49\u0E2D\u0E07\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
  });
});
var app_default = app;

// dev-server.ts
var port = Number(process.env.PORT || 3e3);
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app_default.use(express2.static(distPath));
    app_default.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app_default.use(vite.middlewares);
  }
  app_default.listen(port, "0.0.0.0", () => {
    console.log(`RDU Clinics Satun running at http://localhost:${port}`);
  });
}
startServer().catch((error) => {
  console.error("Unable to start local server", error);
  process.exitCode = 1;
});
//# sourceMappingURL=dev-server.js.map
