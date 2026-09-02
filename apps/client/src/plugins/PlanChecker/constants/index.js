// The draw settings PlanChecker hands its DrawModel. We only ever draw a
// single point (the click), so measurements would be noise.
export const DEFAULT_MEASUREMENT_SETTINGS = Object.freeze({
  showText: false,
  showArea: false,
  showLength: false,
  showPerimeter: false,
});

export const DEFAULT_OPTIONS = Object.freeze({
  // Path below mapserviceBase where the backend's NGP proxy is mounted.
  proxyPath: "detaljplanproxy",
  // Four-digit kommunkod. Each municipality is its own collection in NGP.
  kommunkod: "",
  // OGC API Features Part 1 has no `intersects`, only `bbox`, so a click is
  // sent as a small square around the coordinate. Half its side, in metres.
  // The exact hit test happens client-side afterwards.
  clickBufferMeters: 1,
  // Upper bound on regulations fetched for one click. A dense plan can carry
  // many, and the service pages with an `afterId` cursor rather than an offset.
  maxItems: 200,
  // Hajk layer id of the styled WMS layer to switch on with the plugin, if any.
  wmsLayerId: "",
});

// NGP delivers `användningsbestämmelse` before `egenskapsbestämmelse` in a
// plan document, and readers expect that order. Anything not listed keeps its
// arrival order after these.
export const REGULATION_TYPE_ORDER = Object.freeze([
  "användningsbestämmelse",
  "egenskapsbestämmelse",
  "administrativ bestämmelse",
]);

// The CRS the NGP collections advertise: the SWEREF 99 zones, SWEREF 99
// geographic, RT90 2.5 gon V and CRS84. Notably absent is EPSG:3857, which is
// what a Hajk map is quite likely to be in - hence the fallback below.
export const SUPPORTED_EPSG_CODES = Object.freeze([
  "3006",
  "3007",
  "3008",
  "3009",
  "3010",
  "3011",
  "3012",
  "3013",
  "3014",
  "3015",
  "3016",
  "3017",
  "3018",
  "4619",
  "3021",
]);

// SWEREF 99 TM, the collections' own storage CRS. Used when the map's
// projection is not one the service accepts.
export const FALLBACK_EPSG_CODE = "3006";
