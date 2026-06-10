/**
 * Headless HTML ↔ TipTap JSON roundtrip utilities.
 *
 * These functions are independent of any React component and can be called
 * from tests (happy-dom environment) as well as from the live editor's
 * onChange callback.
 */

import { generateHTML, generateJSON } from "@tiptap/core";
import { normalizeLegacyHtml } from "./normalize-legacy-html";
import { buildExtensions } from "./extensions";

const extensions = buildExtensions();

/**
 * Parse a legacy `chapter.html` string into TipTap JSON.
 *
 * @param html - Raw HTML from the document JSON (may be "" for empty chapters).
 */
export function parseLegacyHtml(html: string): Record<string, unknown> {
  const normalized = normalizeLegacyHtml(html);
  if (!normalized) {
    // Return an empty TipTap document
    return { type: "doc", content: [] };
  }
  return generateJSON(normalized, extensions) as Record<string, unknown>;
}

/**
 * Serialize a TipTap JSON document back to legacy-compatible HTML.
 *
 * Post-processing applied:
 * - Empty paragraphs (`<p></p>` or `<p><br></p>`) are removed.
 * - Result is trimmed; empty document returns "".
 */
export function serializeToLegacyHtml(
  doc: Record<string, unknown>
): string {
  const raw = generateHTML(doc, extensions);
  return postProcess(raw);
}

/**
 * Convenience: normalize → generateJSON → generateHTML → postProcess.
 * Useful for roundtrip tests.
 */
export function roundtripHtml(html: string): string {
  const doc = parseLegacyHtml(html);
  return serializeToLegacyHtml(doc);
}

// ─── Post-processing ──────────────────────────────────────────────────────────

/**
 * Remove empty paragraphs that TipTap emits for empty documents or empty
 * trailing paragraphs, matching the legacy editor's behaviour.
 */
function postProcess(html: string): string {
  // Strip <p></p> and <p><br></p> — both forms can appear
  const result = html
    .replace(/<p><br\s*\/?><\/p>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .trim();

  return result;
}
