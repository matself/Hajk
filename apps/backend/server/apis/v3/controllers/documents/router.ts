import * as express from "express";
import controller from "../documenthandler/controller.ts";

export default express.Router().get("/:id", controller.getDocumentById);
