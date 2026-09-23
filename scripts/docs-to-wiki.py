"""
Mirror docs/*.md into a local checkout of the fork's GitHub wiki (matself/Hajk.wiki).

docs/ is the source of truth. Every admin-*.md and client-*.md doc is regenerated
into its wiki page, translating the docs/ link conventions into the wiki's:

  [admin-x.md](admin-x.md#a)  ->  [Page-Name](Page-Name#a)
  [label](../apps/foo.jsx)    ->  [label](https://github.com/matself/Hajk/blob/master/apps/foo.jsx)
  [label](other-doc.md)       ->  GitHub blob URL, when the doc has no wiki page

A doc is matched to its wiki page by comparing H1 headings, so the mapping follows
whatever the wiki already calls a page. Docs without a wiki page are listed, not
created: to add one, create "<Page-Name>.md" in the wiki containing only the doc's
H1 line, link it from Home.md and _Sidebar.md, and run the script again.

The script only writes files. Review with `git diff` in the wiki checkout, then
commit and push from there.

Usage:
  python scripts/docs-to-wiki.py [wiki_dir]

  wiki_dir defaults to a Hajk-wiki directory next to this repository.
"""
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(REPO, "docs")
WIKI = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(REPO), "Hajk-wiki")
BLOB = "https://github.com/matself/Hajk/blob/master/"

if not os.path.isfile(os.path.join(WIKI, "Home.md")):
    sys.exit(f"Not a wiki checkout (no Home.md): {WIKI}")


def h1(path):
    with open(path, encoding="utf-8") as f:
        return f.readline().strip()


wiki_by_h1 = {h1(os.path.join(WIKI, f)): f[:-3] for f in os.listdir(WIKI) if f.endswith(".md")}
docs = sorted(f for f in os.listdir(DOCS) if f.endswith(".md"))
mapping = {d: wiki_by_h1.get(h1(os.path.join(DOCS, d))) for d in docs}

link = re.compile(r"\[([^\]]*)\]\(([^)\s]+)\)")


def convert(text):
    def repl(m):
        label, target = m.group(1), m.group(2)
        if re.match(r"^[a-z]+:", target) or target.startswith("#"):
            return m.group(0)
        path, _, anchor = target.partition("#")
        anchor = "#" + anchor if anchor else ""
        if path.startswith("../"):
            return f"[{label}]({BLOB}{path[3:]}{anchor})"
        if path.endswith(".md") and "/" not in path:
            page = mapping.get(path)
            if page:
                if label == path:
                    label = page
                return f"[{label}]({page}{anchor})"
            return f"[{label}]({BLOB}docs/{path}{anchor})"
        return m.group(0)

    return link.sub(repl, text)


changed, missing = [], []
for d, page in mapping.items():
    if not d.startswith(("admin-", "client-")):
        continue
    if page is None:
        missing.append(d)
        continue
    with open(os.path.join(DOCS, d), encoding="utf-8") as f:
        out = convert(f.read().replace("\r\n", "\n"))
    dst = os.path.join(WIKI, page + ".md")
    with open(dst, encoding="utf-8") as f:
        cur = f.read()
    if cur != out:
        with open(dst, "w", encoding="utf-8", newline="\n") as f:
            f.write(out)
        changed.append(page)

print("Changed:" if changed else "No pages changed.", *changed, sep="\n  ")
if missing:
    print("Docs without a wiki page:", *missing, sep="\n  ")
