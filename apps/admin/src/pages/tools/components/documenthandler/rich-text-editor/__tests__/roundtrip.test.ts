/**
 * Roundtrip tests for the Hajk rich-text editor serialisation layer.
 *
 * Each test:
 *   1. Parses a legacy HTML fixture through parseLegacyHtml().
 *   2. Serialises back with serializeToLegacyHtml().
 *   3. Verifies key structural/attribute invariants by comparing DOM trees.
 *
 * The DOM comparison is semantic: attribute order, self-closing vs explicit
 * close tags, etc. are ignored.  Specific invariants are asserted explicitly.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { describe, it, expect } from "vitest";
import { parseLegacyHtml, serializeToLegacyHtml, roundtripHtml } from "../serialization/serialize";

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

function fixture(name: string): string {
  return readFileSync(resolve(__dir, "fixtures", name), "utf-8").trim();
}

/** Parse HTML to a DOM document for attribute-level assertions. */
function parseDom(html: string): Document {
  return new DOMParser().parseFromString(
    `<body>${html}</body>`,
    "text/html"
  );
}

// ─── Helper assertions ────────────────────────────────────────────────────────

function assertNoEmptyParagraphs(html: string) {
  const dom = parseDom(html);
  const allP = dom.querySelectorAll("p");
  allP.forEach((p) => {
    const hasOnlyBr =
      p.children.length === 1 &&
      p.children[0].tagName === "BR" &&
      p.childNodes.length === 1;
    expect(hasOnlyBr, `Empty <p><br></p> found`).toBe(false);
    expect(
      p.childNodes.length === 0,
      `Empty <p></p> found`
    ).toBe(false);
  });
}

function assertNoBlockquoteWithoutTextSection(html: string) {
  const dom = parseDom(html);
  dom.querySelectorAll("blockquote").forEach((bq) => {
    expect(
      bq.hasAttribute("data-text-section"),
      "blockquote missing data-text-section"
    ).toBe(true);
  });
}

function assertNoNestedPInBlockquote(html: string) {
  const dom = parseDom(html);
  dom.querySelectorAll("blockquote > p").forEach(() => {
    expect.fail("<p> found directly inside <blockquote>");
  });
}

function assertAccordionStringValues(html: string) {
  const dom = parseDom(html);
  dom.querySelectorAll("blockquote[data-accordion]").forEach((bq) => {
    const val = bq.getAttribute("data-accordion");
    expect(val === "true" || val === "false", `data-accordion must be "true" or "false", got ${val}`).toBe(true);
  });
}

function assertImageWidthHasPx(html: string) {
  const dom = parseDom(html);
  dom.querySelectorAll("img[data-image-width]").forEach((img) => {
    const w = img.getAttribute("data-image-width")!;
    expect(w.endsWith("px"), `data-image-width "${w}" must end with px`).toBe(true);
    expect(w.length > 2, `data-image-width must not be bare "px"`).toBe(true);
  });
  dom.querySelectorAll("img[data-image-height]").forEach((img) => {
    const h = img.getAttribute("data-image-height")!;
    expect(h.endsWith("px"), `data-image-height "${h}" must end with px`).toBe(true);
    expect(h.length > 2, `data-image-height must not be bare "px"`).toBe(true);
  });
}

function assertPopupPresenceBased(html: string) {
  const dom = parseDom(html);
  // Any img[data-image-popup] must have empty value
  dom.querySelectorAll("img[data-image-popup]").forEach((img) => {
    expect(img.getAttribute("data-image-popup")).toBe("");
  });
}

function assertIframeSpanShape(html: string) {
  const dom = parseDom(html);
  dom.querySelectorAll('span[data-type="iframe"]').forEach((span) => {
    const parent = span.parentElement;
    expect(parent?.tagName).toBe("FIGURE");
    expect(span.hasAttribute("data-iframe-src")).toBe(true);
  });
}

function assertNoGenericSpans(html: string) {
  const dom = parseDom(html);
  dom.querySelectorAll("span").forEach((span) => {
    expect(
      span.getAttribute("data-type"),
      "Generic <span> without data-type=iframe found"
    ).toBe("iframe");
  });
}

