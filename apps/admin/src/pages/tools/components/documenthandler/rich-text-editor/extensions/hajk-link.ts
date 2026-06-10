import { Mark, mergeAttributes } from "@tiptap/core";

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
            href: el.getAttribute("href") ?? "",
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
            href: el.getAttribute("href") ?? "",
            documentName: "",
            headerIdentifier: "",
            maplink: el.getAttribute("data-maplink") ?? "",
            hoverText: "",
          };
        },
        priority: 55,
      },
      {
        tag: "a[data-link]",
        getAttrs(dom) {
          const el = dom as HTMLAnchorElement;
          return {
            linkType: "web",
            href: el.getAttribute("data-link") ?? el.getAttribute("href") ?? "",
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
        const attrs: Record<string, string> = {
          href: href || documentName,
          "data-document": documentName,
        };
        if (headerIdentifier) {
          attrs["data-header-identifier"] = headerIdentifier;
        }
        return ["a", mergeAttributes(attrs), 0];
      }
      case "map":
        return [
          "a",
          mergeAttributes({ href: maplink, "data-maplink": maplink }),
          0,
        ];
      case "hover":
        return ["a", mergeAttributes({ "data-hover": hoverText }), 0];
      case "web":
      default:
        return [
          "a",
          mergeAttributes({ href, "data-link": href }),
          0,
        ];
    }
  },
});
