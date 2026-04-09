/**
 * Merges JSON config defaults with user/API input for create payloads.
 * Defaults are applied first; defined user fields override.
 * Keys on the user object with value `undefined` are ignored so defaults stay.
 * Optional `deepMergeKeys`: objects under those keys are merged (defaults + user)...
 * instead of the user object replacing the whole nested object.
 */
export function mergeWithConfigDefaults(
  defaults: Record<string, unknown>,
  input: Record<string, unknown>,
  options?: { deepMergeKeys?: string[] },
): Record<string, unknown> {
  const user = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined),
  ) as Record<string, unknown>;

  const merged: Record<string, unknown> = { ...defaults, ...user };

  for (const key of options?.deepMergeKeys ?? []) {
    const d = defaults[key];
    const u = user[key];
    if (
      d &&
      u &&
      typeof d === "object" &&
      !Array.isArray(d) &&
      typeof u === "object" &&
      !Array.isArray(u)
    ) {
      merged[key] = {
        ...(d as Record<string, unknown>),
        ...(u as Record<string, unknown>),
      };
    }
  }

  return merged;
}
