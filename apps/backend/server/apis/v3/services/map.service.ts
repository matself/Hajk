import { Prisma, type User } from "@prisma/client";
import log4js from "log4js";

import prisma from "../../../common/prisma.ts";
import { HajkError } from "../../../common/classes.ts";
import HttpStatusCodes from "../../../common/http-status-codes.ts";
import HajkStatusCodes from "../../../common/hajk-status-codes.ts";
import { getUserRoles } from "../../../common/auth/get-user-roles.ts";
import { isAuthActive } from "../../../common/auth/is-auth-active.ts";
import {
  activeLayerInstanceWhere,
  layerInstanceIncludeAll,
} from "../utils/layer-instance.ts";

const logger = log4js.getLogger("service.v3.map");

const DEFAULT_PROJECTION_CODE = "EPSG:3006";

interface MapWriteInput {
  name?: string;
  locked?: boolean;
  options?: Prisma.InputJsonValue;
  projection?: { code?: string };
  projections?: { code?: string }[];
}

async function resolveProjectionConnect(code?: string) {
  const projectionCode = code?.trim() || DEFAULT_PROJECTION_CODE;
  const existingProjection = await prisma.projection.findUnique({
    where: { code: projectionCode },
  });

  if (!existingProjection) {
    throw new HajkError(
      HttpStatusCodes.BAD_REQUEST,
      `Projection with code ${projectionCode} not found`,
      HajkStatusCodes.INVALID_REQUEST_BODY
    );
  }

  return {
    projectionCode,
    connect: { id: existingProjection.id },
  };
}

/**
 * Resolves the many-to-many `projections` relation. Each entry is connected by
 * its (unique) `code`; an unknown code yields a 400 (mirrors the single
 * `projection` behavior). Returns `undefined` when nothing is to connect.
 */
async function resolveProjectionsConnect(
  projections?: { code?: string }[]
): Promise<{ id: number }[] | undefined> {
  if (!projections || projections.length === 0) {
    return undefined;
  }

  const connect: { id: number }[] = [];
  const seen = new Set<number>();
  for (const projection of projections) {
    const code = projection.code?.trim();
    if (!code) continue;

    const existing = await prisma.projection.findUnique({ where: { code } });
    if (!existing) {
      throw new HajkError(
        HttpStatusCodes.BAD_REQUEST,
        `Projection with code ${code} not found`,
        HajkStatusCodes.INVALID_REQUEST_BODY
      );
    }
    if (!seen.has(existing.id)) {
      seen.add(existing.id);
      connect.push({ id: existing.id });
    }
  }

  return connect.length > 0 ? connect : undefined;
}

function mergeOptionsWithProjection(
  options: Prisma.InputJsonValue,
  projectionCode: string
): Prisma.InputJsonValue {
  const base =
    options && typeof options === "object" && !Array.isArray(options)
      ? (options as Record<string, unknown>)
      : {};

  return {
    ...base,
    projection: projectionCode,
  };
}

class MapService {
  constructor() {
    logger.debug("Initiating Map Service");
  }

  async getMaps() {
    const maps = await prisma.map.findMany({
      orderBy: { name: "asc" },
      include: { projection: true },
    });

    return maps;
  }

  async getMapNames() {
    const maps = await prisma.map.findMany({ select: { name: true } });

    // Transform the [{name: "map1"}, {name: "map2"}] to ["map1", "map2"]
    return maps.map((m) => m.name).sort();
  }

