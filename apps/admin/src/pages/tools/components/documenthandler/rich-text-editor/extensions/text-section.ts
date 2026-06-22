import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textSection: {
      /** Remove the fact box wrapper and keep its inline content as a paragraph. */
      unwrapTextSection: () => ReturnType;
    };
  }
}

export interface TextSectionAttrs {
  backgroundColor: string;
  dividerColor: string;
  isAccordion: boolean;
  accordionTitle: string;
}

/**
 * "Faktaruta" / accordion block.
 *
 * Serialises to:
 *   <blockquote
 *     data-text-section=""
 *     data-accordion="true|false"
 *     [data-accordion-title="…"]
 *     [data-background-color="…"]
 *     [data-divider-color="…"]
 *   >…inline content…</blockquote>
 *
 * Rules that are critical for client-compatibility:
 * - `data-text-section` MUST be present (even as empty string); client renders
 *   nothing without it (ContentComponentFactory BlockQuote:253).
 * - `data-accordion` MUST be the exact string "true" or "false" (not a boolean).
 * - Content must stay inline-only; nesting <p> tags breaks client rendering.
 */
export const TextSection = Node.create<TextSectionAttrs>({
  name: "textSection",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      backgroundColor: { default: "" },
      dividerColor: { default: "" },
      isAccordion: { default: false },
      accordionTitle: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "blockquote[data-text-section]",
        getAttrs(dom) {
          const el = dom;
          const rawAccordion = el.getAttribute("data-accordion") ?? "false";
          return {
            backgroundColor:
              el.getAttribute("data-background-color") ?? "",
            dividerColor:
              el.getAttribute("data-divider-color") ?? "",
            isAccordion: rawAccordion === "true",
            accordionTitle:
              el.getAttribute("data-accordion-title") ?? "",
          };
        },
        priority: 60,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      backgroundColor,
      dividerColor,
      isAccordion,
      accordionTitle,
    } = HTMLAttributes as TextSectionAttrs;

    const attrs: Record<string, string> = {
      "data-text-section": "",
      "data-accordion": isAccordion ? "true" : "false",
    };

    if (accordionTitle) {
      attrs["data-accordion-title"] = accordionTitle;
    }
    if (backgroundColor) {
      attrs["data-background-color"] = backgroundColor;
    }
    if (dividerColor) {
      attrs["data-divider-color"] = dividerColor;
    }

    return ["blockquote", mergeAttributes(attrs), 0];
  },

  addCommands() {
    return {
      unwrapTextSection:
        () =>
        ({ editor, tr, state, dispatch }) => {
          if (!editor.isActive(this.name)) return false;

          const { $from } = state.selection;
          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name !== this.name) continue;

            const pos = $from.before(depth);
            const paragraph = state.schema.nodes.paragraph.create(
              null,
              node.content
            );
            tr.replaceWith(pos, pos + node.nodeSize, paragraph);
            if (dispatch) dispatch(tr);
            return true;
          }

          return false;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Enter inside a text-section inserts a hard break (not a new block)
      Enter: ({ editor }) => {
        if (!editor.isActive("textSection")) return false;
        return editor.commands.setHardBreak();
      },
      // Shift+Enter exits the text-section by inserting a paragraph after
      "Shift-Enter": ({ editor }) => {
        if (!editor.isActive("textSection")) return false;
        return editor.commands.exitCode();
      },
    };
  },
});
