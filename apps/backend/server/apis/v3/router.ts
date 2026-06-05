import { Router } from "express";

import authRouter from "./controllers/auth/router.ts";
import databaseRouter from "./controllers/database/router.ts";
import groupsRouter from "./controllers/groups/router.ts";
import layersRouter from "./controllers/layers/router.ts";
import mapsRouter from "./controllers/maps/router.ts";
import publicRouter from "./controllers/public/router.ts";
import servicesRouter from "./controllers/services/router.ts";
import toolsRouter from "./controllers/tools/router.ts";
import usersRouter from "./controllers/users/router.ts";
import websocketsRouter from "./controllers/websockets/router.ts";

import { isAuthenticated } from "../../common/auth/is-authenticated.middleware.ts";


export default Router()
  // The /auth endpoint should always be accessible
  .use("/auth", authRouter)
  // All other endpoints require authentication
  .use("/public", isAuthenticated, publicRouter)
  // The admin endpoints require that the user is authenticated and has the admin role
  .use("/websockets",  websocketsRouter) // Note that UPGRADE endpoint at /api/v3/websockets is not behind this router, but rather directly in the websockets.ts file
  .use("/database",  databaseRouter)
  .use("/groups",  groupsRouter)
  .use("/layers",  layersRouter)
  .use("/maps",  mapsRouter)
  .use("/services",  servicesRouter)
  .use("/tools",  toolsRouter)
  .use("/users",  usersRouter);
