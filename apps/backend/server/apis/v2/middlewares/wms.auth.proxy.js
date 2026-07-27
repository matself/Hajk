import { createProxyMiddleware } from "http-proxy-middleware";
import fs from "fs";
import path from "path";
import log4js from "log4js";

// Grab a logger
const logger = log4js.getLogger("proxy.wmsAuth.v2");

// The public path under which this proxy is mounted (per API version this
// becomes e.g. /api/v2/wmsproxy). The first path segment after the mount
// point is the Hajk layer id.
export const WMS_AUTH_PROXY_PATH = "wmsproxy";

// In-memory index: layerId -> { origin, authHeader }. Reading (and parsing)
// layers.json on every single request would be far too expensive, so we
// cache the result and only reload when the file's mtime changes (which happens
// whenever an admin saves layers via the GUI).
let index = null;
let indexMtimeMs = -1;

function layersFilePath() {
  return path.join(process.cwd(), "App_Data", "layers.json");
}

/**
 * Build an Authorization header value from a layer's `auth` config.
 * Supports Basic (username/password) and Bearer (token). Returns null when
 * there is nothing usable, in which case the layer is simply not proxied.
 *
 * @param {object} auth
 * @returns {string|null}
 */
function buildAuthHeader(auth) {
  if (!auth || typeof auth !== "object") return null;
  const type = (auth.type || "basic").toLowerCase();

  if (type === "basic" && auth.username) {
    const raw = `${auth.username}:${auth.password ?? ""}`;
    return `Basic ${Buffer.from(raw).toString("base64")}`;
  }

  if (type === "bearer" && auth.token) {
    return `Bearer ${auth.token}`;
  }

  return null;
}

/**
 * Return the layerId -> { origin, authHeader } index, rebuilding it from
 * layers.json when the file has changed since last read.
 *
 * @returns {Map<string, {origin: string, authHeader: string}>}
 */
function getIndex() {
  const p = layersFilePath();

  let stat;
  try {
    stat = fs.statSync(p);
  } catch (error) {
    logger.error("Could not stat layers.json for WMS auth proxy:", error);
    return index || new Map();
  }

  // Serve from cache if the file hasn't changed
  if (index && stat.mtimeMs === indexMtimeMs) {
    return index;
  }

  try {
    const json = JSON.parse(fs.readFileSync(p, "utf-8"));
    const map = new Map();

    for (const layer of json.wmslayers || []) {
      const authHeader = buildAuthHeader(layer.auth);
      if (!authHeader || !layer.url) continue;

      let origin;
      try {
        origin = new URL(layer.url).origin;
      } catch {
        logger.warn(
          "Skipping WMS layer %o in auth proxy: invalid url %o",
          layer.id,
          layer.url
        );
        continue;
      }

      map.set(String(layer.id), { origin, authHeader });
    }

    index = map;
    indexMtimeMs = stat.mtimeMs;
    logger.debug(
      "Rebuilt WMS auth proxy index with %d authenticated layer(s).",
      map.size
    );
  } catch (error) {
    logger.error("Failed to build WMS auth proxy index:", error);
    if (!index) index = new Map();
  }

  return index;
}

/**
 * Extract the layer id from a proxied request. We read `req.originalUrl`
 * (…/wmsproxy/<layerId>/<upstreamPath…>) rather than `req.url`, because by the
 * time the `proxyReq` hook runs, `pathRewrite` has already stripped the id
 * segment off `req.url`. `originalUrl` stays stable across the whole pipeline.
 *
 * @param {import("http").IncomingMessage & {originalUrl?: string}} req
 * @returns {string|null}
 */
function layerIdFromReq(req) {
  const url = req.originalUrl || req.url || "";
  const match = url.match(/\/wmsproxy\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * @summary Proxy WMS image requests to an upstream service that requires
 * authentication, injecting the credentials server-side.
 *
 * @description Credentials live in App_Data/layers.json (never sent to the
 * browser). The client requests images from /api/v{version}/wmsproxy/<layerId>/…
 * same-origin, so images load as ordinary <img> tags. This middleware looks up
 * the layer by id, forwards the request to the real service and attaches the
 * proper Authorization header — mirroring the pattern in fme.server.proxy.js.
 *
 * @returns Express middleware
 */
export default function wmsAuthProxy() {
  return createProxyMiddleware({
    changeOrigin: true,
    logger,
    // Dynamically pick the upstream origin based on the requested layer id.
    router: (req) => {
      const id = layerIdFromReq(req);
      const entry = id && getIndex().get(id);
      return entry ? entry.origin : undefined;
    },
    // Drop the leading /<layerId> segment; everything after it is the real
    // upstream path (including the WMS query parameters),
    // which we forward verbatim onto the upstream origin.
    pathRewrite: (p) => p.replace(/^\/[^/?]+/, ""),
    on: {
      proxyReq: (proxyReq, req) => {
        const id = layerIdFromReq(req);
        const entry = id && getIndex().get(id);
        if (entry) {
          proxyReq.setHeader("Authorization", entry.authHeader);
        }
        // Never forward the Hajk session cookie to the external provider.
        proxyReq.removeHeader("cookie");
      },
      proxyRes: (proxyRes) => {
        // Allow the images to be used cross-origin (e.g. client dev server on a
        // different port than the backend). In production, where the client is
        // served same-origin behind a reverse proxy, this is a no-op.
        proxyRes.headers["access-control-allow-origin"] = "*";
      },
      error: (err, req, res) => {
        logger.error(err);
        if (res && !res.headersSent && typeof res.status === "function") {
          res.status(502).send("WMS auth proxy: upstream request failed.");
        }
      },
    },
  });
}
