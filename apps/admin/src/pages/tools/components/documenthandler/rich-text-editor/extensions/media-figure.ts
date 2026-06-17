import { Node, mergeAttributes } from "@tiptap/core";

export type MediaType = "image" | "video" | "audio";

export interface MediaFigureAttrs {
  src: string;
  alt: string;
  mediaType: MediaType;
  /** Numeric pixels, or null when not set */
  width: number | null;
  /** Numeric pixels, or null when not set */
  height: number | null;
  caption: string;
  source: string;
  popup: boolean;
  position: string;
}

/**
 * Block node for images, videos, and audio clips.
 *
 * Serialises to:
 *   <figure>
 *     <img src="…" alt="…" [data-type="video|audio"]
 *          [data-image-width="Npx"] [data-image-height="Npx"]
 *          [data-caption="…"] [data-source="…"]
 *          [data-image-popup=""]
 *          [data-image-position="left|center|right|floatLeft|floatRight"]
 *     />
 *   </figure>
 *
 * Important serialisation rules:
 * - For plain images, data-type is OMITTED (legacy behaviour).
 * - px suffix is only added when width/height have a value (never bare "px").
 * - data-image-popup is emitted as presence-only "" when popup=true, omitted otherwise.
 * - audio ignores width/height.
 */
export const MediaFigure = Node.create<MediaFigureAttrs>({
  name: "mediaFigure",
  group: "block",
  atom: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      mediaType: { default: "image" },
      width: { default: null },
      height: { default: null },
      caption: { default: "" },
      source: { default: "" },
      popup: { default: false },
      position: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        // Match a <figure> containing an <img> (not an iframe span)
        tag: "figure",
        getAttrs(dom) {
          const el = dom;
          const img = el.querySelector("img");
          if (!img) return false;
          // Skip if this figure holds an iframe span
          if (el.querySelector('span[data-type="iframe"]')) return false;

          const rawType = img.getAttribute("data-type") ?? "image";
          const mediaType: MediaType =
            rawType === "video" || rawType === "audio" ? rawType : "image";

          const rawW = img.getAttribute("data-image-width") ?? "";
          const rawH = img.getAttribute("data-image-height") ?? "";
          const width = rawW ? parseInt(rawW, 10) || null : null;
          const height = rawH ? parseInt(rawH, 10) || null : null;

          return {
            src: img.getAttribute("src") ?? "",
            alt: img.getAttribute("alt") ?? "",
            mediaType,
            width,
            height,
            caption: img.getAttribute("data-caption") ?? "",
            source: img.getAttribute("data-source") ?? "",
            popup: img.hasAttribute("data-image-popup"),
            position: img.getAttribute("data-image-position") ?? "",
          };
        },
        priority: 60,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      src,
      alt,
      mediaType,
      width,
      height,
      caption,
      source,
      popup,
      position,
    } = HTMLAttributes as MediaFigureAttrs;

    const imgAttrs: Record<string, string> = {
      src: src ?? "",
      alt: alt ?? "",
    };

    if (mediaType === "video" || mediaType === "audio") {
      imgAttrs["data-type"] = mediaType;
    }
    // Width/height with px suffix — only if value exists; audio skips them
    if (mediaType !== "audio") {
      if (width) imgAttrs["data-image-width"] = `${width}px`;
      if (height) imgAttrs["data-image-height"] = `${height}px`;
    }
    if (caption) imgAttrs["data-caption"] = caption;
    if (source) imgAttrs["data-source"] = source;
    if (popup) imgAttrs["data-image-popup"] = "";
    if (position) imgAttrs["data-image-position"] = position;

    return ["figure", mergeAttributes({}), ["img", mergeAttributes(imgAttrs)]];
  },
});
