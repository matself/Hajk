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
 * Remove empty paragraphs and unwrap list-item paragraphs.
 *
 * TipTap's StarterKit wraps list-item content in a <p>, giving
 * `<li><p>text</p></li>`.  Legacy documents (and the Hajk client) expect the
 * flat form `<li>text</li>`, so we unwrap the inner <p> when it is the sole
 * element child of an <li>.
 */
function postProcess(html: string): string {
  // Strip <p></p> and <p><br></p> — both forms can appear
  let result = html
    .replace(/<p><br\s*\/?><\/p>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .trim();

  if (!result) return result;

  result = unwrapListItemParagraphs(result);

  return result;
}

/**
 * For every `<li>` whose only element child is a single `<p>`, hoist the
 * paragraph's children directly into the `<li>` and remove the `<p>` wrapper.
 */
function unwrapListItemParagraphs(html: string): string {
  const root = document.createElement("div");
  root.innerHTML = html;

  root.querySelectorAll("li").forEach((li) => {
    const elementChildren = Array.from(li.childNodes).filter(
      (n): n is Element => n.nodeType === 1
    );
    if (
      elementChildren.length === 1 &&
      elementChildren[0].tagName === "P"
    ) {
      const p = elementChildren[0] as HTMLElement;
      while (p.firstChild) {
        li.insertBefore(p.firstChild, p);
      }
      p.remove();
    }
  });

  return root.innerHTML;
}
