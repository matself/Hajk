import React from "react";

// Resolves dot-notation paths like "projection.code" or "metadata.owner"
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

interface SearchablePanelProps {
  keywords: string[];
  fields?: string[];
  allValues?: Record<string, unknown>;
  searchTerm: string;
  children: React.ReactNode;
}

// Wraps a form panel and hides it when searchTerm doesn't match.
// Matches against:
//   - keywords: panel/field labels (e.g. "url", "servertyp")
//   - fields + allValues: actual form values (e.g. the real URL string)
// When searchTerm is empty, always renders children (no filtering).
export default function SearchablePanel({
  keywords,
  fields = [],
  allValues = {},
  searchTerm,
  children,
}: SearchablePanelProps) {
  if (!searchTerm.trim()) return <>{children}</>;

  const term = searchTerm.toLowerCase().trim();

  const matchesKeyword = keywords.some((k) => k.toLowerCase().includes(term));
  const matchesValue = fields.some((f) => {
    const val = getNestedValue(allValues, f);
    return typeof val === "string" && val.toLowerCase().includes(term);
  });

  if (!matchesKeyword && !matchesValue) return null;
  return <>{children}</>;
}
