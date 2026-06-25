import type { Prisma } from "@prisma/client";

import prisma from "../../../common/prisma.ts";
import {
  buildLayerSwitcherBaselayersForMap,
  buildLayerSwitcherGroupsForMap,
} from "./build-layer-switcher-groups-for-map.ts";

/** Parse a single number from a number or a numeric string. */
function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Parse a numeric array from an array or a comma-separated string
 * (e.g. `"576357, 6386049"` → `[576357, 6386049]`). Returns `undefined`
 * when there is no valid numeric content.
 */
function toNumberArray(value: unknown): number[] | undefined {
  const parse = (items: unknown[]): number[] =>
    items
      .map((item) => toNumber(item))
      .filter((n): n is number => n !== undefined);

  if (Array.isArray(value)) {
    const numbers = parse(value);
    return numbers.length > 0 ? numbers : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const numbers = parse(trimmed.split(","));
    return numbers.length > 0 ? numbers : undefined;
  }
  return undefined;
}

/** Admin stores booleans as the strings `"true"`/`"false"`. */
function toBool(value: unknown): boolean {
  return value === true || value === "true";
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/** Parse a JSON array from an array or a JSON string (used for `introductionSteps`). */
function toJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Translates the admin map `options` (flat key/value, mostly strings) into the
 * typed/nested shape the client expects (`center: [x,y]`, `zoom: number`,
 * `colors: {...}`, `defaultCookieNoticeMessage`, etc.). See `App_Data/map_1.json`
 * for the reference client format consumed by `mapFactory.js`.
 */
function translateMapOptionsToClient(
  options: Prisma.JsonObject,
  context: { name: string; locked: boolean; projectionCode?: string }
): Record<string, unknown> {
  return {
    target: "map",
    name: context.name,
    locked: context.locked,
    title: toStringOrUndefined(options.title),
    ...(context.projectionCode ? { projection: context.projectionCode } : {}),

    // View geometry
    center: toNumberArray(options.centerCoordinate),
    origin: toNumberArray(options.origin),
    extent: toNumberArray(options.extent) ?? [],
    resolutions: toNumberArray(options.resolutions) ?? [],
    extraPrintResolutions: toNumberArray(options.printResolutions) ?? [],
    zoom: toNumber(options.startZoom),
    minZoom: toNumber(options.minZoom),
    maxZoom: toNumber(options.maxZoom),
    constrainOnlyCenter: toBool(options.constrainOnlyCenter),
    constrainResolution: toBool(options.constrainResolution),
    constrainResolutionMobile: toBool(options.constrainResolutionMobile),

    // Appearance
    colors: {
      primaryColor: toStringOrUndefined(options.primaryColor),
      secondaryColor: toStringOrUndefined(options.secondaryColor),
      preferredColorScheme: toStringOrUndefined(options.preferredColorScheme),
    },
    logo: toStringOrUndefined(options.logoLight),
    logoLight: toStringOrUndefined(options.logoLight),
    logoDark: toStringOrUndefined(options.logoDark),
    geoserverLegendOptions: toStringOrUndefined(options.legendOptions),
    crossOrigin: toStringOrUndefined(options.crossOrigin),

    // Controls
    mapselector: toBool(options.mapselector),
    mapcleaner: toBool(options.mapcleaner),
    mapresetter: toBool(options.mapresetter),
    showThemeToggler: toBool(options.showThemeToggler),
    showUserAvatar: toBool(options.showUserAvatar),
    showRecentlyUsedPlugins: toBool(options.showRecentlyUsedPlugins),
    enableDownloadLink: toBool(options.enableDownloadLink),
    enableAppStateInHash: toBool(options.enableAppStateInHash),
    confirmOnWindowClose: toBool(options.confirmOnWindowClose),

    // Side panel / drawer
    drawerStatic: toBool(options.drawerStatic),
    drawerVisible: toBool(options.drawerVisible),
    drawerVisibleMobile: toBool(options.drawerVisibleMobile),
    drawerPermanent: toBool(options.drawerPermanent),
    activeDrawerOnStart: toStringOrUndefined(options.drawerContent),
    drawerTitle: toStringOrUndefined(options.drawerTitle),
    drawerButtonTitle: toStringOrUndefined(options.drawerButtonTitle),
    drawerButtonIcon: toStringOrUndefined(options.drawerButtonIcon),

    // Interactions
    altShiftDragRotate: toBool(options.altShiftDragRotate),
    onFocusOnly: toBool(options.onFocusOnly),
    doubleClickZoom: toBool(options.doubleClickZoom),
    keyboard: toBool(options.keyboard),
    mouseWheelZoom: toBool(options.mouseWheelZoom),
    shiftDragZoom: toBool(options.shiftDragZoom),
    dragPan: toBool(options.dragPan),
    pinchRotate: toBool(options.pinchRotate),
    pinchZoom: toBool(options.pinchZoom),
    zoomDelta: toNumber(options.zoomLevelDelta) ?? null,
    zoomDuration: toNumber(options.zoomAnimationDuration) ?? null,

    // Cookies
    showCookieNotice: toBool(options.showCookieNotice),
    showCookieNoticeButton: toBool(options.showCookieNoticeButton),
    cookieUse3dPart: toBool(options.cookieUse3dPart),
    defaultCookieNoticeMessage: toStringOrUndefined(options.cookieMessage),
    defaultCookieNoticeUrl: toStringOrUndefined(options.cookieLink),

    // Introduction guide
    introductionEnabled: toBool(options.introductionEnabled),
    introductionShowControlButton: toBool(
      options.introductionShowControlButton
    ),
    introductionSteps: toJsonArray(options.introductionSteps),
  };
}

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

  return translateMapOptionsToClient(options, {
    name: map.name,
    locked: map.locked,
    projectionCode,
  });
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
