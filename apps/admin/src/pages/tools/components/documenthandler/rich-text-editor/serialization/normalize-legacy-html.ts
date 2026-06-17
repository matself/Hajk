/**
 * Pre-pass that makes legacy Hajk document HTML safe to feed into TipTap's
 * ProseMirror parser.  Only DOM manipulations that fix structural issues or
 * ambiguities are performed; attribute values are never altered here.
 */

/**
 * Maps <ins> elements to <u> (legacy Draft.js occasionally emitted <ins> for
 * underline before the correct <u> was confirmed).
 *
 * Strips <s>, <strike>, and <del> to their plain text content: the Hajk
 * client does not support any strikethrough tag, so we preserve the text
 * rather than emitting an element that the client would silently drop.
 */
function replaceObsoleteTags(root: HTMLElement): void {
  // <ins> → <u>
  root.querySelectorAll("ins").forEach((el) => {
    const u = document.createElement("u");
    u.innerHTML = el.innerHTML;
    el.replaceWith(u);
  });
  // <s> / <strike> / <del> → unwrap to child nodes (keep text, drop tag)
  root.querySelectorAll("s, strike, del").forEach((el) => {
    while (el.firstChild) {
      el.parentNode?.insertBefore(el.firstChild, el);
    }
    el.remove();
  });
}

/**
 * Blockquotes in legacy HTML have inline-only content (text, <br>, marks).
 * If any have <p> children (can happen from editor round-trips), convert the
 * <p> boundaries to <br> so TipTap sees a flat inline sequence.
 */
function flattenBlockquoteContent(root: HTMLElement): void {
  root.querySelectorAll("blockquote").forEach((bq) => {
    const pTags = bq.querySelectorAll("p");
    if (pTags.length === 0) return;

    pTags.forEach((p, i) => {
      // Add a <br> separator between adjacent paragraphs (not after the last).
      if (i > 0) {
        bq.insertBefore(document.createElement("br"), p);
      }
      // Replace <p> with its children
      while (p.firstChild) {
        bq.insertBefore(p.firstChild, p);
      }
      p.remove();
    });
  });
}

/**
 * Strip any generic <span> that is NOT a Hajk iframe span.  These would
 * otherwise become unsupported content (the client drops them).
 */
function stripGenericSpans(root: HTMLElement): void {
  root.querySelectorAll("span").forEach((span) => {
    if (span.dataset.type === "iframe") return; // keep
    // Replace span with its child nodes
    while (span.firstChild) {
      span.parentNode?.insertBefore(span.firstChild, span);
    }
    span.remove();
  });
}

/**
 * Strip style="" and class="" attributes everywhere — they should never appear
 * in legacy documents and the client ignores them.
 */
function stripStylingAttrs(root: HTMLElement): void {
  root.querySelectorAll("[style], [class]").forEach((el) => {
    el.removeAttribute("style");
    el.removeAttribute("class");
  });
}

/**
 * Main entry point.
 *
 * Accepts a raw chapter.html string and returns a normalised HTML string
 * suitable for TipTap's `generateJSON` / `Editor.setContent`.
 *
 * IMPORTANT: This function mutates a temporary DOM element and never touches
 * the original string.  It must run in an environment that provides
 * `document` (browser or happy-dom in tests).
 */
export function normalizeLegacyHtml(html: string): string {
  if (!html || html.trim() === "") return "";

  const root = document.createElement("div");
  root.innerHTML = html;

  replaceObsoleteTags(root);
  flattenBlockquoteContent(root);
  stripGenericSpans(root);
  stripStylingAttrs(root);

  return root.innerHTML;
}