  async getMapByName(mapName: string, user: User | undefined) {
    logger.debug(`[getMapByName] Retrieving map "${mapName}"`);

    const roles = await getUserRoles(user);
    const roleCodes = roles.map((r) => r.code);
    const roleIds = roles.map((r) => r.id);

    // Some logging that only should take place if auth is activated.
    if (isAuthActive) {
      if (user) {
        // Log user info
        if (logger.isTraceEnabled()) {
          // If logger level is larger than `debug`, let's log verbosely, entire user object:
          logger.trace("Current user:", user);
        } else {
          // Let's just log user's ID and email:
          logger.debug(`Current user: ${user.id}.`);
        }

        // Log user's roles
        logger.debug("User's roles:", roleCodes);
      } else {
        logger.debug("Current user: anonymous");
      }
    }

    // First, let's determine if a map with the supplied name exists.
    const mapExist = await prisma.map.findFirst({
      where: {
        name: mapName,
      },
    });

    // If `mapExists` is null, it's because the supplied map name doesn't exist.
    // Let's throw an error. We don't use Prisma's findFirstOrThrow because
    // we want to send a custom Hajk Error here, rather than just rethrow
    // the DB error from Prisma.
    if (mapExist === null) {
      throw new HajkError(
        HttpStatusCodes.NOT_FOUND,
        `"${mapName}" is not a valid map`,
        HajkStatusCodes.UNKNOWN_MAP_NAME
      );
    }

    // Now that we know that the map exists, let's try to get its config,
    // respecting role restrictions (if auth is active, which is determined
    // by the existence of the `user` object).
    const mapConfig = await prisma.map.findFirst({
      where: {
        name: mapName,
        // If auth is active, let's filter the request to only include
        // the maps that a) either are completely unrestricted (no roles in
        // `restrictedToRoles`) or, b) where at least one of the roles in
        // `restrictedToRoles` is included in the user's roles.
        ...(isAuthActive
          ? {
              OR: [
                { restrictedToRoles: { none: {} } },
                {
                  restrictedToRoles: {
                    some: { roleId: { in: roleIds } },
                  },
                },
              ],
            }
          : {}),
      },
      // TODO: Tools, Layers and Groups must also be filtered by `roles`.
      include: {
        projection: true,
        projections: true,
        // Soft-deleted tools must not reach the client map config.
        tools: { where: { tool: { deletedAt: null } }, include: { tool: true } },
        layers: {
          include: layerInstanceIncludeAll,
        },
        groups: { include: { group: { include: { layers: true } } } },
      },
    });

    // If `mapConfig` is null, it means that the map exists, but the user
    // doesn't have access to it. Let's find out which roles are required
    // and log a nice error message, before throwing a 401 error.
    if (mapConfig === null) {
      // Find out which roles are required to view the given map.
      const allowedRoles = await prisma.role.findMany({
        where: {
          RoleOnMap: {
            some: {
              map: {
                name: mapName,
              },
            },
          },
        },
      });

      // TODO: This logs out role IDs, which is not very readable. Consider
      // fetching the roles by name or code instead.
      logger.debug(
        `User unauthorized. To access "${mapName}" user must belong to at least one of the following roles:`,
        allowedRoles.map((r) => r.id)
      );

      throw new HajkError(
        HttpStatusCodes.UNAUTHORIZED,
        `User "${user?.email}" does not have access to map "${mapName}"`,
        HajkStatusCodes.USER_NOT_AUTHORIZED
      );
    }

    logger.debug(`Access to "${mapName}" granted for user "${user?.id}".`);
    return mapConfig;
  }

  /**
   * Get all groups for a map, including nested groups. Note that the
   * tree structure is flattened into a single list of groups.
   * @param mapName - The name of the map.
   * @returns - A flat list of groups connected to the map.
   */
  async getGroupsForMap(mapName: string) {
    const allGroups = await prisma.groupsOnMaps.findMany({
      where: {
        mapName: mapName,
      },
    });

    return allGroups;
  }

  async getLayersForMap(mapName: string) {
    const instances = await prisma.layerInstance.findMany({
      where: {
        AND: [
          activeLayerInstanceWhere,
          {
            OR: [
              { map: { name: mapName } },
              { group: { maps: { some: { mapName } } } },
            ],
          },
        ],
      },
      include: layerInstanceIncludeAll,
    });

    return instances
      .map((instance) => {
        if (instance.displayLayer) {
          return { ...instance.displayLayer, layerKind: "display" as const };
        }
        if (instance.searchLayer) {
          return { ...instance.searchLayer, layerKind: "search" as const };
        }
        if (instance.editingLayer) {
          return { ...instance.editingLayer, layerKind: "editing" as const };
        }
        return null;
      })
      .filter((layer): layer is NonNullable<typeof layer> => layer !== null);
  }

  async getProjectionsForMap(mapName: string) {
    const projections = await prisma.projection.findMany({
      where: { maps: { some: { name: mapName } } },
    });

    return projections;
  }

