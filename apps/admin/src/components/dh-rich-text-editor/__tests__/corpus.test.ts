/**
 * Corpus roundtrip test.
 *
 * Runs the full parse → serialize roundtrip over every chapter.html found in
 * the document-examples directories, then verifies semantic invariants.
 * This is the main regression net against the real document corpus.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readdirSync, statSync } from "fs";
import { describe, it, expect } from "vitest";
import { roundtripHtml } from "../serialization/serialize";

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

const CORPUS_DIR = resolve(
  __dir,
  "../../../../../../apps/legacy/document-examples"
);

// ─── Corpus loader ────────────────────────────────────────────────────────────

interface Chapter {
  header?: string;
  html?: string;
  chapters?: Chapter[];
}

function walk(dir: string): string[] {
  const result: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      if (entry.includes("Zone.Identifier")) continue;
      const full = resolve(dir, entry);
      if (statSync(full).isDirectory()) {
        result.push(...walk(full));
      } else if (entry.endsWith(".json")) {
        result.push(full);
      }
    }
  } catch {
    /* corpus dir may not exist in CI */
  }
  return result;
}

function loadCorpus(): { file: string; html: string; header: string }[] {
  const files = walk(CORPUS_DIR);
  const results: { file: string; html: string; header: string }[] = [];

  for (const file of files) {
    try {
      const raw = readFileSync(file, "utf-8");
      const doc = JSON.parse(raw) as { chapters?: Chapter[] };
      function traverse(chapters: Chapter[], depth = 0) {
        for (const ch of chapters ?? []) {
          if (typeof ch.html === "string") {
            results.push({ file, html: ch.html, header: ch.header ?? "" });
          }
          if (Array.isArray(ch.chapters)) traverse(ch.chapters, depth + 1);
        }
      }
      traverse(doc.chapters ?? []);
    } catch {
      /* skip unreadable files */
    }
  }
  return results;
}

const corpus = loadCorpus();

// ─── Invariant helpers ────────────────────────────────────────────────────────

function parseDom(html: string): Document {
  return new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
}

