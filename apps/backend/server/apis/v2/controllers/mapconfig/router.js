import * as express from "express";
import controller from "./controller.js";
import restrictAdmin from "../../middlewares/restrict.admin.js";

export default express
  .Router()
  .use(restrictAdmin) // We will not allow any of the following routes unless user is admin
  // First we handle _specific_ routes, so we can catch them…
  .put("/duplicate/:nameFrom/:nameTo", controller.duplicateMap)
  .get("/export/:map/:format", controller.exportMapConfig) // Describe all available layers in a human-readable format
  .get("/layers", controller.layers) // Get all layers (from layers.json)
  .get("/layers/verify", controller.layersVerify) // Check which Hajk layers actually exist in their respective services
  .get("/list", controller.list) // List all available maps
  .get("/listimage", controller.listimage) // List all available maps
  .get("/listvideo", controller.listvideo)
  .get("/listaudio", controller.listaudio)

  // Backup/restore of map configs. The UI page must be registered before the
  // "/:map" catch-all below, or "backups-ui" would be treated as a map name.
  .get("/backups-ui", controller.backupsPage) // Self-contained backups/restore page
  .get("/backups/:map", controller.listBackups) // List backups for a map
  .get("/backups/:map/:id", controller.getBackup) // Preview a single backup
  .put("/restore/:map/:id", controller.restoreBackup) // Restore a backup

  // …but if none of the above matched, let's assume the string
  // provided is a param that should be used as map config name.
  .get("/:map", controller.byMap) // Get specific map config
  .put("/:name", controller.createNewMap)
  .delete("/:name", controller.deleteMap);
