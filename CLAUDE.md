@AGENTS.md

# CLAUDE.md — working in this repository

`AGENTS.md` (imported above) is the short, tool-agnostic agent guide: stack table, setup
commands, git workflow, code standards. **It is authoritative for policy — do not
contradict it.** This file adds the depth that doesn't belong in a quick-reference:
repository map, architecture internals, fork-specific features, and the gotchas that
cost time when you don't know them.

Keep the two in sync. If you change a fact here that also appears in `AGENTS.md`
(versions, ports, commands), update both — `.claude/commands/compliance-check.md`
reads `AGENTS.md` and `CONTRIBUTING.md` fresh on every run and will benchmark
changes against whatever those files say.

_Verified against the `develop` tree on 2026-08-20. Versions and counts drift; re-derive
from `package.json` and the source rather than trusting this file indefinitely._

---

## 0. Read this before opening an upstream PR

`AI_POLICY.md` exists on `develop` and governs any PR whose diff is substantially
AI-generated. It is a **hard gate**, not advice:

1. **Issue first, maintainer sign-off on the approach, before any code is written.**
   PRs skipping this are closed on sight "even if the code looks fine."
2. **Disclose the AI tool and how it was used** in the PR description.
3. **The human submitter must be able to explain and defend every line** from their own
   understanding.
4. **Tested against a real Hajk instance** — "it builds" is explicitly not a test, and
   there is no test suite to lean on (§3).
5. **Scoped to the linked issue** — no drive-by refactors or formatting churn.

Practical consequence for me: on an upstream-bound change, *stop and confirm an issue
exists with maintainer sign-off before writing code*, keep the diff tight, and give the
user a PR description they can post that states what was AI-generated and what was
tested. Trivial edits (a line of autocomplete, doc wording) are exempt, as is fork-only
work that never goes upstream — but "fork-only" is a decision to make deliberately, not a
default. `/compliance-check` benchmarks a change against this policy and reports fork vs.
upstream compliance separately.

---

## 1. What Hajk is

An open-source web GIS platform (Swedish municipal origin, MIT licensed). Three
independently-versioned apps — all currently `4.4.0` — that share no build tooling and
communicate **only** through the backend's REST API and JSON files on disk.

```
matself/Hajk                     ← this fork; branch from `develop` (tracks upstream/develop)
├── apps/
│   ├── backend/                 Express 5 REST API + static host, Node ≥22, pure ESM
│   ├── client/                  End-user web map — React 19 + Vite 7 + OpenLayers 10
│   └── admin/                   Map/layer config UI — React 16 + CRA 3 (legacy, frozen)
├── docs/                        Markdown docs; `admin-*.md` double as the in-app Admin manual
│   ├── CODEBASE_REPORT.md       Deeper architecture snapshot (dated 2026-07-07, partly stale)
│   ├── DEPLOYMENT.md, migrate-to-v2-api.md, client-url-parameters.md, rfcs/
│   └── index.html               Standalone marketing/landing page
├── Docker/, Dockerfile          Container builds (multi-stage: backend → client → admin)
├── scripts/                     Release + local build helpers (not part of app builds)
├── AI_POLICY.md                 Hard gate for upstream PRs — see §0
├── CONTRIBUTING.md              Upstream's text + fork's setup/structure sections
├── CHANGELOG.md                 Mirrors UPSTREAM only — see §7
├── CHANGELOG.fork.md            Fork-only changes — this is where most work is recorded
└── .claude/commands/            `/compliance-check` slash command
```

There is **no root `package.json`** and no workspace tooling. Every `npm` command runs
from inside one of the three `apps/*` directories.

---

## 2. Architecture

### 2.1 How the three apps actually talk

Admin and Client never talk to each other — no iframe, postMessage, or shared bundle.
Both read and write the same flat JSON files through the backend:

```
apps/backend/App_Data/
├── layers.json          Central registry of every layer definition (all maps share it)
├── map_1.json           One file per map: tools, layer tree, projections, map options
├── documents/           DocumentHandler content (informative documents)
├── templates/           Map config templates
└── .backups/<name>/     Auto-snapshots taken before every write (fork feature, §6)
```

- **Client** reads `GET {mapserviceBase}/config/{mapName}` at startup
  (`apps/client/src/index.jsx`). If `mapserviceBase` is empty it falls back to static
  JSON from `public/`.
- **Admin** writes via `/api/v2/mapconfig/*` and `/api/v2/settings/*`, using legacy
  jQuery `.ajax` calls with URLs hardcoded per module in `apps/admin/public/config.json`.
