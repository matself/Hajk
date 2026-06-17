/**
 * Converts a human-readable title into a URL-safe lowercase slug.
 *
 * Rules:
 * - NFKD-normalize and strip combining diacritics (å/ä → a, ö → o, etc.)
 * - Lowercase
 * - Replace runs of characters outside [a-z0-9_] with a single hyphen
 * - Trim leading/trailing hyphens
 * - Falls back to "item" if the result is empty
 */
export function slugify(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return base || "item";
}

/**
 * Returns a slug guaranteed to be unique within the provided set of existing slugs.
 * Appends -2, -3, … until a free slot is found.
 */
export function uniqueSlug(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
