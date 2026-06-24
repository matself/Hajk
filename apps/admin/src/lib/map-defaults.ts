import useAppStateStore from "../store/use-app-state-store";

function projectionCodeFromValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as { code?: unknown }).code === "string"
  ) {
    const code = (value as { code: string }).code.trim();
    return code || undefined;
  }
  return undefined;
}

/** Default map projection from `mapsDefault.projection` in config, then `defaultCoordinates[0]`. */
export function getDefaultMapProjectionCode(
  override?: Record<string, unknown>,
): string {
  const { mapsDefault, defaultCoordinates } = useAppStateStore.getState();
  const config = { ...(mapsDefault ?? {}), ...(override ?? {}) };

  return (
    projectionCodeFromValue(config.projection) ?? defaultCoordinates[0] ?? ""
  );
}
