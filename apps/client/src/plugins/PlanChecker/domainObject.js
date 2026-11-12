/**
 * @summary Reads the parts of a detaljplan domänobjekt that the search
 * catalog's referensobjekt does not carry.
 *
 * @description The domänobjekt (the item asset with role "detaljplan",
 * `application/vnd.lm.detaljplan.v4+json`) is a GeoJSON FeatureCollection: one
 * "detaljplan" feature plus every regulation. What it adds over the catalog:
 *
 *   - the plan's purpose (`syfte`) and decision details (`beslutsinformation`:
 *     type, dates, genomförandetid, diarienummer ...);
 *   - which användningsbestämmelse each regulation regulates
 *     (`reglerarAnvandningsbestammelse`), i.e. the plan's real hierarchy.
 *
 * What it does NOT carry, despite looking like it should: `anvandningsform`,
 * `kategori` and `underkategori` (the "Kvartersmark" / "Takvinkel" labels).
 * Those exist only on the referensobjekt, so the two sources are joined on the
 * regulation's `objektidentitet`, which is the referensobjekt's `id`.
 *
 * Geometry is deliberately ignored: here it sits in the plan's own CRS
 * (e.g. EPSG:3011), whereas the catalog hands out EPSG:3006.
 */
const PLAN_TYPE = "detaljplan";

/** Drop template markers such as " [text]" or " [laga kraft:text]" from a wording. */
export const stripPlaceholders = (text) =>
  (text || "")
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();

const isoDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

/** `start` (YYYY-MM-DD) plus whole months, or null when either is unusable. */
const addMonths = (start, months) => {
  const date = new Date(`${start}T00:00:00`);
  if (Number.isNaN(date.getTime()) || !Number.isFinite(Number(months))) {
    return null;
  }
  date.setMonth(date.getMonth() + Number(months));
  return isoDate(date);
};

/** One decision entry as short {label, value} pairs; empty values are dropped. */
const decisionRows = (entry) => {
  const inForce = Array.isArray(entry.datumLagakraft)
    ? entry.datumLagakraft[0]
    : entry.datumLagakraft;
  const months = entry.genomforandetid;
  const startsAt = entry.genomforandetidStartar || inForce;
  const endsAt = months && startsAt ? addMonths(startsAt, months) : null;

  return [
    ["Beslutstyp", entry.beslutstyp],
    ["Antagen", entry.datumAntagande],
    ["Laga kraft", inForce],
    [
      "Genomförandetid",
      months
        ? `${months} månader${endsAt ? `, till ${endsAt}` : ""}`
        : undefined,
    ],
    ["Instans", entry.instansInomKommunen],
    ["Diarienummer", entry.diarienummerKommun],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => ({ label, value: String(value) }));
};

/**
 * @returns {{purpose: string, decisions: Array<Array<{label: string, value: string}>>,
 *   regulates: Map<string, string[]>} | null} null when `data` is not a
 *   detaljplan domänobjekt.
 */
export function parseDomainObject(data) {
  if (!Array.isArray(data?.features)) return null;

  let plan = null;
  const regulates = new Map();
  for (const feature of data.features) {
    const props = feature?.properties;
    if (!props) continue;
    if (String(props["feature:typ"] || "").toLowerCase() === PLAN_TYPE) {
      plan = props;
    } else if (
      props.objektidentitet &&
      Array.isArray(props.reglerarAnvandningsbestammelse)
    ) {
      regulates.set(
        props.objektidentitet,
        props.reglerarAnvandningsbestammelse
      );
    }
  }
  if (!plan) return null;

  return {
    purpose: plan.syfte || "",
    decisions: (Array.isArray(plan.beslutsinformation)
      ? plan.beslutsinformation
      : []
    )
      .filter((entry) => entry && typeof entry === "object")
      .map(decisionRows)
      .filter((rows) => rows.length > 0),
    regulates,
  };
}
