/**
 * Canonical list of TipTap extensions used by both the live editor and the
 * headless serialiser/parser.  Import this everywhere instead of duplicating
 * the extension list.
 */

import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { HajkLink } from "../extensions/hajk-link";
import { TextSection } from "../extensions/text-section";
import { MediaFigure } from "../extensions/media-figure";
import { IframeEmbed } from "../extensions/iframe-embed";

export function buildExtensions(placeholder?: string) {
  return [
    StarterKit.configure({
      // Disable extensions the client doesn't support or that we replace
      blockquote: false,     // replaced by TextSection
      code: false,           // client doesn't support <code>
      codeBlock: false,      // client doesn't support <pre>
      horizontalRule: false, // client doesn't support <hr>
      // Disable StarterKit's built-in versions — we use our own below
      link: false,
      underline: false,
      strike: false,         // client doesn't support <s>/<del>; stripped on parse
      // Keep headings — client supports h1-h6
    }),
    // Our own underline (renders <u>, also parses <ins> defensively)
    Underline,
    // Hajk custom marks / nodes
    HajkLink,
    TextSection,
    MediaFigure,
    IframeEmbed,
    ...(placeholder !== undefined
      ? [Placeholder.configure({ placeholder })]
      : []),
  ];
}
