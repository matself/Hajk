import { describe, it, expect } from "vitest";
import { sanitizeUrl } from "../extensions/hajk-link";

describe("sanitizeUrl", () => {
  it.each([
    ["https URL", "https://example.com/page"],
    ["http URL", "http://example.com/page"],
    ["mailto URL", "mailto:user@example.com"],
    ["absolute path", "/path/to/page"],
    ["relative path", "./relative"],
    ["anchor", "#section"],
    ["query string", "?q=foo"],
    ["data image", "data:image/png;base64,abc"],
  ])("allows %s: %s", (_label, url) => {
    expect(sanitizeUrl(url)).toBe(url);
  });

  it.each([
    ["javascript scheme", "javascript:alert(1)"],
    ["javascript with spaces", "  javascript:alert(1)  "],
    ["vbscript scheme", "vbscript:MsgBox(1)"],
    ["data text/html", "data:text/html,<script>alert(1)</script>"],
    ["data application/javascript", "data:application/javascript,alert(1)"],
    ["unknown scheme", "ftp://example.com"],
  ])("blocks %s: %s", (_label, url) => {
    expect(sanitizeUrl(url)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeUrl("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(sanitizeUrl("   ")).toBe("");
  });
});
