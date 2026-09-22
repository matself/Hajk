import { createProxyMiddleware } from "http-proxy-middleware";
import fs from "fs";
import path from "path";
import log4js from "log4js";

// Grab a logger
const logger = log4js.getLogger("proxy.search.v2");

// The public path under which this proxy is mounted (per API version this
// becomes e.g. /api/v2/searchproxy). The client's Search tool is configured
// with appConfig.searchProxy set to this URL (see appConfig.json), and
// SearchModel builds every WFS request as `searchProxy + searchSource.url`
// (a plain string prefix, not a template) - so the full upstream URL, "?"
// and all, ends up embedded verbatim as the remainder of this middleware's
// path. That's what lets this work with zero changes to the shared client
// runtime: the concatenation trick already existed, this just gives it
// somewhere real to point.
export const SEARCH_PROXY_PATH = "searchproxy";

// In-memory whitelist of upstream URLs this proxy is allowed to forward to -
// the `url` of every configured wfslayer, plus the effective search URL of
// every WMS sublayer carrying its own search config (both are equally
// valid söklager, see searchSource.js on the admin side). Rebuilt whenever
// layers.json's mtime changes. This is the SSRF guard: the target URL is
// read from the request path (attacker-controlled in principle, since it's
// just a browser request), so it is only ever forwarded when it exactly
// matches a URL an admin already put in the layer store - never an
// arbitrary caller-supplied host.
let allowedUrls = null;
let indexMtimeMs = -1;

function layersFilePath() {
  return path.join(process.cwd(), "App_Data", "layers.json");
}

// A URL configured with a trailing "?" and no actual query params (a common
// style in layers.json, meant to make appending "&foo=bar" safe) arrives on
// the wire without it: an HTTP request line never carries a "?" with an
// empty query string, so `req.originalUrl` reflects the URL with that
// trailing "?" already stripped. Normalize both sides the same way before
// comparing, or every such source fails the whitelist check.
function stripTrailingQuestionMark(url) {
  return url.endsWith("?") ? url.slice(0, -1) : url;
}

/**
 * Return the Set of upstream URLs this proxy may forward to, rebuilding it
 * from layers.json when the file has changed since last read.
 *
 * @returns {Set<string>}
 */
function getAllowedUrls() {
  const p = layersFilePath();

  let stat;
  try {
    stat = fs.statSync(p);
  } catch (error) {
    logger.error("Could not stat layers.json for search proxy:", error);
    return allowedUrls || new Set();
  }

  if (allowedUrls && stat.mtimeMs === indexMtimeMs) {
    return allowedUrls;
  }

  try {
    const json = JSON.parse(fs.readFileSync(p, "utf-8"));
    const set = new Set();

    for (const layer of json.wfslayers || []) {
      if (layer.url) set.add(stripTrailingQuestionMark(layer.url));
    }

    // A WMS sublayer's own search config is an equally first-class söklager
    // (see searchSource.js#fromWmsSublayer on the admin side, and
    // configTranslator.js#buildSearchSources on the client, which merges
    // both kinds into one source list). Its effective search URL is
    // `sublayer.searchUrl || wmsLayer.url` - same fallback as those two -
    // and it needs to be proxyable too, or every such source silently
    // breaks the moment appConfig.json's searchProxy is turned on.
    for (const wmsLayer of json.wmslayers || []) {
      for (const sublayer of wmsLayer.layersInfo || []) {
        const isSearchSource =
          sublayer.searchUrl || sublayer.searchPropertyName;
        const url = sublayer.searchUrl || wmsLayer.url;
        if (isSearchSource && url) set.add(stripTrailingQuestionMark(url));
      }
    }

    allowedUrls = set;
    indexMtimeMs = stat.mtimeMs;
    logger.debug("Rebuilt search proxy whitelist with %d url(s).", set.size);
  } catch (error) {
    logger.error("Failed to build search proxy whitelist:", error);
    if (!allowedUrls) allowedUrls = new Set();
  }

  return allowedUrls;
}

/**
 * Extract the embedded upstream URL from a proxied request. We read
 * `req.originalUrl` rather than `req.url`, because by the time the
 * `proxyReq` hook runs, `pathRewrite` has already rewritten `req.url`.
 * `originalUrl` stays stable across the whole pipeline (same reasoning as
 * `layerIdFromReq` in wms.auth.proxy.js).
 *
 * @param {import("http").IncomingMessage & {originalUrl?: string}} req
 * @returns {string|null} the exact upstream URL, only if it is whitelisted
 */
function upstreamUrlFromReq(req) {
  const url = req.originalUrl || req.url || "";
  const match = url.match(new RegExp(`/${SEARCH_PROXY_PATH}/(.+)$`));
  if (!match) return null;

  // Not decodeURIComponent'd: the client builds this by plain string
  // concatenation (searchProxy + searchSource.url), so the upstream URL
  // arrives verbatim, exactly as configured in layers.json (minus a
  // trailing "?", which never survives onto the wire - see
  // stripTrailingQuestionMark).
  //
  // A reverse proxy in front of the backend may also collapse the "//" in
  // the embedded scheme (nginx does by default, see its merge_slashes), so
  // "https://host/..." arrives as "https:/host/..." and would never match
  // the whitelist. Restore it before comparing (seen behind nginx, where every
  // search through this proxy failed with "Must provide a proper URL as
  // target").
  const candidate = stripTrailingQuestionMark(
    match[1].replace(/^(https?:)\/+/i, "$1//")
  );
  return getAllowedUrls().has(candidate) ? candidate : null;
}

/**
 * @summary Proxy WFS GetFeature requests for söklager whose upstream server
 * does not support CORS, so the browser's preflight never has to succeed.
 *
 * @description Search POSTs its GetFeature XML directly to the WFS URL
 * configured on the söklager (see configTranslator.js#buildSearchSources on
 * the client). Some public WFS servers (verified for
 * geodata.naturvardsverket.se) never answer their CORS preflight with an
 * `Access-Control-Allow-Origin` header on ANY path, so the browser drops the
 * request before it is ever sent - no config on the Hajk side can fix that,
 * because it isn't a CORS answer at all. Routing through this proxy makes
 * the actual GetFeature request a server-to-server call, which CORS never
 * applies to. Only URLs already present as a wfslayer's `url` in
 * App_Data/layers.json are forwarded; nothing else is.
 *
 * @returns Express middleware
 */
export default function searchProxy() {
  return createProxyMiddleware({
    changeOrigin: true,
    logger,
    router: (req) => {
      const target = upstreamUrlFromReq(req);
      return target ? new URL(target).origin : undefined;
    },
    pathRewrite: (_p, req) => {
      const target = upstreamUrlFromReq(req);
      if (!target) return _p;
      const u = new URL(target);
      return u.pathname + u.search;
    },
    on: {
      proxyReq: (proxyReq) => {
        // Never forward the Hajk session cookie to the external provider.
        proxyReq.removeHeader("cookie");
      },
      proxyRes: (proxyRes) => {
        // Allow the response to be read cross-origin (e.g. client dev server
        // on a different port than the backend). In production, where the
        // client is served same-origin behind a reverse proxy, this is a
        // no-op.
        proxyRes.headers["access-control-allow-origin"] = "*";
      },
      error: (err, req, res) => {
        logger.error(err);
        if (res && !res.headersSent && typeof res.status === "function") {
          res.status(502).send("Search proxy: upstream request failed.");
        }
      },
    },
  });
}
