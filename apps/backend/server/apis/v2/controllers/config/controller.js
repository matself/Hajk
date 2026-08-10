import ConfigService from "../../services/config.service.js";
import handleStandardResponse from "../../utils/handleStandardResponse.js";

/**
 * @summary Reconstruct the public-facing base URL of this API (up to and
 * including the version segment), honoring any reverse proxy in front of us.
 *
 * @description Used to build absolute urls for the WMTS auth proxy that the
 * client can request. Mirrors the x-forwarded-* handling used elsewhere in the
 * backend (see the QGIS service url reconstruction in server.js).
 *
 * @param {*} req
 * @returns {string} e.g. "https://example.com/api/v2"
 */
function getPublicApiBase(req) {
  const proto = (req.headers["x-forwarded-proto"] || req.protocol)
    .split(",")[0]
    .trim();

  const host = (req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();

  return `${proto}://${host}/api/v2`;
}

export class Controller {
  /**
   * @summary Get a specific map config using the supplied
   * request parameter "map" as map's name.
   *
   * @param {*} req
   * @param {*} res
   * @memberof Controller
   */
  byMap(req, res) {
    ConfigService.getMapWithLayers(
      req.params.map,
      res.locals.authUser,
      true,
      getPublicApiBase(req)
    ).then((data) => handleStandardResponse(res, data));
  }
}
export default new Controller();
