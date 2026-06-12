import type { FetchFn, FmeApiVersion } from "../types";
import { getRepositoriesUrl } from "./endpoints";

export const FME_API_V3: FmeApiVersion = "v3";
export const FME_API_V4: FmeApiVersion = "v4";

const DETECTION_ORDER: FmeApiVersion[] = [FME_API_V4, FME_API_V3];

/**
 * Checks if the given FME API version is available.
 * This is used to determine if the FME server supports the given FME API version.
 */
async function isApiAvailable(
  proxyBase: string,
  version: FmeApiVersion,
  fetchFn: FetchFn
): Promise<boolean> {
  try {
    const response = await fetchFn(getRepositoriesUrl(proxyBase, version));
    if (!response.ok) {
      return false;
    }
    await response.json();
    return true;
  } catch {
    return false;
  }
}

/**
 * Detects the FME API version.
 * This is used to detect the FME API version of the FME server.
 */
export async function detectFmeApiVersion(
  proxyBase: string,
  fetchFn: FetchFn
): Promise<FmeApiVersion> {
  for (const version of DETECTION_ORDER) {
    if (await isApiAvailable(proxyBase, version, fetchFn)) {
      return version;
    }
  }
  return FME_API_V3;
}
