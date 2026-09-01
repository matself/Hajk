// Reference systems accepted by Lantmäteriet's Belägenhetsadress Direkt API.
// The product speaks SWEREF 99 only - there is no WGS84 option - so a map in
// any other projection has its coordinates transformed via FALLBACK_SRID.
export const SUPPORTED_SRIDS = Object.freeze([
  3006, 3007, 3008, 3009, 3010, 3011, 3012, 3013, 3014, 3015, 3016, 3017, 3018,
]);

// SWEREF 99 TM, the national system. Used whenever the map's own projection
// isn't one the API understands.
export const FALLBACK_SRID = 3006;

// The API rejects free-text searches shorter than this (3 - 300 characters).
export const MIN_SEARCH_LENGTH = 3;

// Default options for the AddressSearch-plugin. Can be overridden per-map via
// admin options.
export const DEFAULT_OPTIONS = Object.freeze({
  // Appended to mapserviceBase to reach the backend proxy. Only change this if
  // the proxy has been mounted somewhere else.
  proxyPath: "belagenhetsadressproxy",
  // Credentials, sent on every call. Leave all three empty when they are
  // configured server-side in .env, which is the better place for them.
  // Basic auth with Geotorget credentials is what these endpoints ask for with
  // a "WWW-Authenticate: Basic" challenge; a bearer token works where the
  // subscription grants the matching scope, and takes precedence when set.
  username: "",
  password: "",
  token: "",
  maxHits: 15,
  // Milliseconds to wait after the last keystroke before searching. Every
  // search is a call against Lantmäteriet, so this is the knob that decides
  // how chatty the plugin is.
  debounceTime: 350,
  // Four-digit municipality code to restrict the search to. Empty = all of Sweden.
  kommunkod: "",
  // Exclude addresses with status "Reserverad", which are assigned but not yet in use.
  onlyCurrentAddresses: true,
  // Zoom level to use when a result is selected. Address points have no extent
  // of their own, so there is nothing to fit to.
  zoom: 16,
  // Allow picking an address by clicking in the map (GET /punkt).
  enableMapClick: true,
});
