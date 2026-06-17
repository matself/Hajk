import { useEffect } from "react";
import { useMaps } from "../api/maps/hooks";
import useAppStateStore from "../store/use-app-state-store";

/** Resolves defaultMap from localStorage, falling back to the first available map. */
export function useDefaultMap() {
  const defaultMap = useAppStateStore((state) => state.defaultMap);
  const setDefaultMap = useAppStateStore((state) => state.setDefaultMap);
  const { data: maps = [], isLoading } = useMaps();

  useEffect(() => {
    if (isLoading || maps.length === 0) {
      return;
    }

    const storedMapExists =
      defaultMap !== null && maps.some((map) => map.name === defaultMap);

    if (!storedMapExists) {
      setDefaultMap(maps[0].name);
    }
  }, [defaultMap, isLoading, maps, setDefaultMap]);

  const resolvedDefaultMap =
    defaultMap && maps.some((map) => map.name === defaultMap)
      ? defaultMap
      : (maps[0]?.name ?? null);

  return {
    defaultMap: resolvedDefaultMap,
    setDefaultMap,
    maps,
    isLoading,
  };
}
