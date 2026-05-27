import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma allows for a couple of different log levels, see:
// https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging#the-log-option
const allowedLogLevels = ["query", "info", "warn", "error"] as const;

// Let's see what sysadmin has configured in .env.
// Keep only those values that are allowed in Prisma.
const logLevels =
  process.env.PG_LOG_LEVELS?.split(",").filter((l) =>
    allowedLogLevels.includes(l as (typeof allowedLogLevels)[number])
  ) as Prisma.LogLevel[] | undefined;

function getSchemaFromConnectionString(connectionString: string) {
  try {
    return new URL(connectionString).searchParams.get("schema") ?? undefined;
  } catch {
    return undefined;
  }
}

export function createPrismaClient({
  connectionString = process.env.PG_CONNECTION_STRING,
  envName = "PG_CONNECTION_STRING",
  log = logLevels,
}: {
  connectionString?: string;
  envName?: string;
  log?: Prisma.LogLevel[];
} = {}) {
  if (!connectionString) {
    throw new Error(`${envName} must be set before creating a PrismaClient.`);
  }

  return new PrismaClient({
    adapter: new PrismaPg(
      { connectionString },
      { schema: getSchemaFromConnectionString(connectionString) }
    ),
    log,
  });
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
