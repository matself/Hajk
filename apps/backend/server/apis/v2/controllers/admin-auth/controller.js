import log4js from "log4js";
import {
  isPasswordModeActive,
  verifyPassword,
  setAdminSessionCookie,
  clearAdminSessionCookie,
} from "../../utils/adminPassword.js";

const logger = log4js.getLogger("router.v2");

// Very small in-memory brute-force guard. Not meant to survive restarts or
// scale across multiple backend instances - this is a padlock, not a vault.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const attemptsByIp = new Map();

function isLockedOut(ip) {
  const entry = attemptsByIp.get(ip);
  if (!entry) return false;
  if (entry.count < MAX_ATTEMPTS) return false;
  if (Date.now() - entry.lastAttempt > LOCKOUT_MS) {
    attemptsByIp.delete(ip);
    return false;
  }
  return true;
}

function registerFailedAttempt(ip) {
  const entry = attemptsByIp.get(ip) ?? { count: 0, lastAttempt: 0 };
  entry.count += 1;
  entry.lastAttempt = Date.now();
  attemptsByIp.set(ip, entry);
}

function clearAttempts(ip) {
  attemptsByIp.delete(ip);
}

export default {
  async login(req, res) {
    if (!isPasswordModeActive()) {
      return res.sendStatus(404);
    }

    if (isLockedOut(req.ip)) {
      logger.warn(
        "Admin login blocked: too many failed attempts from %s.",
        req.ip
      );
      return res.sendStatus(429);
    }

    const password = req.body?.password;
    if (typeof password !== "string" || password.length === 0) {
      return res.sendStatus(400);
    }

    if (!verifyPassword(password, process.env.ADMIN_PASSWORD_HASH)) {
      registerFailedAttempt(req.ip);
      logger.warn("Failed admin login attempt from %s.", req.ip);
      return res.sendStatus(401);
    }

    clearAttempts(req.ip);
    setAdminSessionCookie(res);
    logger.info("Successful admin login from %s.", req.ip);
    res.sendStatus(200);
  },

  async logout(req, res) {
    clearAdminSessionCookie(res);
    res.sendStatus(200);
  },
};