  async getToolsForMap(mapName: string) {
    return await prisma.toolsOnMaps.findMany({
      // Soft-deleted tools keep their placements but are hidden everywhere.
      where: { mapName, tool: { deletedAt: null } },
      include: { tool: true },
      orderBy: { index: "asc" },
    });
  }

  async updateMapTools(
    mapName: string,
    tools: { toolId: number; index: number; target: string }[]
  ) {
    await prisma.$transaction([
      // Only replace placements for active tools — soft-deleted tools keep
      // theirs so a restored tool reappears on its maps.
      prisma.toolsOnMaps.deleteMany({
        where: { mapName, tool: { deletedAt: null } },
      }),
      ...(tools.length > 0
        ? [
            prisma.toolsOnMaps.createMany({
              data: tools.map((t) => ({
                mapName,
                toolId: t.toolId,
                index: t.index,
                target: t.target,
              })),
            }),
          ]
        : []),
    ]);
  }

  async createMap(data: MapWriteInput, userId?: string) {
    const name =
      typeof data.name === "string" ? data.name.trim() : String(data.name ?? "");
    if (!name) {
      throw new HajkError(
        HttpStatusCodes.BAD_REQUEST,
        "Map name is required",
        HajkStatusCodes.INVALID_REQUEST_BODY
      );
    }

    const locked = typeof data.locked === "boolean" ? data.locked : false;
    const rawOptions =
      data.options &&
      typeof data.options === "object" &&
      !Array.isArray(data.options)
        ? data.options
        : {};
    const optionsFromInput = rawOptions as Record<string, unknown>;
    const projectionCodeFromOptions =
      typeof optionsFromInput.projection === "string"
        ? optionsFromInput.projection
        : undefined;
    const { projectionCode, connect } = await resolveProjectionConnect(
      data.projection?.code ?? projectionCodeFromOptions
    );
    const projectionsConnect = await resolveProjectionsConnect(
      data.projections
    );

    try {
      const newMap = await prisma.map.create({
        data: {
          name,
          locked,
          options: mergeOptionsWithProjection(rawOptions, projectionCode),
          projection: { connect },
          ...(projectionsConnect
            ? { projections: { connect: projectionsConnect } }
            : {}),
          createdBy: userId,
          createdDate: new Date(),
        },
        include: { projection: true, projections: true },
      });
      return newMap;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new HajkError(
          HttpStatusCodes.CONFLICT,
          `Could not create map: a map named "${name}" already exists`,
          HajkStatusCodes.MAP_ALREADY_EXISTS
        );
      }
      throw error;
    }
  }

  async updateMap(mapName: string, data: MapWriteInput, userId?: string) {
    const { projection, projections, options, ...mapScalars } = data;
    const updateData: Prisma.MapUpdateInput = {
      ...mapScalars,
      lastSavedBy: userId,
      lastSavedDate: new Date(),
    };

    if (options !== undefined) {
      updateData.options = options;
    }

    // Replace the many-to-many `projections` set when the caller sends the key.
    if (projections !== undefined) {
      const projectionsConnect = await resolveProjectionsConnect(projections);
      updateData.projections = { set: projectionsConnect ?? [] };
    }

    if (projection?.code) {
      const { projectionCode, connect } = await resolveProjectionConnect(
        projection.code
      );
      updateData.projection = { connect };
      const existing = await prisma.map.findUnique({
        where: { name: mapName },
        select: { options: true },
      });
      const existingOptions =
        existing?.options &&
        typeof existing.options === "object" &&
        !Array.isArray(existing.options)
          ? existing.options
          : {};
      const nextOptions =
        options !== undefined
          ? options
          : (existingOptions as Prisma.InputJsonValue);
      updateData.options = mergeOptionsWithProjection(
        nextOptions,
        projectionCode
      );
    }

    const updatedMap = await prisma.map.update({
      where: { name: mapName },
      data: updateData,
      include: { projection: true, projections: true },
    });
    return updatedMap;
  }

  async deleteMap(mapName: string) {
    // TODO: This does not delete corresponding layers, groups, etc.
    // We should consider implementing a onDelete cascade in the schema, but
    // must account for the fact that layers/groups etc. may be shared between
    // maps.
    await prisma.map.delete({ where: { name: mapName } });
  }
}

export default new MapService();
