---
description: Benchmark the current change against Hajk's CONTRIBUTING, AGENTS and AI_POLICY, running the real lint/format gates.
---

Run a **compliance benchmark** on the current change. Read the policy files
fresh each time (they change); run the real gates (don't assert them); report
per-policy tables that separate **personal-fork** from **upstream-PR** compliance.

## References (read these first)

```bash
cat CONTRIBUTING.md
cat AGENTS.md
cat AI_POLICY.md
```

## 1 — Scope the change

Work lands on `develop` in this fork too — it tracks `upstream/develop`, while
`master` is the stable branch and trails it. Base the diff on `develop`:
using `master` silently pulls in every commit the upstream merge brought
along (thousands), which makes the "scoped to one feature" check meaningless.

```bash
BASE=$(git merge-base HEAD origin/develop 2>/dev/null || git merge-base HEAD develop)
git log --oneline -1 $BASE             # sanity-check the base before trusting anything below
git diff --stat $BASE...HEAD           # committed changes on this branch
git status -s                          # uncommitted changes
git log --oneline $BASE..HEAD          # commits under review
```
If that commit count looks absurd, you based on the wrong branch — stop and re-derive.

Note which app(s) each file belongs to: `apps/backend` (ESLint+Prettier, ESM),
`apps/client` (ESLint+Prettier; mostly JS/JSX, TS allowed but `checkJs` is off),
`apps/admin` (Prettier only, legacy).

## 2 — AI_POLICY.md (governs upstream PRs) — 5 requirements, ✅/◐/❌ + evidence

- **#1 Issue-first + maintainer sign-off** — the hard gate. `git log` / branch
  name won't show it; ask the user. No issue ⇒ ❌ for upstream.
- **Disclose AI use** — `git log $BASE..HEAD --format='%an%n%b' | grep -i 'co-authored-by: claude'`
- **Explainable by the submitter** — can't be measured from the diff; flag it as
  the user's responsibility rather than scoring it ✅.
- **Tested on a real instance** — evidence of manual/live testing, not just "builds".
  No app has a test framework, so "tests pass" is never available evidence.
- **Scoped to one feature** — a branch mixing features fails #5:
  `git log --oneline $BASE..HEAD` should be one coherent feature.

## 3 — CONTRIBUTING.md

```bash
grep -n "unreleased" CHANGELOG.md CHANGELOG.fork.md   # entry added under ## [unreleased]?
git branch --show-current                              # develop-based? feature/ISSUE-desc?
git log $BASE..HEAD --format='%G? %h %s'               # signed? (G/U/N in first column; -S recommended)
```
Which changelog matters depends on the target: fork-only work belongs in
`CHANGELOG.fork.md`, and `CHANGELOG.md` must stay a clean mirror of upstream's.
An entry in the wrong file is a finding, not a pass.

Also: Material Design/MUI for new UI; backend ESM (no `require(`):
```bash
git diff $BASE...HEAD -- 'apps/backend/**/*.js' | grep -nE '^\+.*require\('   # should be empty
```

## 4 — AGENTS.md

- Correct app targeting; MUI + "admin is legacy, avoid refactors"; components < 200 lines
  (`git diff --stat` new files); ESM backend; changelog updated.

## 5 — Run the real gates (only on changed files)

Each app's lint config covers a specific subtree — passing files from outside it
(`public/`, `package.json`, config at app root) produces failures that aren't
about the change. Filter to what each config actually matches, skip deleted
files, and skip an app entirely when it has no changed files:

```bash
CH=$(git diff --name-only --diff-filter=d $BASE...HEAD)

# Backend — eslint.config.js covers server/**/*.js
B=$(echo "$CH" | grep -E '^apps/backend/server/.*\.js$' | sed 's#apps/backend/##')
[ -n "$B" ] && (cd apps/backend && npx eslint $B)

# Client — eslint.config.mjs covers src/**/*.{js,jsx,ts,tsx}
C=$(echo "$CH" | grep -E '^apps/client/src/.*\.(js|jsx|ts|tsx)$' | sed 's#apps/client/##')
[ -n "$C" ] && (cd apps/client && npx eslint $C)

# Admin — Prettier only, and it pins Prettier 2 with default settings,
# so it must run from inside apps/admin, never with the client's config
A=$(echo "$CH" | grep -E '^apps/admin/.*\.(js|jsx)$' | sed 's#apps/admin/##')
[ -n "$A" ] && (cd apps/admin && npx prettier --check $A)
```

**Line endings:** the repo is LF-only — verified 0 CRLF across every tracked
JS/TS/JSON/MD file, and there is no `.gitattributes`. So Prettier's
`endOfLine: lf` has nothing to trip over: `Delete ␍` / `endOfLine` failures now
mean the change itself introduced CRLF (usually an editor writing them), and are
a real defect to fix — not pre-existing repo noise to wave through.

## 6 — Report

One table per policy: `Requirement | Status | Evidence`. Separate **fork** vs
**upstream** sections — the fork legitimately deviates on issue numbers
(fork-only work often has no upstream issue) and commit signing; those are ❌
only for upstream. Branch base is *not* a deviation: fork and upstream both
branch from `develop`. Lead with the headline verdict. Surface real issues;
don't pad.
