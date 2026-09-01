/**
 * Diagnoses access to Lantmateriet's Belagenhetsadress Direkt API.
 *
 * The API sits behind an API gateway that answers 403 with code 900910 -
 * "scope validation failed" - when a token is genuine but not entitled to the
 * endpoint being called. That is indistinguishable from a bad token unless you
 * look at the body, and it can differ per group of operations, so this script
 * calls one endpoint from each group and reports what came back.
 *
 * Usage: npm run check-belagenhetsadress [-- <token>]
 * Falls back to LANTMATERIET_BELAGENHETSADRESS_TOKEN from .env when no token
 * is given on the command line.
 */
import "../common/env.js";

const DEFAULT_BASE_URL =
  "https://api.lantmateriet.se/distribution/produkter/belagenhetsadress/v4.2";

const token =
  process.argv[2] || process.env.LANTMATERIET_BELAGENHETSADRESS_TOKEN;
const baseUrl = (
  process.env.LANTMATERIET_BELAGENHETSADRESS_BASE_URL || DEFAULT_BASE_URL
).replace(/\/$/, "");

if (!token) {
  throw new Error(
    'No token. Pass one as an argument (npm run check-belagenhetsadress -- "eyJ...") or set LANTMATERIET_BELAGENHETSADRESS_TOKEN in .env.'
  );
}

/**
 * Decodes a JWT's payload without verifying it. We only want to read the claims
 * the gateway acts on; validating the signature is the gateway's job.
 */
const decodeClaims = (jwt) => {
  const payload = jwt.split(".")[1];
  if (!payload) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
};

const claims = decodeClaims(token);

console.log("Token");
console.log("-".repeat(60));
if (claims === null) {
  console.log(
    "  Could not decode the token as a JWT. If it is an opaque token that is fine - the calls below still tell you what it opens."
  );
} else {
  const expires = claims.exp ? new Date(claims.exp * 1000) : null;
  console.log(
    `  scope     : ${claims.scope ?? "(none - this is the usual cause of 900910)"}`
  );
  console.log(`  issuer    : ${claims.iss ?? "(none)"}`);
  console.log(`  client_id : ${claims.client_id ?? claims.azp ?? "(none)"}`);
  console.log(
    `  expires   : ${expires ? `${expires.toISOString()}${expires < new Date() ? "  *** EXPIRED ***" : ""}` : "(none)"}`
  );
}
console.log(`\nCalling ${baseUrl}\n`);

const probes = [
  {
    group: "Halsokontroll",
    path: "/health",
    withToken: false,
    note: "Reachability only - needs no entitlement.",
  },
  {
    group: "Autocomplete",
    path: "/autocomplete/adress?adress=g%C3%A4vle%20lantm&maxHits=5",
  },
  {
    group: "Referens",
    path: "/referens/fritext?adress=lantm%C3%A4terigatan%202%20g%C3%A4vle&maxHits=5",
    note: "What the plugin searches with today.",
  },
  {
    group: "Adress (punkt)",
    path: "/punkt?punktSrid=3006&koordinater=6728782.15,616919.80&includeData=basinformation&srid=3006",
    note: "Also the plugin's map-click lookup.",
  },
];

const results = [];

for (const probe of probes) {
  const headers = { Accept: "application/json" };
  if (probe.withToken !== false) {
    headers.Authorization = `Bearer ${token}`;
  }

  let status = null;
  let body = "";
  try {
    const response = await fetch(`${baseUrl}${probe.path}`, { headers });
    status = response.status;
    body = await response.text();
  } catch (error) {
    body = `network error: ${error.message}`;
  }

  let detail = "";
  let payload = null;
  try {
    payload = JSON.parse(body);
    detail = [
      payload.code,
      payload.description ?? payload.message ?? payload.reason,
    ]
      .filter(Boolean)
      .join(" - ");
  } catch {
    detail = body.slice(0, 160).replace(/\s+/g, " ");
  }

  const ok = status !== null && status >= 200 && status < 300;
  results.push({ ...probe, status, ok, payload });

  console.log(
    `${ok ? "OK  " : "FAIL"}  ${String(status ?? "---").padEnd(4)} ${probe.group}`
  );
  console.log(`        ${probe.path.split("?")[0]}`);
  if (probe.note) {
    console.log(`        ${probe.note}`);
  }
  if (!ok || process.env.VERBOSE === "true") {
    console.log(`        ${detail || "(empty body)"}`);
  }
  console.log();
}

// A reference response carries the id and label the plugin needs, but the
// product's JSON schema is not published, so print the shape when we get one.
const reference = results.find(
  (r) =>
    r.group === "Referens" &&
    r.ok &&
    Array.isArray(r.payload) &&
    r.payload.length > 0
);
if (reference) {
  console.log("First address reference, as returned:");
  console.log(JSON.stringify(reference.payload[0], null, 2));
  console.log();
}

const denied = results.filter((r) => r.status === 401 || r.status === 403);
const reachable = results.some((r) => r.ok);

console.log("Summary");
console.log("-".repeat(60));
if (denied.length === 0 && reachable) {
  console.log(
    "  Every endpoint answered. The token opens all groups the plugin uses."
  );
} else if (!reachable) {
  console.log(
    "  Nothing answered. Check the base URL, and whether this machine reaches api.lantmateriet.se at all (proxy, firewall)."
  );
} else if (denied.length === results.length - 1) {
  console.log(
    "  Only the unauthenticated health check passed, so the token opens nothing here.\n" +
      "  Usually that means it was minted without asking for a scope, or it belongs to\n" +
      "  the other environment (api-ver vs api). Mint it again with the scope named\n" +
      "  explicitly and compare the scope the response reports back."
  );
} else {
  console.log(
    `  Mixed: ${denied.map((d) => d.group).join(", ")} refused, the rest answered.\n` +
      "  That is per-operation scoping - the subscription opens some groups and not\n" +
      "  others. Ask Lantmateriet which scope the refused ones need, or have the\n" +
      "  plugin use a group that works."
  );
}
