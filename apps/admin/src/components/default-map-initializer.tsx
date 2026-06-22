import { useDefaultMap } from "../hooks/use-default-map";

/** Ensures defaultMap is resolved and persisted as soon as maps are available. */
export default function DefaultMapInitializer() {
  useDefaultMap();
  return null;
}
