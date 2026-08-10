/**
 * Copies docs/*.md (repo root, top level only) into public/manual/ so it
 * ships as static assets in the Admin build, and generates:
 *  - manual-index.json: the admin-*.md guides, for the viewer's sidebar
 *  - manual-files.json: every copied filename, so the viewer can tell a
 *    resolvable cross-link (e.g. to deprecated-plugins.md) from a dead one
 *    even though that file isn't one of the admin-* guides in the sidebar.
 *  - manual-titles.json: {file: title} for every copied file (not just the
 *    sidebar subset), so search results for a file outside the sidebar
 *    (e.g. deprecated-plugins.md) still get a readable title.
 *
 * All of docs/*.md is copied (not just admin-*.md) because several guides
 * link out to other top-level docs, and those links need a real target to
 * resolve to or the in-app viewer can't tell them apart from a typo.
 *
 * Source of truth stays docs/*.md — this script just mirrors it. Runs
 * automatically before `npm start` / `npm run build` (see package.json).
 */
const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.resolve(__dirname, "..", "..", "..", "docs");
const OUT_DIR = path.resolve(__dirname, "..", "public", "manual");

function extractTitle(content, fallback) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.warn(`[sync-manual] docs dir not found at ${DOCS_DIR}, skipping.`);
    return;
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const allFiles = fs
    .readdirSync(DOCS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();

  const sidebarIndex = [];
  const titles = {};
  allFiles.forEach((file) => {
    const content = fs.readFileSync(path.join(DOCS_DIR, file), "utf8");
    fs.writeFileSync(path.join(OUT_DIR, file), content, "utf8");
    const title = extractTitle(content, file);
    titles[file] = title;
    if (file.startsWith("admin-")) {
      sidebarIndex.push({ file, title });
    }
  });

  fs.writeFileSync(
    path.join(OUT_DIR, "manual-index.json"),
    JSON.stringify(sidebarIndex, null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "manual-files.json"),
    JSON.stringify(allFiles, null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "manual-titles.json"),
    JSON.stringify(titles, null, 2) + "\n",
    "utf8"
  );

  console.log(
    `[sync-manual] copied ${allFiles.length} file(s) into public/manual/ (${sidebarIndex.length} in the sidebar)`
  );
}

main();
