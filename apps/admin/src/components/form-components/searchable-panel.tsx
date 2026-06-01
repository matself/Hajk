import React from "react";
import { matchesSettingsSearch } from "./settings-search-match";
import { PanelSearchScopeProvider } from "./searchable-field";

interface SearchablePanelProps {
  /** Panel heading label(s); matching the full title shows every field in the panel. */
  panelTitleKeywords?: string[];
  keywords: string[];
  fields?: string[];
  allValues?: Record<string, unknown>;
  searchTerm: string;
  children: React.ReactNode;
}

// Hides the whole panel when searchTerm does not match. When visible, optionally
// filters child SettingsSearchField rows to matching fields only.
export default function SearchablePanel({
  panelTitleKeywords = [],
  keywords,
  fields = [],
  allValues,
  searchTerm,
  children,
}: SearchablePanelProps) {
  if (!searchTerm.trim()) return <>{children}</>;

  const panelKeywords = [...panelTitleKeywords, ...keywords];
  if (!matchesSettingsSearch(searchTerm, panelKeywords, fields, allValues)) {
    return null;
  }

  return (
    <PanelSearchScopeProvider
      panelTitleKeywords={panelTitleKeywords}
      searchTerm={searchTerm}
    >
      {children}
    </PanelSearchScopeProvider>
  );
}
