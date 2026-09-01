import { createProxyMiddleware } from "http-proxy-middleware";
import log4js from "log4js";

// Grab a logger
const logger = log4js.getLogger("proxy.lantmaterietBelagenhetsadress.v2");

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
        // The token can live in either of two places. Held in .env it stays on
        // the server and never reaches the browser, which is what a deployment
        // with server access should do. Configured per map in Admin it travels
        // with the request instead, the way the Markhojd proxy works, which is
        // the only option when the person configuring Hajk cannot edit .env.
        // The server's own token wins; otherwise we forward whatever the client
        // sent untouched.
        const token = process.env.LANTMATERIET_BELAGENHETSADRESS_TOKEN;
        if (token) {
          proxyReq.setHeader("Authorization", `Bearer ${token}`);
        }

        logger.debug(
          `${req.method} ${req.originalUrl} ~> ${proxyReq.path} (token from ${
            token ? ".env" : "client"
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
