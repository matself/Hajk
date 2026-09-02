import { createProxyMiddleware } from "http-proxy-middleware";
import log4js from "log4js";

// Grab a logger
const logger = log4js.getLogger("proxy.lantmaterietDetaljplan.v2");

/**
 * Build a Basic auth header from the credentials in .env, or null when they
 * are not configured. Lantmateriet's Geodatakatalog authenticates with an
 * ordinary username/password pair rather than a bearer token, which is why
 * this proxy differs from its Markhojd and Belagenhetsadress neighbours.
 */
function buildAuthHeader() {
  const user = process.env.LANTMATERIET_DETALJPLAN_USER;
  const password = process.env.LANTMATERIET_DETALJPLAN_PASSWORD;

  if (!user) return null;

  const raw = `${user}:${password ?? ""}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

/**
 * @param {object} [options]
 * @param {string} [options.target] Upstream base URL. Defaults to the söktjänst.
 *   The plan documents live under a sibling path (nedladdning/v1) behind the same
 *   credentials, so the asset route passes that base instead of the search one.
 */
export default function lantmaterietDetaljplanProxy(options = {}) {
  const target =
    options.target ||
    process.env.LANTMATERIET_DETALJPLAN_BASE_URL ||
    "https://api.lantmateriet.se/distribution/geodatakatalog/sokning/v1/detaljplan/v2";

  return createProxyMiddleware({
    target,
    logger: logger,
    changeOrigin: true,
    // No pathRewrite here: Express strips the mount path (/api/v2/detaljplanproxy)
    // from req.url before the middleware sees it, so whatever follows the mount point is
    // already appended to the target's path as-is, query string included.
    on: {
      proxyReq: (proxyReq, req, _res) => {
        // The credentials can live in either of two places. Held in .env they stay
        // on the server and never reach the browser, which is what a deployment
        // with server access should do. Configured per map in Admin they travel
        // with the request instead. The server's own credentials win; otherwise
        // we forward whatever the client sent untouched.
        const authHeader = buildAuthHeader();
        if (authHeader) {
          proxyReq.setHeader("Authorization", authHeader);
        }

        logger.debug(
          `${req.method} ${req.originalUrl} ~> ${proxyReq.path} (credentials from ${
            authHeader ? ".env" : "client"
          })`
        );
      },
      proxyRes: (proxyRes, req) => {
        // Keep redirects inside the proxy. Asking the download endpoint for
        // /asset/<uuid> does not return the file - it answers 302 to the real
        // location, /data/detaljplan/<uuid>, as an absolute URL back at
        // Lantmateriet. Relayed as-is, the browser follows it out of here and
        // arrives at the service unauthenticated, which is what produced the
        // login dialog. Rewriting it to our own mount path means the second
        // request comes back through and gets the credentials attached too.
        //
        // Only redirects that stay within the proxied service are rewritten. A
        // redirect somewhere else - a CDN or a pre-signed link - is left alone,
        // since it is not ours to proxy and generally needs no credentials.
        const location = proxyRes.headers["location"];
        if (location) {
          try {
            const targetUrl = new URL(target);
            const locationUrl = new URL(location, target);
            if (
              locationUrl.origin === targetUrl.origin &&
              locationUrl.pathname.startsWith(targetUrl.pathname)
            ) {
              const rest = locationUrl.pathname.slice(
                targetUrl.pathname.length
              );
              proxyRes.headers["location"] =
                `${req.baseUrl}${rest}${locationUrl.search}`;
            }
          } catch {
            // An unparseable Location is left untouched rather than mangled.
          }
        }

        // Never let the upstream's auth challenge reach the browser. The plan
        // documents are opened as ordinary links, so a relayed
        // "WWW-Authenticate: Basic" makes the browser put up a login dialog no
        // user can answer - the credentials belong to the server, and typing
        // them into that box would defeat the point of proxying at all. Worse,
        // the browser then remembers the realm and keeps asking. Without the
        // header the failed request simply fails, visibly.
        delete proxyRes.headers["www-authenticate"];
      },
      error: (err, _req, res) => {
        if (err) {
          logger.error(err);
          res
            .status(500)
            .send("Request failed while proxying to Lantmateriet Detaljplan.");
        }
      },
    },
  });
}