function checkInvariants(result: string, context: string) {
  if (!result) return; // empty chapter is fine

  const dom = parseDom(result);

  // No blockquote without data-text-section
  dom.querySelectorAll("blockquote").forEach((bq) => {
    expect(
      bq.hasAttribute("data-text-section"),
      `[${context}] blockquote missing data-text-section`
    ).toBe(true);
  });

  // data-accordion must be string true/false
  dom.querySelectorAll("blockquote[data-accordion]").forEach((bq) => {
    const val = bq.getAttribute("data-accordion");
    expect(
      val === "true" || val === "false",
      `[${context}] data-accordion="${val}" is not "true"/"false"`
    ).toBe(true);
  });

  // No <p> inside blockquote
  dom.querySelectorAll("blockquote > p").forEach(() => {
    expect.fail(`[${context}] <p> found inside <blockquote>`);
  });

  // image width/height must have px suffix
  dom.querySelectorAll("img[data-image-width]").forEach((img) => {
    const w = img.getAttribute("data-image-width")!;
    expect(
      w.endsWith("px") && w.length > 2,
      `[${context}] data-image-width="${w}" invalid`
    ).toBe(true);
  });
  dom.querySelectorAll("img[data-image-height]").forEach((img) => {
    const h = img.getAttribute("data-image-height")!;
    expect(
      h.endsWith("px") && h.length > 2,
      `[${context}] data-image-height="${h}" invalid`
    ).toBe(true);
  });

  // data-image-popup must be empty string when present
  dom.querySelectorAll("img[data-image-popup]").forEach((img) => {
    expect(
      img.getAttribute("data-image-popup"),
      `[${context}] data-image-popup must be ""`
    ).toBe("");
  });

  // iframe span shape
  dom.querySelectorAll('span[data-type="iframe"]').forEach((span) => {
    expect(
      span.parentElement?.tagName,
      `[${context}] iframe span must be inside figure`
    ).toBe("FIGURE");
  });

  // No generic spans
  dom.querySelectorAll("span").forEach((span) => {
    expect(
      span.getAttribute("data-type"),
      `[${context}] generic <span> emitted`
    ).toBe("iframe");
  });

  // Links must have at least one data-* attr
  dom.querySelectorAll("a").forEach((a) => {
    const hasDataAttr =
      a.hasAttribute("data-link") ||
      a.hasAttribute("data-document") ||
      a.hasAttribute("data-maplink") ||
      a.hasAttribute("data-hover");
    expect(
      hasDataAttr,
      `[${context}] bare <a> without data-* attr`
    ).toBe(true);
  });

  // No bare "px" values on width/height
  const noPx = /data-image-(?:width|height)="px"/;
  expect(noPx.test(result), `[${context}] bare "px" value on image dimension`).toBe(false);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("corpus roundtrip", () => {
  if (corpus.length === 0) {
    it.skip("corpus not found — skipping corpus tests");
    return;
  }

  it(`processes ${corpus.length} chapters without throwing`, () => {
    let errors = 0;
    const messages: string[] = [];

    for (const { file, html, header } of corpus) {
      try {
        const result = roundtripHtml(html);
        const ctx = `${file.split("/").slice(-2).join("/")}#${header}`;
        checkInvariants(result, ctx);
      } catch (e) {
        errors++;
        const msg = e instanceof Error ? e.message : String(e);
        messages.push(msg.split("\n")[0]);
        if (messages.length >= 10) break; // cap error output
      }
    }

    if (errors > 0) {
      expect.fail(
        `${errors} corpus chapter(s) failed invariants:\n${messages.join("\n")}`
      );
    }
  });

  it("all chapters are idempotent", () => {
    let errors = 0;
    const messages: string[] = [];

    for (const { file, html, header } of corpus) {
      try {
        const once = roundtripHtml(html);
        const twice = roundtripHtml(once);
        if (once !== twice) {
          errors++;
          messages.push(
            `Not idempotent: ${file.split("/").slice(-2).join("/")}#${header}`
          );
          if (messages.length >= 5) break;
        }
      } catch {
        /* skip parse errors — covered by previous test */
      }
    }

    if (errors > 0) {
      expect.fail(
        `${errors} chapters are not idempotent:\n${messages.join("\n")}`
      );
    }
  });

  it("serialises empty html to empty string", () => {
    const result = roundtripHtml("");
    expect(result).toBe("");
  });

  it("stats summary (informational)", () => {
    let linkCount = 0;
    let mediaCount = 0;
    let iframeCount = 0;
    let textSectionCount = 0;

    for (const { html } of corpus) {
      if (!html) continue;
      if (/<a\s/i.test(html)) linkCount++;
      if (/<figure/i.test(html)) mediaCount++;
      if (/data-type="iframe"/i.test(html)) iframeCount++;
      if (/data-text-section/i.test(html)) textSectionCount++;
    }

    console.info(
      `\nCorpus stats: ${corpus.length} chapters | ${linkCount} with links | ` +
      `${mediaCount} with media | ${iframeCount} with iframes | ` +
      `${textSectionCount} with text-sections`
    );
    // This test always passes — it's just informational
    expect(corpus.length).toBeGreaterThan(0);
  });
});

// ─── Per-feature corpus checks ────────────────────────────────────────────────

describe("corpus: media-figure attribute fidelity", () => {
  const mediaChapters = corpus.filter((c) =>
    /data-image-width|data-type=/.test(c.html)
  );

  if (mediaChapters.length === 0) {
    it.skip("no media chapters in corpus");
    return;
  }

  it(`${mediaChapters.length} chapters with media roundtrip px correctly`, () => {
    for (const { file, html, header } of mediaChapters) {
      const result = roundtripHtml(html);
      const dom = parseDom(result);
      const ctx = `${file.split("/").slice(-2).join("/")}#${header}`;
      dom.querySelectorAll("img[data-image-width]").forEach((img) => {
        const w = img.getAttribute("data-image-width")!;
        expect(
          w.endsWith("px") && w.length > 2,
          `[${ctx}] bad data-image-width="${w}"`
        ).toBe(true);
      });
    }
  });
});

describe("corpus: text-section attribute fidelity", () => {
  const tsChapters = corpus.filter((c) => c.html.includes('data-text-section'));

  if (tsChapters.length === 0) {
    it.skip("no text-section chapters in corpus");
    return;
  }

  it(`${tsChapters.length} text-section chapters preserve data-text-section`, () => {
    for (const { file, html, header } of tsChapters) {
      const result = roundtripHtml(html);
      const dom = parseDom(result);
      const ctx = `${file.split("/").slice(-2).join("/")}#${header}`;
      const bqs = dom.querySelectorAll("blockquote");
      expect(bqs.length, `[${ctx}] no blockquote in result`).toBeGreaterThan(0);
      bqs.forEach((bq) => {
        expect(
          bq.hasAttribute("data-text-section"),
          `[${ctx}] blockquote missing data-text-section`
        ).toBe(true);
      });
    }
  });

  it(`accordion chapters have string true/false data-accordion`, () => {
    const accordionChapters = tsChapters.filter((c) =>
      c.html.includes('data-accordion="true"')
    );
    for (const { file, html, header } of accordionChapters) {
      const result = roundtripHtml(html);
      const dom = parseDom(result);
      const ctx = `${file.split("/").slice(-2).join("/")}#${header}`;
      const accordion = dom.querySelector('blockquote[data-accordion="true"]');
      expect(
        accordion,
        `[${ctx}] accordion blockquote not found in result`
      ).not.toBeNull();
    }
  });
});

describe("corpus: link attribute fidelity", () => {
  const linkChapters = corpus.filter((c) => /<a\s/i.test(c.html));

  if (linkChapters.length === 0) {
    it.skip("no link chapters in corpus");
    return;
  }

  it(`${linkChapters.length} link chapters produce no bare <a> tags`, () => {
    for (const { file, html, header } of linkChapters) {
      const result = roundtripHtml(html);
      const dom = parseDom(result);
      const ctx = `${file.split("/").slice(-2).join("/")}#${header}`;
      dom.querySelectorAll("a").forEach((a) => {
        const hasDataAttr =
          a.hasAttribute("data-link") ||
          a.hasAttribute("data-document") ||
          a.hasAttribute("data-maplink") ||
          a.hasAttribute("data-hover");
        expect(
          hasDataAttr,
          `[${ctx}] bare <a href="${a.getAttribute("href")}"> — text="${a.textContent}"`
        ).toBe(true);
      });
    }
  });
});
