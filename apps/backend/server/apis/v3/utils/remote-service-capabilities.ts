import type { ServiceType } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  removeNSPrefix: true,
});

/** SERVICE query token sent to remote OGC endpoints for GetCapabilities. */
export type RemoteCapabilityMode = "WMS" | "WFS";

export function capabilityModeForServiceType(
  type: ServiceType,
): RemoteCapabilityMode | null {
  switch (type) {
    case "WMS":
    case "WMTS":
      return "WMS";
    case "WFS":
    case "WFST":
    case "VECTOR":
      return "WFS";
    default:
      return null;
  }
}

export function buildGetCapabilitiesUrl(
  baseUrl: string,
  mode: RemoteCapabilityMode,
): string {
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}SERVICE=${mode}&REQUEST=GetCapabilities`;
}

function normalizeXmlText(val: unknown): string | undefined {
  if (typeof val === "string") {
    const t = val.trim();
    return t.length > 0 ? t : undefined;
  }
  if (val !== null && typeof val === "object" && "#text" in val) {
    const t = String((val as { "#text": unknown })["#text"]).trim();
    return t.length > 0 ? t : undefined;
  }
  return undefined;
}

function collectWmsLayerNamesFromTree(
  layerNode: Record<string, unknown>,
): string[] {
  const names: string[] = [];
  const walk = (layer: Record<string, unknown>) => {
    const n = normalizeXmlText(layer.Name);
    if (n) names.push(n);
    const nested = layer.Layer;
    const arr = Array.isArray(nested) ? nested : nested ? [nested] : [];
    for (const child of arr) {
      if (child !== null && typeof child === "object") {
        walk(child as Record<string, unknown>);
      }
    }
  };
  walk(layerNode);
  return names;
}

function extractWmsLayerNames(parsed: Record<string, unknown>): string[] {
  const rootKeys = Object.keys(parsed);
  const capKey =
    rootKeys.find((k) => /WMS_Capabilities/i.test(k)) ??
    rootKeys.find((k) => /WMT_MS_Capabilities/i.test(k));
  if (!capKey) return [];
  const root = parsed[capKey];
  if (!root || typeof root !== "object") return [];
  const capability = (root as Record<string, unknown>).Capability;
  if (!capability || typeof capability !== "object") return [];
  const layerRoot = (capability as Record<string, unknown>).Layer;
  if (!layerRoot || typeof layerRoot !== "object") return [];
  return collectWmsLayerNamesFromTree(layerRoot as Record<string, unknown>);
}

function extractWfsFeatureNames(parsed: Record<string, unknown>): string[] {
  const rootKeys = Object.keys(parsed);
  const capKey = rootKeys.find((k) => /WFS_Capabilities/i.test(k));
  if (!capKey) return [];
  const root = parsed[capKey];
  if (!root || typeof root !== "object") return [];
  const ftl = (root as Record<string, unknown>).FeatureTypeList;
  if (!ftl || typeof ftl !== "object") return [];
  const fts = (ftl as Record<string, unknown>).FeatureType;
  const arr = Array.isArray(fts) ? fts : fts ? [fts] : [];
  const names: string[] = [];
  for (const ft of arr) {
    if (ft !== null && typeof ft === "object") {
      const n = normalizeXmlText((ft as Record<string, unknown>).Name);
      if (n) names.push(n);
    }
  }
  return names;
}

export async function fetchRemoteCapabilityLayerNames(
  baseUrl: string,
  mode: RemoteCapabilityMode,
  timeoutMs = 15000,
): Promise<
  { ok: true; layers: string[] } | { ok: false; message: string }
> {
  try {
    const url = buildGetCapabilitiesUrl(baseUrl, mode);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/xml,text/xml,*/*" },
    });
    if (!response.ok) {
      return {
        ok: false,
        message: `Capabilities request failed with HTTP ${response.status}`,
      };
    }
    const xml = await response.text();
    const parsed = xmlParser.parse(xml);
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, message: "Capabilities response could not be parsed" };
    }
    const rec = parsed as Record<string, unknown>;
    const layers =
      mode === "WMS"
        ? extractWmsLayerNames(rec)
        : extractWfsFeatureNames(rec);
    return { ok: true, layers };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}
