import crypto from "node:crypto";

const COOKIE_NAME = "hajk_admin_session";
const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours
const SCRYPT_KEYLEN = 64;

/**
 * @summary Hash a plaintext password for storage in ADMIN_PASSWORD_HASH.
 * @description Used by the hash-admin-password CLI script, not at request time.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt}:${key.toString("hex")}`;
}

/**
 * @summary Compare a plaintext password against a stored "salt:hash" string.
 */
export function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.includes(":")) {
    return false;
  }
  const [salt, keyHex] = storedHash.split(":");
  const expectedKey = Buffer.from(keyHex, "hex");
  const actualKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  // Guard against timingSafeEqual throwing on length mismatch (e.g. corrupt hash in .env)
  if (expectedKey.length !== actualKey.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedKey, actualKey);
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  const secret = process.env.SESSION_SECRET || "";
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

/**
 * @summary Create a signed, self-contained session token (no server-side session store).
 */
export function createSessionToken() {
  const payload = base64url(
    JSON.stringify({ exp: Date.now() + SESSION_MAX_AGE_MS })
  );
  return `${payload}.${sign(payload)}`;
}

/**
 * @summary Verify a session token's signature and expiry.
 */
export function verifySessionToken(token) {
  if (typeof token !== "string" || !token.includes(".")) {
    return false;
  }
  const [payload, signature] = token.split(".");
  const expectedSignature = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return false;
  }
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * @summary Read and verify the admin session cookie from a raw Cookie header.
 * @description Parsed manually (rather than via req.cookies) so this doesn't depend
 * on cookie-parser having already run for the current request.
 */
export function hasValidAdminSession(req) {
  const header = req.headers?.cookie;
  if (!header) return false;
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!match) return false;
  const token = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  return verifySessionToken(token);
}

export function setAdminSessionCookie(res) {
  res.cookie(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });
}

export function clearAdminSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function isPasswordModeActive() {
  return (
    process.env.AD_LOOKUP_ACTIVE !== "true" && !!process.env.ADMIN_PASSWORD_HASH
  );
}

export { COOKIE_NAME, SESSION_MAX_AGE_MS };
