import { Node, mergeAttributes } from "@tiptap/core";

export interface IframeEmbedAttrs {
  src: string;
  title: string;
  /** Unitless number string (no px), or empty */
  width: string;
  /** Unitless number string (no px), or empty */
  height: string;
  position: string;
}

const IFRAME_TITLE_PLACEHOLDER = "<iframetitlehere>";

/**
 * Block node for embedded iframes.
 *
 * Serialises to the legacy span-in-figure shape:
 *   <figure>
 *     <span
 *       data-type="iframe"
 *       data-iframe-src="…"
 *       data-iframe-title="…"
 *       data-iframe-width="…"
 *       data-iframe-height="…"
 *       data-image-position="…"
 *     >TITLE or &lt;iframetitlehere&gt;</span>
 *   </figure>
 *
 * On parse, the legacy placeholder text "<iframetitlehere>" is normalised to "".
 */
export const IframeEmbed = Node.create<IframeEmbedAttrs>({
  name: "iframeEmbed",
  group: "block",
  atom: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      src: { default: "" },
      title: { default: "" },
      width: { default: "" },
      height: { default: "" },
      position: { default: "left" },
    };
  },

  parseHTML() {
    return [
      {
        // Prefer the figure-wrapped shape
        tag: 'figure:has(span[data-type="iframe"])',
        getAttrs(dom) {
          const el = dom;
          return getIframeAttrs(el.querySelector('span[data-type="iframe"]')!);
        },
        priority: 70,
      },
      {
        // Bare span (without figure) — older documents may have this
        tag: 'span[data-type="iframe"]',
        getAttrs(dom) {
          return getIframeAttrs(dom);
        },
        priority: 65,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, title, width, height, position } =
      HTMLAttributes as IframeEmbedAttrs;

    const displayTitle = title || IFRAME_TITLE_PLACEHOLDER;

    const spanAttrs: Record<string, string> = {
      "data-type": "iframe",
      "data-iframe-src": src ?? "",
      "data-iframe-title": title ?? "",
      "data-iframe-width": width ?? "",
      "data-iframe-height": height ?? "",
      "data-image-position": position || "left",
    };

    return [
      "figure",
      mergeAttributes({}),
      ["span", mergeAttributes(spanAttrs), displayTitle],
    ];
  },
});

function getIframeAttrs(span: HTMLElement): IframeEmbedAttrs {
  const rawTitle =
    span.getAttribute("data-iframe-title") ??
    span.textContent?.trim() ??
    "";
  const title =
    rawTitle === IFRAME_TITLE_PLACEHOLDER ? "" : rawTitle;

  return {
    src: span.getAttribute("data-iframe-src") ?? "",
    title,
    width: span.getAttribute("data-iframe-width") ?? "",
    height: span.getAttribute("data-iframe-height") ?? "",
    position: span.getAttribute("data-image-position") ?? "left",
  };
}
