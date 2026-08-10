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
cat AI_POLICY.md 2>/dev/null || git show upstream/chore/add-ai-policy:AI_POLICY.md
```

## 1 — Scope the change

```bash
BASE=$(git merge-base HEAD origin/master 2>/dev/null || git merge-base HEAD master)
git diff --stat $BASE...HEAD          # committed changes on this branch
git status -s                          # uncommitted changes
git log --oneline $BASE..HEAD          # commits under review
```
Note which app(s) each file belongs to: `apps/backend` (ESLint+Prettier),
`apps/client` (ESLint+Prettier, TS), `apps/admin` (Prettier only, legacy).

## 2 — AI_POLICY.md (governs upstream PRs) — 5 requirements, ✅/◐/❌ + evidence

- **#1 Issue-first + maintainer sign-off** — the hard gate. `git log` / branch
  name won't show it; ask the user. No issue ⇒ ❌ for upstream.
- **Disclose AI use** — `git log $BASE..HEAD --format='%an%n%b' | grep -i 'co-authored-by: claude'`
- **Tested on a real instance** — evidence of manual/live testing, not just "builds".
- **Scoped to one feature** — a branch mixing features fails #5:
  `git log --oneline $BASE..HEAD` should be one coherent feature, not master with several merges.

## 3 — CONTRIBUTING.md

```bash
grep -n "unreleased" CHANGELOG.md                         # entry added under ## [unreleased]?
git branch --show-current                                  # develop-based? feature/ISSUE-desc?
git log $BASE..HEAD --format='%G? %h %s'                   # signed? (G/U/N in first column; -S recommended)
```
Also: Material Design/MUI for new UI; backend ESM (no `require(`):
```bash
git diff $BASE...HEAD -- 'apps/backend/**/*.js' | grep -nE '^\+.*require\('   # should be empty
```

## 4 — AGENTS.md

- Correct app targeting; MUI + "admin is legacy, avoid refactors"; components < 200 lines
  (`git diff --stat` new files); ESM backend; CHANGELOG updated.

## 5 — Run the real gates (only on changed files)

```bash
CH=$(git diff --name-only $BASE...HEAD)
# Backend
cd apps/backend && npx eslint $(echo "$CH" | grep '^apps/backend/.*\.js$' | sed 's#apps/backend/##'); cd -
# Admin (Prettier only)
cd apps/admin && npx prettier --check $(echo "$CH" | grep '^apps/admin/.*\.\(js\|jsx\)$' | sed 's#apps/admin/##'); cd -
# Client
cd apps/client && npx eslint $(echo "$CH" | grep '^apps/client/' | sed 's#apps/client/##'); cd -
```
**CRLF caveat:** if the *only* failures are Prettier `endOfLine`/`Delete ␍`,
confirm they're pre-existing repo-wide before blaming the change:
```bash
npx eslint server/apis/v2/utils/handleStandardResponse.js | grep -c 'Delete .␍'   # untouched file also flags?
git show $BASE:<file> | grep -c $'\r'; git show HEAD:<file> | grep -c $'\r'          # CR count base vs head
```
Repo commits CRLF while Prettier wants `endOfLine: lf`; treat CRLF-only noise as a
known repo issue (upstream `.gitattributes` proposal), not a defect in the change.

## 6 — Report

One table per policy: `Requirement | Status | Evidence`. Separate **fork** vs
**upstream** columns/sections — the fork legitimately deviates on branch base
(master not develop), issue numbers, and commit signing; those are ❌ only for
upstream. Lead with the headline verdict. Surface real issues; don't pad.
