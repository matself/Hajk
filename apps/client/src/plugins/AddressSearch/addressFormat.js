// Reading Lantmäteriet's Belägenhetsadress Direkt responses. Kept apart from
// the model because it is the part that depends on the API's field names, and
// so the part most likely to need editing when the API changes.
//
// Field names below are verified against live v4.2 responses, except where
// noted. The two families of endpoints answer in quite different shapes, which
// is why reading a label takes two routines rather than one:
//
//   /referens/*, /autocomplete/*  ->  flat objects with a ready-made label:
//       { "adress": "Täby Täby Lantmätarvägen 2 18753 Täby",
//         "objektidentitet": "76e01bf5-…" }
//
//   /{id}, /punkt                 ->  GeoJSON features whose properties nest
//       the parts and carry no label at all, so one has to be composed:
//       properties.adressomrade.faststalltNamn                 -> street name
//       properties.adressplatsattribut.adressplatsbeteckning   -> number
//       properties.adressplatsattribut.postnummer / .postort   -> postal
//
// The aliases cushion against version drift; the first name in each list is the
// one the API actually uses today.
const ID_FIELDS = ["objektidentitet", "objektIdentitet", "id"];
const LABEL_FIELDS = ["adress", "adressbeteckning", "etikett", "beteckning"];

// With splitAdress=true the reference endpoints populate a components object
// alongside the flat "adress" string. Its shape is the one thing here NOT
// verified against a live response, so these names are informed guesses. When
// none of them match, the caller falls back to the flat label, which is never
// worse than not asking for the components at all.
const COMPONENT_CONTAINERS = [
  "adressComponents",
  "adresskomponenter",
  "adressKomponenter",
  "components",
];
const COMPONENT_STREET = [
  "adressomrade",
  "adressomradesnamn",
  "gatunamn",
  "faststalltNamn",
];
const COMPONENT_NUMBER = [
  "adressplatsbeteckning",
  "adressplatsnummer",
  "nummer",
];
const COMPONENT_POSTORT = ["postort", "postortsnamn"];

const readString = (object, candidates) => {
  for (const key of candidates) {
    const value = object?.[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
};

// Swedish postal codes are written in two groups, "187 52" rather than "18752".
// The API returns them as a number.
const formatPostalCode = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 5
    ? `${digits.slice(0, 3)} ${digits.slice(3)}`
    : digits;
};

const joinLabel = (street, postal) =>
  [street, postal].filter(Boolean).join(", ") || null;

const readComponents = (item) => {
  for (const key of COMPONENT_CONTAINERS) {
    if (item?.[key] && typeof item[key] === "object") {
      return item[key];
    }
  }
  // The components may also be spread across the reference itself rather than
  // nested, in which case the street name is the tell.
  return readString(item, COMPONENT_STREET) ? item : null;
};

const composeComponentLabel = (components) => {
  const streetName = readString(components, COMPONENT_STREET);
  if (!streetName) {
    return null;
  }

  const number = readString(components, COMPONENT_NUMBER) ?? "";
  const street = [streetName, number].filter(Boolean).join(" ").trim();
  const postal = [
    formatPostalCode(components?.postnummer),
    readString(components, COMPONENT_POSTORT),
  ]
    .filter(Boolean)
    .join(" ");

  return joinLabel(street, postal);
};

/**
 * @summary Composes a label for an address feature, which the address
 * endpoints do not provide. Produces e.g. "Vallatorpsvägen 6, 187 52 Täby".
 * @description Deliberately shorter than the label the reference endpoints
 * return - "Täby Täby Vallatorpsvägen 6 18752 Täby" - which names the
 * municipality twice, once as kommun and once as kommundel.
 * @param {object} properties An OpenLayers feature's properties
 * @returns {string|null}
 */
export const composeAddressLabel = (properties) => {
  const area = properties?.adressomrade ?? {};
  const place = properties?.adressplatsattribut ?? {};

  // adressplatsbeteckning holds the number and, where an address has them, its
  // letter and position suffixes. Every string member of it belongs to the
  // designation, so join them all rather than naming fields we have not seen.
  const designation = Object.values(place.adressplatsbeteckning ?? {})
    .filter((value) => typeof value === "string" && value.length > 0)
    .join(" ");

  const street = [area.faststalltNamn, designation].filter(Boolean).join(" ");
  const postal = [formatPostalCode(place.postnummer), place.postort]
    .filter(Boolean)
    .join(" ");

  return joinLabel(street, postal);
};

/**
 * @summary Reads what is worth showing about an address feature.
 * @description insamlingslage says what the coordinate was actually measured
 * against - "Byggnad", "Ingång", and so on - which decides how literally the
 * marker should be read: an entrance point sits on the street side of the
 * building, a building point somewhere within its footprint.
 * @param {object} properties An OpenLayers feature's properties
 * @returns {{label: string|null, insamlingslage: string|null}}
 */
export const describeAddressFeature = (properties) => {
  const place = properties?.adressplatsattribut ?? {};

  return {
    label: composeAddressLabel(properties),
    insamlingslage:
      typeof place.insamlingslage === "string" ? place.insamlingslage : null,
  };
};

/**
 * @summary Reads one entry of a reference response into the {id, label} pair
 * the search field needs.
 * @description Prefers a label built from the splitAdress components, which
 * drops the duplicated municipality the flat string carries, and falls back to
 * the flat label. `unreadableComponents` is set when components were present
 * but none of the known field names matched - the caller reports it, since
 * that object names exactly what needs adding above.
 * @param {object} item
 * @returns {{id: string|null, label: string|null, unreadableComponents: object|null}}
 */
export const readAddressReference = (item) => {
  const components = readComponents(item);
  const componentLabel = components ? composeComponentLabel(components) : null;

  return {
    id: readString(item, ID_FIELDS),
    label: componentLabel ?? readString(item, LABEL_FIELDS),
    unreadableComponents: components && !componentLabel ? components : null,
  };
};

export const REFERENCE_FIELDS = { ID_FIELDS, LABEL_FIELDS };
