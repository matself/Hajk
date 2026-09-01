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
        // Unlike the Markhojd proxy, credentials for this product are a genuine
        // server-side secret: the access token is tied to the organization's
        // Geotorget subscription and every call is billed against it. It is
        // therefore held in .env and injected here, never sent to the browser.
        proxyReq.setHeader(
          "Authorization",
          `Bearer ${process.env.LANTMATERIET_BELAGENHETSADRESS_TOKEN}`
        );

        logger.debug(`${req.method} ${req.originalUrl} ~> ${proxyReq.path}`);
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
