// Default options for the OsmSearch-plugin. Can be overridden per-map via admin options.
export const DEFAULT_OPTIONS = Object.freeze({
  endpoint: "https://nominatim.openstreetmap.org/search",
  limit: 10,
  countrycodes: "",
  zoomToBoundingBox: true,
});
