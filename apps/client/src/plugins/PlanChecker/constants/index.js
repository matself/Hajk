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
  // Which plan statuses to look for. Lantmateriet's own viewer asks for
  // "laga kraft" alone, which is the honest default: a plan that has not
  // gained legal force does not regulate anything yet.
  planStatuses: ["laga kraft"],
  // Upper bound on regulations fetched per plan. Lantmateriet's viewer sends
  // 1000; a plan with more regulations than this is reported as truncated.
  maxItems: 1000,
  // Hajk layer id of the styled WMS layer to switch on with the plugin, if any.
  wmsLayerId: "",
});

// NGP delivers these in a plan document in this order, and readers expect it.
// Anything unrecognised keeps its arrival order after these.
export const REGULATION_TYPE_ORDER = Object.freeze([
  "användningsbestämmelse",
  "egenskapsbestämmelse",
  "administrativ bestämmelse",
]);

// Swedish headings for the regulation types, matching Lantmateriet's viewer.
export const REGULATION_TYPE_HEADINGS = Object.freeze({
  användningsbestämmelse: "Användningsbestämmelser",
  egenskapsbestämmelse: "Egenskapsbestämmelser",
  "administrativ bestämmelse": "Administrativa bestämmelser",
});

// The CRS every geometry travels in, in both directions. It is the
// collections' own storage CRS, and what Lantmateriet's viewer uses.
export const SERVICE_PROJECTION = "EPSG:3006";
