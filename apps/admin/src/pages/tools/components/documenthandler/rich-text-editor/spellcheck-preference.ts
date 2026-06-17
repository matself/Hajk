import type { Editor } from "@tiptap/react";

/** Apply browser spellcheck + lang on the TipTap contenteditable root. */
export function applyEditorSpellcheck(
  editor: Editor,
  enabled: boolean,
  lang: string
): void {
  editor.view.dom.spellcheck = enabled;
  editor.view.dom.setAttribute("spellcheck", enabled ? "true" : "false");
  if (enabled) {
    editor.view.dom.setAttribute("lang", lang);
  } else {
    editor.view.dom.removeAttribute("lang");
  }
}
