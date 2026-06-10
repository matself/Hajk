import Strike from "@tiptap/extension-strike";
import { mergeAttributes } from "@tiptap/core";

/**
 * Strike extension that serialises to <del> (legacy-compatible) instead of
 * TipTap's default <s>.  Extends the stock Strike mark so toggle/set/unset
 * commands and input rules keep working.
 */
export const LegacyStrike = Strike.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      "del",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
