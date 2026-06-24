import { mergeWithConfigDefaults } from "../../lib/merge-with-config-defaults";

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
export function buildCreateMapPayload(
  input: MapCreateInput,
  mapsDefault: Record<string, unknown> = {},
): MapCreatePayload {
  const mergedOptions = mergeWithConfigDefaults(
    { ...mapsDefault },
    { ...(input.options ?? {}) },
  );

  return {
    name: input.name.trim(),
    locked: input.locked ?? false,
    options: normalizeMapOptions(mergedOptions),
  };
}
