import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { Fragment } from "@tiptap/pm/model";

function fragmentToInlineJson(fragment: Fragment): JSONContent[] {
  const result: JSONContent[] = [];

  fragment.forEach((node, _offset, index) => {
    if (index > 0) {
      const prev = fragment.child(index - 1);
      if (prev.isBlock && node.isBlock) {
        result.push({ type: "hardBreak" });
      }
    }

    if (node.type.name === "hardBreak") {
      result.push({ type: "hardBreak" });
      return;
    }

    if (node.isText) {
      const item: JSONContent = { type: "text", text: node.text ?? "" };
      if (node.marks.length) {
        item.marks = node.marks.map((mark) => ({
          type: mark.type.name,
          attrs: { ...mark.attrs },
        }));
      }
      result.push(item);
      return;
    }

    if (node.content.size > 0) {
      result.push(...fragmentToInlineJson(node.content));
    }
  });

  return result;
}

/** Extract inline-only TipTap JSON from a document range (for textSection content). */
export function getInlineContentFromRange(
  editor: Editor,
  from: number,
  to: number
): JSONContent[] {
  if (from === to) return [];
  const slice = editor.state.doc.slice(from, to);
  return fragmentToInlineJson(slice.content);
}

export function hasMeaningfulInlineContent(content: JSONContent[]): boolean {
  return content.some(
    (node) =>
      node.type === "hardBreak" ||
      (node.type === "text" &&
        typeof node.text === "string" &&
        node.text.replace(/\s/g, "").length > 0)
  );
}
