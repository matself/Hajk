import * as express from "express";
import controller from "./controller.js";

// Intentionally NOT behind restrictAdmin - this is how a session is obtained
// in the first place.
export default express
  .Router()
  .post("/login", controller.login)
  .post("/logout", controller.logout);
