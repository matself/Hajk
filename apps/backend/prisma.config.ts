import "dotenv/config";
import type { PrismaConfig } from "prisma";
import { env } from "prisma/config";
export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --env-file=.env prisma/seed.js",
  },
  datasource: {
    url: env("PG_CONNECTION_STRING"),
  },
} satisfies PrismaConfig;