- When Active Directory is on, the backend filters what each user sees in `/config`
  and gates every write behind `restrict.admin.js`.

### 2.2 Backend (`apps/backend/`)

Strict four-layer structure, one directory level per concern:

```
server/
├── index.js                     Entry point
├── routes.js                    Mounts /api/vN for each enabled API version
├── common/
│   ├── server.js                Express setup: helmet, CORS, compression, OpenAPI
│   │                            validation, log4js, static exposer, /Upload serving
│   ├── env.js                   .env loading
│   ├── api.v1.yml, api.v2.yml   OpenAPI specs — AUTHORITATIVE, see gotcha in §8
│   └── middlewares/             error handler, request logger, user-context extraction
├── apis/v1/                     Legacy .NET-compatible API (still mounted)
├── apis/v2/                     Current API
│   ├── router.js                config · informative · mapconfig · settings · ad · fir · admin-auth
│   ├── controllers/<name>/      router.js (routes) + controller.js (thin handlers)
│   ├── services/                Business logic (config, informative, settings, fir, AD)
│   ├── middlewares/             restrict.admin, restrict.static, and the outbound
│   │                            proxies: wms.auth, wmts.auth, fme.server,
│   │                            sokigo.fb, lantmateriet.markhojd
│   └── utils/
└── utils/hashAdminPassword.js   `npm run hash-admin-password` (fork feature, §6)
```

Rules that matter:

- **Pure ESM.** `"type": "module"`. A `require(` anywhere under `apps/backend/` is a bug
  and `/compliance-check` greps for it.
- **Controllers stay thin.** Filesystem access, XML parsing, and AD lookups belong in
  `services/`.
- **API versions are configurable** via `API_VERSIONS` in `.env`; code must not assume
  v2 is the only mounted version (see the `apiVersions.forEach` loops in `common/server.js`).
- **`npm run compile` is just `shx cp -r server dist`** — there is no transpilation.
  Anything Node ≥22 can't run natively will fail at runtime, not build time.

### 2.3 Client (`apps/client/`)

```
src/
├── index.jsx                    Bootstrap: fetch appConfig.json → fetch map config → render
├── constants.js                 AVAILABLE_TOOLS — the plugin allow-list (§2.4)
├── components/                  App shell: App.jsx, Window, Drawer, Search, FeatureInfo,
│                                MapClickViewer, HajkThemeProvider, dialogs, snackbars
├── controls/                    Map-corner controls (Zoom, ScaleLine, Rotate, ThemeToggler…)
├── models/
│   ├── AppModel.js              Central app state; owns the OL map and plugin loading
│   ├── appModel/                mapFactory, layerLoader, pluginManager, backgroundLayers,
│   │                            layerVisibility, configTranslator, urlParamsMerger
│   ├── DrawModel.js, SearchModel.js, MapClickModel.js, KmlModel.js, GpxModel.js …
│   └── layers/
├── plugins/                     29 directories (§2.4)
├── hooks/, utils/, types/
```

- **State management is deliberately local.** No Redux, no Zustand, no global Context.
  Cross-cutting messages go through `globalObserver` (a `react-event-observer` pub/sub
  instance created in `components/App.jsx` and handed to `AppModel`); within a plugin,
  through its own `localObserver`.
  Don't introduce a global store to solve a local problem.
- **Language is mixed and that's fine.** ~360 `.js`/`.jsx` files vs ~26 `.ts`/`.tsx`.
  `tsconfig.json` sets `strict: true` but also `allowJs: true` + `checkJs: false`, so
  existing JS is *not* type-checked. `npm run build` runs `tsc && vite build`, so a type
  error in a `.ts`/`.tsx` file **does** break the build. New code may be TS; converting
  existing JS wholesale is out of scope unless asked.
- **Path aliases** (`components/…`, `utils/…`, `hooks/…`, `plugins/…`, `src/…`) are
  declared in *both* `vite.config.ts` and `tsconfig.json`. Adding one means editing both.

### 2.4 The client plugin system

Every user-facing tool is a plugin under `src/plugins/<Name>/`. Currently 29 directories:
28 registered tools plus the `Template` scaffold. (`Search` appears in `AVAILABLE_TOOLS`
but lives in `src/components/Search` — it is core, not a plugin directory.)

Canonical shape — `src/plugins/Dummy/` is the worked example and its `readme.md` is the
best single document on plugin authoring:

