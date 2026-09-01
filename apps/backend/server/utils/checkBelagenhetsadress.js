/**
 * Diagnoses access to Lantmateriet's Belagenhetsadress Direkt API.
 *
 * Two things make a failure here hard to read. The API gateway answers 403 with
 * code 900910 - "scope validation failed" - when a token is genuine but not
 * entitled to the endpoint, which looks nothing like a scope problem unless you
 * read the body. And the products under api.lantmateriet.se/distribution differ
 * in which authentication they actually want: Markhojd, on the same host, uses
 * Basic auth with Geotorget credentials rather than a bearer token.
 *
 * So rather than guess, this calls one endpoint from each group with every
 * credential it was given and prints the result as a matrix.
 *
 * Usage: npm run check-belagenhetsadress [-- <token> [user:password]]
 * Falls back to LANTMATERIET_BELAGENHETSADRESS_TOKEN, _USER and _PASSWORD
 * from .env for anything not passed on the command line.
 */
import "../common/env.js";

const DEFAULT_BASE_URL =
  "https://api.lantmateriet.se/distribution/produkter/belagenhetsadress/v4.2";

const baseUrl = (
  process.env.LANTMATERIET_BELAGENHETSADRESS_BASE_URL || DEFAULT_BASE_URL
).replace(/\/$/, "");

const token =
  process.argv[2] || process.env.LANTMATERIET_BELAGENHETSADRESS_TOKEN;

const [argUser, ...argPasswordParts] = (process.argv[3] ?? "").split(":");
const user = argUser || process.env.LANTMATERIET_BELAGENHETSADRESS_USER;
const password =
  argPasswordParts.join(":") ||
  process.env.LANTMATERIET_BELAGENHETSADRESS_PASSWORD;

/**
 * Decodes a JWT's payload without verifying it. We only want to read the claims
 * the gateway acts on; validating the signature is the gateway's job.
 */
const decodeClaims = (jwt) => {
  const payload = jwt?.split(".")[1];
  if (!payload) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
};

const modes = [{ name: "none", header: null }];
if (token) {
  modes.push({ name: "bearer", header: `Bearer ${token}` });
}
if (user) {
  modes.push({
    name: "basic",
    header: `Basic ${Buffer.from(`${user}:${password ?? ""}`).toString("base64")}`,
  });
}

if (modes.length === 1) {
  throw new Error(
    'No credentials to test. Pass a token and/or user:password (npm run check-belagenhetsadress -- "eyJ..." "user:password"), or set LANTMATERIET_BELAGENHETSADRESS_TOKEN / _USER / _PASSWORD in .env.'
  );
}

const probes = [
  { group: "health", path: "/health" },
  {
    group: "autocomplete",
    path: "/autocomplete/adress?adress=g%C3%A4vle%20lantm&maxHits=5",
  },
  {
    group: "referens",
    path: "/referens/fritext?adress=lantm%C3%A4terigatan%202%20g%C3%A4vle&maxHits=5",
  },
  {
    group: "punkt",
    path: "/punkt?punktSrid=3006&koordinater=6728782.15,616919.80&includeData=basinformation&srid=3006",
  },
];

const claims = decodeClaims(token);
if (token) {
  console.log("Token");
  console.log("-".repeat(64));
  if (claims === null) {
    console.log(
      "  Not a decodable JWT - opaque tokens are fine, the calls still tell us."
    );
  } else {
    const expires = claims.exp ? new Date(claims.exp * 1000) : null;
    console.log(`  scope   : ${claims.scope ?? "(none)"}`);
    console.log(`  issuer  : ${claims.iss ?? "(none)"}`);
    console.log(
      `  expires : ${expires ? `${expires.toISOString()}${expires < new Date() ? "  *** EXPIRED ***" : ""}` : "(none)"}`
    );
  }
  console.log();
}

console.log(`Calling ${baseUrl}`);
console.log(`Credentials tested: ${modes.map((m) => m.name).join(", ")}\n`);

const grid = new Map();
const notes = [];

for (const probe of probes) {
  for (const mode of modes) {
    const headers = { Accept: "application/json" };
    if (mode.header) {
      headers.Authorization = mode.header;
    }

    let cell = "";
    try {
      const response = await fetch(`${baseUrl}${probe.path}`, { headers });
      const body = await response.text();
      cell = String(response.status);

      const challenge = response.headers.get("www-authenticate");
      if (challenge) {
        notes.push(
          `  ${probe.group} (${mode.name}) was challenged with: ${challenge}`
        );
      }

      try {
        const parsed = JSON.parse(body);
        if (parsed.code && String(parsed.code) !== "200") {
          notes.push(
            `  ${probe.group} (${mode.name}) ${parsed.code}: ${parsed.description ?? parsed.message ?? parsed.reason ?? ""}`.trimEnd()
          );
        }
        if (
          response.ok &&
          probe.group === "referens" &&
          Array.isArray(parsed) &&
          parsed.length > 0
        ) {
          grid.set("sample", parsed[0]);
        }
      } catch {
        // Not JSON. The status alone is what the matrix needs.
      }
    } catch (error) {
      cell = "ERR";
      notes.push(
        `  ${probe.group} (${mode.name}) network error: ${error.message}`
      );
    }

    grid.set(`${probe.group}|${mode.name}`, cell);
  }
}

const width = 22;
console.log(
  "endpoint".padEnd(width) + modes.map((m) => m.name.padEnd(8)).join("")
);
console.log("-".repeat(width + modes.length * 8));
for (const probe of probes) {
  console.log(
    probe.group.padEnd(width) +
      modes
        .map((m) => (grid.get(`${probe.group}|${m.name}`) ?? "?").padEnd(8))
        .join("")
  );
}
console.log();

if (notes.length > 0) {
  console.log("What the service said");
  console.log("-".repeat(64));
  console.log([...new Set(notes)].join("\n"));
  console.log();
}

const sample = grid.get("sample");
if (sample) {
  console.log("First address reference, as returned:");
  console.log(JSON.stringify(sample, null, 2));
  console.log();
}

// Which credential, if any, opened the endpoints that matter?
const dataProbes = probes.filter((p) => p.group !== "health");
const worksWith = modes.filter((mode) =>
  dataProbes.every((probe) => {
    const status = Number(grid.get(`${probe.group}|${mode.name}`));
    return status >= 200 && status < 300;
  })
);

console.log("Summary");
console.log("-".repeat(64));
if (worksWith.length > 0) {
  const best = worksWith.find((m) => m.name !== "none") ?? worksWith[0];
  console.log(
    `  Use ${best.name} authentication - it opened every endpoint the plugin needs.`
  );
} else {
  const partial = modes.filter((mode) =>
    dataProbes.some((probe) => {
      const status = Number(grid.get(`${probe.group}|${mode.name}`));
      return status >= 200 && status < 300;
    })
  );
  if (partial.length > 0) {
    console.log(
      `  Partial: ${partial.map((m) => m.name).join(", ")} opened some groups but not all.\n` +
        "  That is per-operation scoping. Ask Lantmateriet for the missing scope, or\n" +
        "  point the plugin at a group that works."
    );
  } else {
    console.log(
      "  No credential opened anything. Check the notes above: a 'WWW-Authenticate: Basic'\n" +
        "  challenge means the service wants Geotorget username and password rather than a\n" +
        "  bearer token, and a 900910 means the token is real but its scope does not cover\n" +
        "  the endpoint."
    );
  }
}