function assertLinksHaveDataAttr(html: string) {
  const dom = parseDom(html);
  dom.querySelectorAll("a").forEach((a) => {
    const hasRequiredAttr =
      a.hasAttribute("data-link") ||
      a.hasAttribute("data-document") ||
      a.hasAttribute("data-maplink") ||
      a.hasAttribute("data-hover");
    expect(hasRequiredAttr, `<a> tag missing required data-* attr: ${a.outerHTML}`).toBe(true);
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("roundtrip: basic markup", () => {
  const html = fixture("basic.html");

  it("preserves paragraphs and inline marks", () => {
    const result = roundtripHtml(html);
    const dom = parseDom(result);
    expect(dom.querySelectorAll("p").length).toBeGreaterThanOrEqual(2);
    expect(dom.querySelector("strong")).toBeTruthy();
    expect(dom.querySelector("em")).toBeTruthy();
    expect(dom.querySelector("u")).toBeTruthy();
  });

  it("preserves lists", () => {
    const result = roundtripHtml(html);
    const dom = parseDom(result);
    expect(dom.querySelector("ul")).toBeTruthy();
    expect(dom.querySelector("ol")).toBeTruthy();
  });

  it("no empty paragraphs", () => {
    assertNoEmptyParagraphs(roundtripHtml(html));
  });

  it("is idempotent", () => {
    const once = roundtripHtml(html);
    const twice = roundtripHtml(once);
    expect(twice).toBe(once);
  });
});

describe("roundtrip: text sections", () => {
  const html = fixture("text-section.html");

  it("preserves blockquote structure", () => {
    const result = roundtripHtml(html);
    const dom = parseDom(result);
    expect(dom.querySelectorAll("blockquote").length).toBe(2);
  });

  it("always emits data-text-section", () => {
    assertNoBlockquoteWithoutTextSection(roundtripHtml(html));
  });

  it("no nested <p> inside blockquote", () => {
    assertNoNestedPInBlockquote(roundtripHtml(html));
  });

  it("data-accordion is string true/false", () => {
    assertAccordionStringValues(roundtripHtml(html));
  });

  it("preserves accordion=false as false", () => {
    const dom = parseDom(roundtripHtml(html));
    const bq1 = dom.querySelectorAll("blockquote")[0];
    expect(bq1.getAttribute("data-accordion")).toBe("false");
  });

  it("preserves accordion=true with title", () => {
    const dom = parseDom(roundtripHtml(html));
    const bq2 = dom.querySelectorAll("blockquote")[1];
    expect(bq2.getAttribute("data-accordion")).toBe("true");
    expect(bq2.getAttribute("data-accordion-title")).toBe("Accordion title here");
  });

  it("is idempotent", () => {
    const once = roundtripHtml(html);
    expect(roundtripHtml(once)).toBe(once);
  });
});

describe("roundtrip: links", () => {
  const html = fixture("links.html");

  it("all links have required data-* attr", () => {
    assertLinksHaveDataAttr(roundtripHtml(html));
  });

  it("web link has data-link", () => {
    const dom = parseDom(roundtripHtml(html));
    const webLink = dom.querySelector("a[data-link]");
    expect(webLink).toBeTruthy();
    expect(webLink?.getAttribute("data-link")).toContain("https://");
  });

  it("document link has data-document", () => {
    const dom = parseDom(roundtripHtml(html));
    const docLinks = dom.querySelectorAll("a[data-document]");
    expect(docLinks.length).toBe(2);
  });

  it("document link with header-identifier preserves it", () => {
    const dom = parseDom(roundtripHtml(html));
    const docLink = dom.querySelector("a[data-header-identifier]");
    expect(docLink?.getAttribute("data-header-identifier")).toBe("underrubrik_1");
  });

  it("map link has data-maplink", () => {
    const dom = parseDom(roundtripHtml(html));
    const mapLink = dom.querySelector("a[data-maplink]");
    expect(mapLink).toBeTruthy();
  });

  it("hover link has data-hover", () => {
    const dom = parseDom(roundtripHtml(html));
    const hoverLink = dom.querySelector("a[data-hover]");
    expect(hoverLink?.getAttribute("data-hover")).toBe("This is the tooltip text");
  });

  it("is idempotent", () => {
    const once = roundtripHtml(html);
    expect(roundtripHtml(once)).toBe(once);
  });
});

describe("roundtrip: media figures", () => {
  const html = fixture("media.html");

  it("image width/height have px suffix", () => {
    assertImageWidthHasPx(roundtripHtml(html));
  });

  it("popup is presence-based", () => {
    assertPopupPresenceBased(roundtripHtml(html));
  });

  it("image without popup doesn't get data-image-popup attr", () => {
    const dom = parseDom(roundtripHtml(html));
    const allImgs = dom.querySelectorAll("img");
    // Only the one with popup should have it
    let popupCount = 0;
    allImgs.forEach((img) => {
      if (img.hasAttribute("data-image-popup")) popupCount++;
    });
    expect(popupCount).toBe(1);
  });

  it("video has data-type=video", () => {
    const dom = parseDom(roundtripHtml(html));
    expect(dom.querySelector('img[data-type="video"]')).toBeTruthy();
  });

  it("audio has data-type=audio", () => {
    const dom = parseDom(roundtripHtml(html));
    expect(dom.querySelector('img[data-type="audio"]')).toBeTruthy();
  });

  it("plain image does NOT get data-type attribute", () => {
    const dom = parseDom(roundtripHtml(html));
    const plainImg = dom.querySelector("img:not([data-type])");
    expect(plainImg).toBeTruthy();
  });

  it("audio does not get width/height attrs", () => {
    const dom = parseDom(roundtripHtml(html));
    const audio = dom.querySelector('img[data-type="audio"]');
    expect(audio?.hasAttribute("data-image-width")).toBe(false);
    expect(audio?.hasAttribute("data-image-height")).toBe(false);
  });

  it("all media wrapped in figure", () => {
    const dom = parseDom(roundtripHtml(html));
    dom.querySelectorAll("img").forEach((img) => {
      expect(img.parentElement?.tagName).toBe("FIGURE");
    });
  });

  it("no generic spans", () => {
    assertNoGenericSpans(roundtripHtml(html));
  });

  it("is idempotent", () => {
    const once = roundtripHtml(html);
    expect(roundtripHtml(once)).toBe(once);
  });
});

describe("roundtrip: iframe embeds", () => {
  const html = fixture("iframe.html");

  it("iframe is wrapped in figure with span[data-type=iframe]", () => {
    assertIframeSpanShape(roundtripHtml(html));
  });

  it("placeholder title is normalised on parse", () => {
    const doc = parseLegacyHtml(html);
    const html2 = serializeToLegacyHtml(doc);
    const dom = parseDom(html2);
    const spans = dom.querySelectorAll('span[data-type="iframe"]');
    // The untitled iframe should get <iframetitlehere> as text content
    const untitled = Array.from(spans).find(
      (s) => s.getAttribute("data-iframe-title") === ""
    );
    expect(untitled?.textContent).toBe("<iframetitlehere>");
  });

  it("iframe width/height have NO px suffix", () => {
    const dom = parseDom(roundtripHtml(html));
    dom.querySelectorAll('span[data-type="iframe"]').forEach((span) => {
      const w = span.getAttribute("data-iframe-width");
      const h = span.getAttribute("data-iframe-height");
      if (w) expect(w.endsWith("px")).toBe(false);
      if (h) expect(h.endsWith("px")).toBe(false);
    });
  });

  it("is idempotent", () => {
    const once = roundtripHtml(html);
    expect(roundtripHtml(once)).toBe(once);
  });
});

describe("roundtrip: entity preservation", () => {
  const html = fixture("entities.html");

  it("preserves &nbsp; characters", () => {
    const result = roundtripHtml(html);
    // TipTap serializes &nbsp; as the HTML entity or raw Unicode \u00a0 — accept both
    const hasNbsp = result.includes("&nbsp;") || result.includes("\u00a0");
    expect(hasNbsp).toBe(true);
  });

  it("map link URL preserved verbatim through roundtrip", () => {
    const dom = parseDom(roundtripHtml(html));
    const mapLink = dom.querySelector("a[data-maplink]");
    expect(mapLink?.getAttribute("data-maplink")).toContain("x=160700");
    expect(mapLink?.getAttribute("data-maplink")).toContain("y=6347051");
  });

  it("is idempotent", () => {
    const once = roundtripHtml(html);
    expect(roundtripHtml(once)).toBe(once);
  });
});

describe("edge cases", () => {
  it("empty string returns empty string", () => {
    expect(roundtripHtml("")).toBe("");
  });

  it("whitespace-only string returns empty string", () => {
    expect(roundtripHtml("   ")).toBe("");
  });

  it("<ins> is mapped to <u> on parse", () => {
    const result = roundtripHtml("<p>Text with <ins>underline</ins>.</p>");
    const dom = parseDom(result);
    expect(dom.querySelector("u")).toBeTruthy();
    expect(dom.querySelector("ins")).toBeFalsy();
  });

  it("<del> is preserved", () => {
    const result = roundtripHtml("<p>Text with <del>strikethrough</del>.</p>");
    const dom = parseDom(result);
    expect(dom.querySelector("del")).toBeTruthy();
  });
});