```
MyPlugin/
├── MyPlugin.jsx        Entry: creates localObserver + Model, renders BaseWindowPlugin
├── MyPluginModel.js    Plain class, no React. Private fields (#map, #app, #localObserver)
├── MyPluginView.jsx    Functional component + hooks + MUI; calls props.model.foo()
├── constants/index.js  Frozen constants (optional)
└── readme.md           Optional but appreciated
```

`BaseWindowPlugin` / `DialogWindowPlugin` (in `src/plugins/`) supply the window chrome,
Drawer/Widget buttons, and show-hide state. The `type` prop passed to `BaseWindowPlugin`
**must exactly match the directory name**.

**Registering a new plugin takes four edits — miss one and it silently won't load:**

1. `apps/client/src/constants.js` → add to `AVAILABLE_TOOLS` (case-sensitive, must equal
   the directory name).
2. `apps/client/public/appConfig.json` → add to `availableTools`.
3. `apps/backend/App_Data/<map>.json` → add a `tools` entry with `"type": "<lowercased
   plugin name>"`. The `type` string is what the client matches on — a typo here surfaces
   as "unavailable plugin" at load, nothing more.
4. `apps/admin/src/views/tools/<name>.jsx` → the admin editor, plus wire it into the
   tool list in `tooloptions.jsx`, if the tool should be configurable in Admin.

Both `AVAILABLE_TOOLS` and `appConfig.json`'s `availableTools` are allow-lists, and they
intentionally differ: `constants.js` lists everything present in the build,
`appConfig.json` lists what this deployment turns on.

### 2.5 Admin (`apps/admin/`) — legacy, handle with care

React 16.13, Create React App 3.4, MUI v4 (`@material-ui/*`), Ant Design 4,
OpenLayers 5, plus `backbone` + `jquery` as the data layer and `draft-js` for rich text.
No ESLint; Prettier 2.7 with **default settings** (no `.prettierrc` in this app).

