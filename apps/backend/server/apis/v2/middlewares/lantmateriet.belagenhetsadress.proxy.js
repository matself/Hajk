import { createProxyMiddleware } from "http-proxy-middleware";
import log4js from "log4js";

// Grab a logger
const logger = log4js.getLogger("proxy.lantmaterietBelagenhetsadress.v2");

/**
 * Build the Authorization header from .env, or null when nothing is configured
 * there. The products under api.lantmateriet.se/distribution do not agree on
 * one scheme: Markhojd authenticates with Basic and Geotorget credentials,
 * while an OAuth bearer token is what the API manager issues. Support both and
 * let the configuration decide, preferring the token when both are present.
 */
function buildAuthHeader() {
  const token = process.env.LANTMATERIET_BELAGENHETSADRESS_TOKEN;
  if (token) {
    return `Bearer ${token}`;
  }

  const username = process.env.LANTMATERIET_BELAGENHETSADRESS_USER;
  if (username) {
    const password = process.env.LANTMATERIET_BELAGENHETSADRESS_PASSWORD ?? "";
    return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  }

  return null;
}

export default function lantmaterietBelagenhetsadressProxy(
  _err,
  _req,
  _res,
  _next
) {
  return createProxyMiddleware({
    target:
      process.env.LANTMATERIET_BELAGENHETSADRESS_BASE_URL ||
      "https://api.lantmateriet.se/distribution/produkter/belagenhetsadress/v4.2",
    logger: logger,
    changeOrigin: true,
    // No pathRewrite here: Express strips the mount path (/api/v2/belagenhetsadressproxy)
    // from req.url before the middleware sees it, so whatever follows the mount point is
    // already appended to the target's path as-is, query string included.
    on: {
      proxyReq: (proxyReq, req, _res) => {
        // Credentials can live in either of two places. In .env they stay on
        // the server and never reach the browser, which is what to prefer.
        // Configured per map in Admin they travel with the request instead,
        // the way the Markhojd proxy works, which is the only option when the
        // person configuring Hajk cannot edit .env. The server's own wins;
        // otherwise we forward whatever the client sent untouched.
        const authHeader = buildAuthHeader();
        if (authHeader) {
          proxyReq.setHeader("Authorization", authHeader);
        }

        logger.debug(
          `${req.method} ${req.originalUrl} ~> ${proxyReq.path} (auth from ${
            authHeader ? `.env, ${authHeader.split(" ")[0]}` : "client"
          })`
        );
      },
      error: (err, _req, res) => {
        if (err) {
          logger.error(err);
          res
            .status(500)
            .send(
              "Request failed while proxying to Lantmateriet Belagenhetsadress."
            );
        }
      },
    },
  });
}
