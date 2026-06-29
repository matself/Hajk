import * as express from "express";
import controller from "./controller.ts";
import { validatePayload } from "../../middlewares/payload.validation.ts";
import restrictAdmin from "../../middlewares/restrict.admin.ts";
import {
  ThemeCreateSchema,
  ThemeUpdateSchema,
} from "../../schemas/theme.schemas.ts";

export default express
  .Router({ mergeParams: true })
  .get("/", controller.getThemes)
  .post(
    "/",
    restrictAdmin,
    validatePayload(ThemeCreateSchema),
    controller.createTheme
  )
  .get("/:id", controller.getTheme)
  .put(
    "/:id",
    restrictAdmin,
    validatePayload(ThemeUpdateSchema),
    controller.updateTheme
  )
  .delete("/:id", restrictAdmin, controller.deleteTheme);