```
src/
├── views/
│   ├── tools/<tool>.jsx     One editor per client plugin (+ tooloptions.jsx = tool list)
│   ├── layerforms/          wms, wmts, arcgis, vector, xyz layer forms
│   ├── layermanager.jsx, mapsettings.jsx, mapoptions.jsx, documenteditor.jsx, manual.jsx
│   └── components/, utils/
├── models/                  Backbone-flavoured models per view
└── scripts/sync-manual.js   Mirrors repo `docs/*.md` into public/manual/ (§6)
```

Rules: **no major refactors, no dependency bumps, no modernization** unless that is the
explicit task. Match the surrounding style even where it's dated. The
`--openssl-legacy-provider` flag in `start`/`build` is load-bearing — removing it breaks
the build on modern Node.

---

## 3. Everyday commands

Run from the app directory; `npm install` per app first.

| Task | Backend | Client | Admin |
| --- | --- | --- | --- |
| Dev server | `npm run dev` (3002) | `npm run dev` (3000) | `npm start` (3001) |
| Debug | `npm run dev:debug` | Vite HMR + devtools | CRA dev server |
| Build | `npm run compile` → `npm start` | `npm run build` → `build/` | `npm run build` → `build/` |
| Lint | `npm run lint` / `lint:fix` | `npm run lint` / `lint:fix` | — (no ESLint) |
| Format | Prettier via ESLint | `npm run format` / `format:check` | `npx prettier --write <files>` |

Start the backend first — both UIs are useless without it. API Explorer:
`http://localhost:3002/api-explorer/`.

**There is no test framework in any of the three apps.** No Jest, Vitest, Testing
Library, or Cypress config; no `*.test.*` or `*.spec.*` files exist. Do not claim
"tests pass"; verify by running the affected app and say what you exercised. If a change
genuinely warrants automated tests, propose the framework choice rather than silently
adding one.

**Before committing:** run lint/format for every app you touched (backend and client via
`npm run lint:fix`, admin via `npx prettier --write` on the changed files). The
`/compliance-check` slash command runs the real gates on the diff and reports fork vs.
upstream compliance separately.

---

## 4. Configuration files you will keep coming back to

| File | Purpose |
| --- | --- |
| `apps/client/public/appConfig.json` | `mapserviceBase` (backend URL), `defaultMap`, `availableTools`, announcements. `mapserviceBase` empty ⇒ client loads static config from `public/`. |
| `apps/client/public/appConfig.docker.json` | Swapped in for `appConfig.json` during the Docker build. |
| `apps/admin/public/config.json` | Backend URLs per admin module — hardcoded, one entry per endpoint. |
| `apps/backend/.env` | Copy from `.env.example`, which is heavily commented and doubles as the config reference. |
| `apps/backend/App_Data/*.json` | The actual map + layer data (see §2.1). |
| `apps/backend/server/common/api.v2.yml` | OpenAPI spec; requests are validated against it at runtime. |

Backend `.env` keys worth knowing: `PORT`, `API_VERSIONS`, `SESSION_SECRET`,
`AD_LOOKUP_ACTIVE` and the `AD_*` family, `ADMIN_PASSWORD_HASH`,
`MAP_CONFIG_BACKUP_COUNT`, `EXPOSE_CLIENT`, `EXPOSE_AND_RESTRICT_STATIC_*`,
`RESTRICT_ADMIN_ACCESS_TO_AD_GROUPS`, `LOG_*`, `PROXY_*`, `FME_SERVER_*`,
`LANTMATERIET_MARKHOJD_ACTIVE`, `ANALYTICS_*`.

---

## 5. Backend API surface (`/api/v2`)

| Route | Purpose |
| --- | --- |
| `GET /config/:map` | Map config for the Client (AD-filtered when AD is active) |
| `/mapconfig/*` | Map CRUD, layer store, backups — Admin, write-restricted |
| `/settings/*` | Per-layer-type settings: wmslayer, wmtslayer, arcgislayer, vectorlayer, xyzlayer, wfslayer, wfstlayer, toolsettings |
| `/informative/*` | DocumentHandler documents (Admin writes, Client reads) |
| `/ad/*` | Active Directory user/group lookups |
| `/fir/*` | Real-estate (fastighetsinformation) report generation |
| `/admin-auth/login`, `/logout` | Fork-only password gate (§6) |
| `/wmsproxy/:layerId`, `/wmtsproxy/:layerId` | Fork-only authenticated tile/image proxies (§6) |
| `/Upload`, `/api/vN/Upload` | Uploaded DocumentHandler media, served directly by Node |

`/api/v1` is still mounted for .NET-era compatibility; see `docs/migrate-to-v2-api.md`.

---

## 6. Fork-specific features (`matself/Hajk` only)

These do **not** exist upstream. Touching them means the change is fork-only and belongs
in `CHANGELOG.fork.md`, never in `CHANGELOG.md`.

- **Native admin password gate.** `ADMIN_PASSWORD_HASH` in `.env` (generated by
  `npm run hash-admin-password -- "yourPassword"`) protects `/admin` and its API behind a
  signed 6-hour session cookie. Only engages when `AD_LOOKUP_ACTIVE` is off. Note the
  quirk: `EXPOSE_AND_RESTRICT_STATIC_ADMIN` must be present **and non-empty** for the gate
  to be wired up at all, even though its value is ignored in password mode.
- **Authenticated WMTS/WMS proxies.** Per-layer Basic-auth credentials live in the layers
  store, are injected server-side by `/api/v2/wmtsproxy/:layerId` (and `wmsproxy`), and are
  stripped from the client-facing config so they never reach the browser.
- **Map config backups.** Every write snapshots the previous version into
  `App_Data/.backups/`; `MAP_CONFIG_BACKUP_COUNT` (default 100) caps retention. Exposed as
  "Säkerhetskopior" in Admin's Kartor toolbar.
- **In-app Admin manual.** `apps/admin/scripts/sync-manual.js` mirrors the repo's
  `docs/*.md` into `apps/admin/public/manual/` on `prestart`/`prebuild` and generates
  `manual-index.json`, `manual-files.json`, `manual-titles.json`. **`docs/*.md` is the
  single source of truth — never edit `public/manual/`**, it is deleted and regenerated on
  every start/build. Each guide is addressable as `#!/manual/<file>.md`.
- **Lantmäteriet Markhöjd proxy** for the Coordinates tool (`LANTMATERIET_MARKHOJD_ACTIVE`).
- **Plugins added in the fork:** `Mapillary`, `OsmSearch`, `MailForm`; plus XYZ layer
  support in LayerSwitcher and an `InfoDialog` admin editor.
- **Terminology (Swedish UI).** The fork renamed several concepts; use the current names:
  "Genvägar" (was Snabbval), "Teman" (the LayerSwitcher group, was Snabbåtkomst),
  "Färdiga teman" (admin-defined) vs "Mina teman" (user-saved, layers only), and "Platser"
  (Bookmarks — map position only, no layer state).

---

## 7. Changelogs — get this right

Two files, deliberately:

- **`CHANGELOG.md`** mirrors upstream `hajkmap/Hajk` exactly so this fork can still be
  diffed and merged against `upstream/develop`. Only touch it for changes that exist in, or
  are intended for, upstream.
- **`CHANGELOG.fork.md`** is for fork-only changes. **Most work here goes in this file.**

Both use Keep a Changelog: add under `## [unreleased]`, in an `Added` / `Changed` /
`Fixed` / `Security` / `Breaking` subsection, one line:

```markdown
- area: Short explanation. [#1234](https://github.com/hajkmap/Hajk/issues/1234)
```

`area` is a plugin name (Sketch, Print, LayerSwitcher…), an app name (Client, Admin,
Backend), or general (Core, App_Data). Multiple apps: `Client + Admin: …`. Fork entries
often have no issue link — that's fine; entries there tend to be a full sentence or two
explaining *why*, matching the existing style.

---

## 8. Gotchas worth knowing before you start

- **Branch base is `develop`, not `master`.** `develop` tracks `upstream/develop` and is
  where work lands; `master` is the fork's stable branch and trails it. The two trees are
  nearly identical (13 files apart at the time of writing), so it is easy to branch from
  the wrong one and not notice until the PR diff looks strange.
- **Four registration points for a plugin** (§2.4). A missing `appConfig.json` entry or a
  misspelled `type` in the map config produces a silent "unavailable plugin", not an error.
- **`api.v2.yml` is validated at runtime.** A new endpoint that isn't in the spec will be
  rejected by `express-openapi-validator` and won't appear in the API Explorer. Adding a
  route means adding it to the spec too — this has been missed before.
- **Admin Prettier is v2 with defaults**, Client/Backend are Prettier 3 with a shared
  `.prettierrc`. Don't format admin files with the client's config; run Prettier from
  inside `apps/admin`.
- **Line endings are LF throughout** (verified: 0 CRLF files across all tracked
  JS/TS/JSON/MD). `.claude/commands/compliance-check.md` documents a CRLF-vs-Prettier
  caveat from an earlier state of the repo; if you see `Delete ␍` errors now, treat them as
  a real regression introduced by the change, not as pre-existing noise.
- **No `.gitattributes`** — keep it that way unless asked, and make sure your editor writes LF.
- **Client prebuild writes `.env.local`** (`VITE_APP_GIT_HASH`, `VITE_APP_BUILD_DATE`) and
  shells out to `git rev-parse HEAD`. Builds outside a git checkout need `.git` present —
  which is why the Dockerfile copies it.
- **Admin needs `--openssl-legacy-provider`.** Already in the npm scripts; don't remove it.
- **The Docker build order is backend → client → admin** in one multi-stage image; the
  client stage installs and then removes `git`.
- **Netlify** builds only the client (`netlify.toml`, base `apps/client`, publish `build`).
- **`docs/CODEBASE_REPORT.md`** is a useful deep dive but is a dated snapshot (2026-07-07)
  and has drifted — e.g. it says MUI v7 and "strict TypeScript" for the client. Trust the
  source tree over it.

---

## 9. Conventions for changes

**Code**

- MUI components and Material Design for all new UI, in both Client (v9) and Admin (v4).
- Client: functional components with hooks; keep files focused, aim under 200 lines;
  style via `styled()` or the `sx` prop.
- Backend: ESM only; keep controllers thin and logic in services; log via `log4js` with a
  named logger (`log4js.getLogger("service.foo.v2")`).
- Admin: match the legacy style; minimal, surgical edits.
- The UI is Swedish. User-facing strings, admin labels, and docs in `docs/admin-*.md` are
  written in Swedish; code, comments, and commit messages are in English.

**Commits**

Imperative, sentence-case, descriptive of the *why* where it isn't obvious — matching the
existing history (`Fix Mapillary viewer stuck at 200px: CSS conflict, not a resize race`).
No Conventional Commits prefixes. An optional `Area: ` prefix is used where it helps.
Signing (`git commit -S`) is recommended upstream. When Claude authored the change, keep
the `Co-Authored-By: Claude` trailer — `/compliance-check` looks for it as AI disclosure.

**Docs**

User-facing behavior changes should update the matching `docs/admin-*.md` guide, since
those files *are* the Admin in-app manual. `docs/admin-tooloptions.md` carries an audit
date — bump it when you edit that table.
