import type { Prisma } from "@prisma/client";

import prisma from "../../../common/prisma.ts";
import {
  buildLayerSwitcherBaselayersForMap,
  buildLayerSwitcherGroupsForMap,
} from "./build-layer-switcher-groups-for-map.ts";

function mergeJsonObjects(
  base: Prisma.JsonValue,
  override: Prisma.JsonValue
): Prisma.JsonObject {
  const baseObj =
    base && typeof base === "object" && !Array.isArray(base)
      ? (base as Prisma.JsonObject)
      : {};
  const overrideObj =
    override && typeof override === "object" && !Array.isArray(override)
      ? (override as Prisma.JsonObject)
      : {};
  return { ...baseObj, ...overrideObj };
}

export async function buildClientProjectionsForMap(mapName: string) {
  const map = await prisma.map.findFirst({
    where: { name: mapName },
    include: { projections: true },
  });

  if (!map) {
    return [];
  }

  return map.projections.map((projection) => ({
    code: projection.code,
    definition: projection.definition,
    extent: projection.extent.map((value) => Number(value)),
    units: projection.units,
  }));
}

export async function buildClientMapForMap(mapName: string) {
  const map = await prisma.map.findFirst({
    where: { name: mapName },
    include: { projection: true },
  });

  if (!map) {
    return null;
  }

  const options =
    map.options && typeof map.options === "object" && !Array.isArray(map.options)
      ? (map.options as Prisma.JsonObject)
      : {};

  const projectionCode =
    map.projection?.code ??
    (typeof options.projection === "string" ? options.projection : undefined);

  return {
    ...options,
    ...(projectionCode ? { projection: projectionCode } : {}),
    name: map.name,
    locked: map.locked,
  };
}

export async function buildClientToolsForMap(mapName: string) {
  const [toolsOnMap, groups, baselayers] = await Promise.all([
    prisma.toolsOnMaps.findMany({
      where: { mapName },
      include: { tool: true },
      orderBy: { index: "asc" },
    }),
    buildLayerSwitcherGroupsForMap(mapName),
    buildLayerSwitcherBaselayersForMap(mapName),
  ]);

  return toolsOnMap.map((entry) => {
    const mergedOptions = mergeJsonObjects(entry.tool.options, entry.options);

    if (entry.tool.type === "layerswitcher") {
      return {
        type: entry.tool.type,
        index: entry.index,
        options: {
          ...mergedOptions,
          groups,
          baselayers,
        },
      };
    }

    return {
      type: entry.tool.type,
      index: entry.index,
      options: mergedOptions,
    };
  });
}
