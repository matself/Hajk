import type { Service } from "../services/types";
import { SERVICE_TYPE } from "../services/types";

const WFS_FAMILY = new Set<SERVICE_TYPE>([
  SERVICE_TYPE.WFS,
  SERVICE_TYPE.WFST,
  SERVICE_TYPE.VECTOR,
]);

function hasNonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Fills layer create payload fields that belong to the service conceptually:
 * - WFS search endpoint URL defaults to the service URL (same physical endpoint).
 * - Layer metadata may inherit title/description/owner from service metadata when omitted.
 */
export function applyServiceDefaultsToLayerCreate(
  merged: Record<string, unknown>,
  service: Service,
): void {
  if (WFS_FAMILY.has(service.type)) {
    const existing =
      (merged.searchSettings as Record<string, unknown> | undefined) ?? {};
    const url =
      typeof existing.url === "string" ? existing.url.trim() : "";
    if (!url) {
      merged.searchSettings = { ...existing, url: service.url };
    }
  }

  if (!service.metadata) {
    return;
  }

  const meta =
    (merged.metadata as Record<string, unknown> | undefined) ?? {};
  let changed = false;

  if (!hasNonEmptyString(meta.title) && service.metadata.title) {
    meta.title = service.metadata.title;
    changed = true;
  }
  if (!hasNonEmptyString(meta.description) && service.metadata.description) {
    meta.description = service.metadata.description;
    changed = true;
  }
  if (!hasNonEmptyString(meta.owner) && service.metadata.owner) {
    meta.owner = service.metadata.owner;
    changed = true;
  }

  if (changed) {
    merged.metadata = meta;
  }
}
