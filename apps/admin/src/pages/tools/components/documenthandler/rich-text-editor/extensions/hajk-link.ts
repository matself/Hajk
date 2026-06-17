import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * Strips URLs with dangerous schemes (javascript:, vbscript:, non-image data:).
 * Returns an empty string for any unsafe input so it is never serialised into HTML.
 */
export function sanitizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Allow relative URLs (starting with /, ./, #, ?)
  if (/^[/?#.]/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const safe = ["http:", "https:", "mailto:"];
    if (safe.includes(url.protocol)) return trimmed;
    // Allow data: only for images (used by media embeds)
    if (url.protocol === "data:" && trimmed.startsWith("data:image/")) return trimmed;
    return "";
  } catch {
    // Relative URL that didn't match the prefix check (e.g. bare anchor text) — block it
    return "";
  }
}

export type HajkLinkType = "web" | "document" | "map" | "hover";

export interface HajkLinkAttrs {
  linkType: HajkLinkType;
  /** Used by web links (also mirrored into data-link) */
  href: string;
  /** data-document value */
  documentName: string;
  /** data-header-identifier value */
  headerIdentifier: string;
  /** data-maplink value */
  maplink: string;
  /** data-hover tooltip text */
  hoverText: string;
}

/**
 * Custom link mark that serialises to the four Hajk link flavours:
 *
 *   web:      <a href="…" data-link="…">
 *   document: <a href="…" data-document="…" [data-header-identifier="…"]>
 *   map:      <a href="…" data-maplink="…">
 *   hover:    <a data-hover="…">
 *
 * A bare <a> with none of these data-* attrs would be silently dropped by the
 * client, so we always emit at least one.
 */
export const HajkLink = Mark.create<HajkLinkAttrs>({
  name: "hajkLink",

  // Don't auto-extend when typing at the edge of a link
  inclusive: false,

  addAttributes() {
    return {
      linkType: { default: "web" },
      href: { default: "" },
      documentName: { default: "" },
      headerIdentifier: { default: "" },
      maplink: { default: "" },
      hoverText: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-document]",
        getAttrs(dom) {
          const el = dom as HTMLAnchorElement;
          return {
            linkType: "document",
            href: sanitizeUrl(el.getAttribute("href") ?? ""),
            documentName: el.getAttribute("data-document") ?? "",
            headerIdentifier:
              el.getAttribute("data-header-identifier") ?? "",
            maplink: "",
            hoverText: "",
          };
        },
        priority: 60,
      },
      {
        tag: "a[data-maplink]",
        getAttrs(dom) {
          const el = dom as HTMLAnchorElement;
          return {
            linkType: "map",
            href: sanitizeUrl(el.getAttribute("href") ?? ""),
            documentName: "",
            headerIdentifier: "",
            maplink: sanitizeUrl(el.getAttribute("data-maplink") ?? ""),
            hoverText: "",
          };
        },
        priority: 55,
      },
      {
        tag: "a[data-link]",
        getAttrs(dom) {
          const el = dom as HTMLAnchorElement;
          const raw = el.getAttribute("data-link") ?? el.getAttribute("href") ?? "";
          return {
            linkType: "web",
            href: sanitizeUrl(raw),
            documentName: "",
            headerIdentifier: "",
            maplink: "",
            hoverText: "",
          };
        },
        priority: 50,
      },
      {
        tag: "a[data-hover]",
        getAttrs(dom) {
          const el = dom as HTMLAnchorElement;
          return {
            linkType: "hover",
            href: "",
            documentName: "",
            headerIdentifier: "",
            maplink: "",
            hoverText: el.getAttribute("data-hover") ?? "",
          };
        },
        priority: 45,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { linkType, href, documentName, headerIdentifier, maplink, hoverText } =
      HTMLAttributes as HajkLinkAttrs;

    switch (linkType) {
      case "document": {
        // The href for document links is the document slug (not a navigable URL),
        // so it must not go through sanitizeUrl, which would reject bare slugs.
        // The Hajk client reads data-document; href is kept for legacy parity only.
        const attrs: Record<string, string> = {
          href: documentName,
          "data-document": documentName,
        };
        if (headerIdentifier) {
          attrs["data-header-identifier"] = headerIdentifier;
        }
        return ["a", mergeAttributes(attrs), 0];
      }
      case "map": {
        const safeMaplink = sanitizeUrl(maplink);
        return [
          "a",
          mergeAttributes({ href: safeMaplink, "data-maplink": safeMaplink }),
          0,
        ];
      }
      case "hover":
        return ["a", mergeAttributes({ "data-hover": hoverText }), 0];
      case "web":
      default: {
        const safeHref = sanitizeUrl(href);
        return [
          "a",
          mergeAttributes({ href: safeHref, "data-link": safeHref }),
          0,
        ];
      }
    }
  },
});
