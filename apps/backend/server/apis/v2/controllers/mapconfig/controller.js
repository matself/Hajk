import ConfigService from "../../services/config.service.js";
import InformativeService from "../../services/informative.service.js";
import handleStandardResponse from "../../utils/handleStandardResponse.js";
import * as backups from "../../utils/backupConfig.js";
import { backupsPageHtml } from "./backupsPage.js";
import log4js from "log4js";

// Create a logger for admin events, those will be saved in a separate log file.
const ael = log4js.getLogger("adminEvent.v2");

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
    ConfigService.getMapConfig(
      req.params.map,
      res.locals.authUser,
      false // 'false' here means that the map config won't be "washed" - this is exactly what we need for this admin request
    ).then((data) => handleStandardResponse(res, data));
  }

  /**
   * @summary Returns a list of all available layers in specified (often human-readable) format.
   *
   * @description Sometimes it's useful for admins to get a list of a map's contents and make it
   * available for users in some format (be it JSON, XML, Excel). This endpoint can be used as-is
   * or by implementing a feature in the client UI, so users themselves can request a description
   * of a map's contents from e.g. LayerSwitcher.
   * @param {*} req
   * @param {*} res
   * @memberof Controller
   */
  exportMapConfig(req, res) {
    ConfigService.exportMapConfig(
      req.params.map,
      req.params.format,
      res.locals.authUser
    ).then((data) => handleStandardResponse(res, data));
  }

  /**
   * @summary Get the contents of the layers database
   *
   * @param {*} req
   * @param {*} res
   * @memberof Controller
   */
  layers(req, res) {
    ConfigService.getLayersStore(
      res.locals.authUser,
      false // won't "wash" content, which is what we need for admin UI to list the entire layer's store
    ).then((data) => handleStandardResponse(res, data));
  }

  layersVerify(req, res) {
    ConfigService.verifyLayers(res.locals.authUser).then((data) =>
      handleStandardResponse(res, data)
    );
  }

  /**
   * @summary Fetch a WMTS GetCapabilities document server-side (with optional
   * Basic auth) on behalf of the admin UI, which can't do it from the browser
   * for authenticated/non-CORS services.
   *
   * @param {*} req
   * @param {*} res
   * @memberof Controller
   */
  wmtsCapabilities(req, res) {
    const { url, username, password } = req.body || {};
    ConfigService.getWmtsCapabilities(url, { username, password }).then((data) =>
      handleStandardResponse(res, data)
    );
  }

  /**
   * @summary List all available map configs - used in admin
   *
   * @param {*} req
   * @param {*} res
   * @memberof Controller
   */
  list(req, res) {
    ConfigService.getAvailableMaps().then((data) =>
      handleStandardResponse(res, data)
    );
  }

  listimage(req, res) {
    InformativeService.getUploadedFiles("image").then((data) =>
      handleStandardResponse(res, data)
    );
  }

  listvideo(req, res) {
    InformativeService.getUploadedFiles("video").then((data) =>
      handleStandardResponse(res, data)
    );
  }

  listaudio(req, res) {
    InformativeService.getUploadedFiles("audio").then((data) =>
      handleStandardResponse(res, data)
    );
  }

  createNewMap(req, res) {
    ConfigService.createNewMap(req.params.name).then((data) => {
      handleStandardResponse(res, data);
      !data.error &&
        ael.info(`created a new map config: ${req.params.name}.json`);
    });
  }

  duplicateMap(req, res) {
    ConfigService.duplicateMap(req.params.nameFrom, req.params.nameTo).then(
      (data) => {
        handleStandardResponse(res, data);
        !data.error &&
          ael.info(
            `created a new map config, ${req.params.nameTo}.json, by duplicating ${req.params.nameFrom}.json`
          );
      }
    );
  }

  deleteMap(req, res) {
    ConfigService.deleteMap(req.params.name).then((data) => {
      handleStandardResponse(res, data);
      !data.error && ael.info(`deleted map config ${req.params.name}.json`);
    });
  }

  /**
   * @summary Serve the self-contained backups/restore page (HTML).
   * Opened from the admin "Kartor" toolbar with a ?map=<name> query param.
   */
  backupsPage(req, res) {
    res.type("html").send(backupsPageHtml());
  }

  /**
   * @summary List available backups for a given map (or "layers"), newest first.
   */
  async listBackups(req, res) {
    try {
      res.json(await backups.listBackups(req.params.map));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * @summary Return the parsed contents of a single backup, for preview/diff.
   */
  async getBackup(req, res) {
    try {
      res.json(await backups.readBackup(req.params.map, req.params.id));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * @summary Restore a backup over the live config file. The current version
   * is snapshotted first, so the restore is itself reversible.
   */
  async restoreBackup(req, res) {
    try {
      const data = await backups.restoreBackup(req.params.map, req.params.id);
      ael.info(
        `restored map config ${req.params.map}.json from backup ${req.params.id}`
      );
      res.json(data);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
export default new Controller();
