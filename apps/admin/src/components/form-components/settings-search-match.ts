const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "av",
  "de",
  "den",
  "det",
  "en",
  "et",
  "for",
  "från",
  "from",
  "i",
  "in",
  "is",
  "med",
  "och",
  "of",
  "on",
  "på",
  "som",
  "the",
  "til",
  "to",
  "var",
  "vid",
  "with",
  "är",
  "att",
  "för",
]);

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function valueAsSearchText(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function significantWords(term: string): string[] {
  return term
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0 && !SEARCH_STOP_WORDS.has(word));
}

function keywordMatchesWord(keyword: string, word: string): boolean {
  const kl = keyword.toLowerCase().trim();
  if (!kl) return false;
  if (kl.includes(word)) return true;
  if (word.length >= 4 && word.includes(kl)) return true;
  return false;
}

export function matchesSettingsSearch(
  term: string,
  keywords: string[],
  fields: string[],
  allValues?: Record<string, unknown>,
): boolean {
  const normalized = term.toLowerCase().trim();
  if (!normalized) return true;

  const words = significantWords(normalized);
  if (words.length === 0) return true;

  const matchesKeyword =
    keywords.some((keyword) =>
      keyword.toLowerCase().trim().includes(normalized),
    ) ||
    words.every((word) =>
      keywords.some((keyword) => keywordMatchesWord(keyword, word)),
    );

  const matchesValue =
    allValues != null &&
    fields.some((field) => {
      const text = valueAsSearchText(getNestedValue(allValues, field));
      if (!text) return false;
      const lower = text.toLowerCase();
      if (lower.includes(normalized)) return true;
      return words.every((word) => lower.includes(word));
    });

  return matchesKeyword || Boolean(matchesValue);
}
