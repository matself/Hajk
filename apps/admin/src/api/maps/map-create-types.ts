import { mergeWithConfigDefaults } from "../../lib/merge-with-config-defaults";
import { getDefaultMapProjectionCode } from "../../lib/map-defaults";
import useAppStateStore from "../../store/use-app-state-store";
export interface MapCreateOptionsInput {
  title?: string;
  description?: string;
}

export type MapOptionsRecord = Record<string, string>;

export interface MapCreateInput {
  name: string;
  locked?: boolean;
  options?: MapCreateOptionsInput;
}

export interface MapCreatePayload {
  name: string;
  locked: boolean;
  projection: { code: string };
  options: MapOptionsRecord;
}

function toOptionString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function normalizeMapOptions(
  options: Record<string, unknown>,
): MapOptionsRecord {
  const normalized: MapOptionsRecord = {};
  for (const [key, value] of Object.entries(options)) {
    const asString = toOptionString(value);
    if (asString !== undefined) {
      normalized[key] = asString;
    }
  }
  return normalized;
}

/**
 * Builds the JSON body for `POST /maps`.
 * Merges `mapsDefault` from config.json into `options` (user dialog fields win).
 */
export function buildCreateMapPayload(input: MapCreateInput): MapCreatePayload {
  const { mapsDefault } = useAppStateStore.getState();
  const configDefaults = { ...(mapsDefault ?? {}) };
  const projectionCode = getDefaultMapProjectionCode();

  const mergedOptions = mergeWithConfigDefaults(
    configDefaults,
    { ...(input.options ?? {}) },
  );
  const normalizedOptions = normalizeMapOptions(mergedOptions);

  return {
    name: input.name.trim(),
    locked: input.locked ?? false,
    projection: { code: projectionCode },
    options: {
      ...normalizedOptions,
      projection: projectionCode,
    },
  };
}