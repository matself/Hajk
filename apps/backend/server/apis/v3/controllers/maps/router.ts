import * as express from "express";
import MapsController from "./controller.ts";
import documentHandlerRouter from "../documenthandler/router.ts";
import { validatePayload } from "../../middlewares/payload.validation.ts";
import {
  MapCreateSchema,
  MapUpdateSchema,
} from "../../schemas/map.schemas.ts";

export default express
  .Router()
  .get("/", MapsController.getMaps)
  .post("/", validatePayload(MapCreateSchema), MapsController.createMap)
  .patch(
    "/:mapName",
    validatePayload(MapUpdateSchema),
    MapsController.updateMap
  )
  .delete("/:mapName", MapsController.deleteMap)
  .get("/:mapName", MapsController.getMapByName)
  .get("/:mapName/groups", MapsController.getGroupsForMap)
  .get("/:mapName/layers", MapsController.getLayersForMap)
  .get("/:mapName/projections", MapsController.getProjectionsForMap)
  .get("/:mapName/tools", MapsController.getToolsForMap)
  .put("/:mapName/tools", MapsController.updateMapTools)
  .use("/:mapName/documenthandler", documentHandlerRouter);
