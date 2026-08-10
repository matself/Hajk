import { createProxyMiddleware } from "http-proxy-middleware";
import log4js from "log4js";

// Grab a logger
const logger = log4js.getLogger("proxy.lantmaterietMarkhojd.v2");

export default function lantmaterietMarkhojdProxy(_err, _req, _res, _next) {
  return createProxyMiddleware({
    target:
      process.env.LANTMATERIET_MARKHOJD_BASE_URL ||
      "https://api.lantmateriet.se/distribution/produkter/markhojd/v1",
    logger: logger,
    changeOrigin: true,
    on: {
      // The Authorization header (Basic auth) is supplied by the client, as
      // credentials for this particular Lantmateriet product are configured
      // per map in Admin rather than being a server-held secret. We simply
      // forward whatever the client sent.
      error: (err, _req, res) => {
        if (err) {
          logger.error(err);
          res
            .status(500)
            .send("Request failed while proxying to Lantmateriet Markhojd.");
        }
      },
    },
    pathRewrite: (originalPath, req) => {
      // Lets split on the proxy path so that we can remove that when forwarding
      const segments = originalPath.split("/api/v2/markhojdproxy");

      // We want to forward everything that is after /api/v2/markhojdproxy
      const path = segments[1];

      logger.debug(`${req.method} ${originalPath} ~> ${path}`);
      return path;
    },
  });
}
