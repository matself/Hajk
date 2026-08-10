# Hajk Codebase Report

_Snapshot generated 2026-07-07. Reflects the state of the repo at that time — architecture, dependencies, and orphaned-code findings will drift as the code changes; re-derive from source rather than trusting this indefinitely._

## 1. Architecture Overview

Monorepo with three independently-managed apps, no shared workspace tooling:

| | Backend | Client | Admin |
|---|---|---|---|
| Framework | Express 5 | React 19 | React 16.13 |
| Build | ESM, no bundler (`shx cp` to `dist/`) | Vite 7 | Create React App 3 (`react-scripts`) |
| Language | JS (ESM) | TypeScript 5.9, `strict: true` | JS + TS 3.9 present but unenforced (`jsconfig.json` only sets `baseUrl`) |
| Linting | ESLint 9 (flat config) + Prettier | ESLint 9 (flat config) + Prettier | Prettier 2.7 only, no ESLint |
| Maps | — | OpenLayers 10 | OpenLayers 5 |
| UI kit | — | MUI v7 (`@mui/material` etc.) | Material-UI v4 (`@material-ui/*`) + Ant Design 4 |

## 2. Libraries in Use

**Backend** (`apps/backend/package.json`): Express 5, `express-openapi-validator` (OpenAPI schema validation), `helmet`, `cors`, `compression`, `cookie-parser`, `log4js`, `dotenv`, `activedirectory2`, `fast-xml-parser`, `http-proxy-middleware`, `write-excel-file`.

**Client** (`apps/client/package.json`): React 19, OpenLayers 10, MUI v7/Emotion, `@turf/*` (geometry ops), `@nieuwlandgeo/sldreader` (SLD styling), `proj4`, `@dnd-kit/*` (drag-drop), `react-event-observer` (pub/sub), `intro.js`/`intro.js-react` (onboarding tours), `@libpdf/core`, `xlsx`, `jszip`, `qrcode`, `x2js`, `react-markdown`+`remark-gfm`+`rehype-raw`, `motion` (animation), `@barbapapazes/plausible-tracker` (analytics), `load-google-maps-api`.

**Admin** (`apps/admin/package.json`): React 16, OpenLayers 5, Material-UI v4, Ant Design 4, `backbone` + `jquery`/`jquery-sortable` (legacy MVC layer for admin's data models), `draft-js` + plugins/import/export (rich text editor for informative documents), `react-smooth-dnd`, `react-modal`, `x2js`.

## 3. Design Principles / Conventions

- **Material Design** mandated via MUI, stated in CONTRIBUTING.md.
- **Client**: strict TypeScript, ESLint 9 flat config enforcing React Hooks rules, `jsx-a11y` accessibility rules, Prettier-as-lint-rule; `prop-types` disabled in favor of TS interfaces.
- **Backend**: ESLint 9 with `eslint-plugin-n` (Node-specific correctness), layered architecture: `router.js` → `controllers/` (thin handlers) → `services/` (business logic) → `common/` (Express setup: helmet, CORS, compression, OpenAPI validation, log4js).
- **Admin**: no linting; legacy patterns tolerated per AGENTS.md ("no major refactors unless specifically tasked").
- **Client plugin architecture**: each plugin under `apps/client/src/plugins/<Name>/` follows a **Model/View/Observer** trio — an entry component instantiates a plain-JS `Model` class (private fields, e.g. `#map`, `#app`) and a `localObserver` (from `react-event-observer`) for pub/sub messaging between Model and View; the View is a functional component calling `props.model.method()` directly. Plugins self-register by directory name added to `AVAILABLE_TOOLS`/`appConfig.json`'s `availableTools`, loaded dynamically by `AppModel.loadPlugins()`.
- **State management**: no Redux/Zustand/global Context — state is local-per-plugin via the Model/Observer pattern.
- **Testing**: no test framework is configured or used in any of the three apps (no Jest/Vitest/Testing Library/Cypress configs, no `__tests__`/`.test`/`.spec` files found).
- Docs: `docs/rfcs/` contains RFCs (in Swedish) distinguishing "standard" plugins (2+ users) from "community" plugins.

## 4. Admin ↔ Client ↔ Backend Communication

**No direct communication between Admin and Client** — they are fully decoupled and interact only through the Backend's REST API and shared JSON files on disk. No iframe/postMessage/BroadcastChannel bridges exist between them.

**Backend REST API** (`apps/backend/server/apis/v2/router.js`), mounted at `/api/v2/`:
- `/config/:map` — GET, returns a map's config (read by Client)
- `/mapconfig` — GET/PUT/DELETE, full map CRUD (Admin-only writes)
- `/settings/*` — layer/tool settings (wmslayer, vectorlayer, xyzlayer, toolsettings), Admin-only writes
- `/informative/*` — document content used in "Informative" dialogs, Admin writes/Client reads
- `/ad` — Active Directory users/groups lookups
- `/fir` — real-estate report generation

**Client**: `apps/client/public/appConfig.json` sets `mapserviceBase`. At startup (`apps/client/src/index.jsx:72-114`) the Client fetches `GET {mapserviceBase}/config/{mapName}`; if `mapserviceBase` is empty it falls back to loading static JSON from `/public` instead.

**Admin**: `apps/admin/public/config.json` hardcodes backend URLs per module (layermanager, edit, mapsettings, informative, etc.). Admin uses jQuery `.ajax` calls (legacy) to hit the `/mapconfig` and `/settings` endpoints for CRUD.

**Shared state mechanism**: both apps ultimately read/write the same flat files in `apps/backend/App_Data/` — `{mapName}.json` per map and a central `layers.json` registry — via the backend's `ConfigService`, which reads/writes with `fs.promises`.

**Auth**: Active Directory integration (`activedirectory2`) gates all write endpoints via a `restrictAdmin` middleware (`apps/backend/server/apis/v2/middlewares/restrict.admin.js`), controlled by `AD_LOOKUP_ACTIVE` and `RESTRICT_ADMIN_ACCESS_TO_AD_GROUPS` env vars; unauthorized requests get 403. Client's read-only `/config` endpoint also filters map content by AD group membership when AD is active.

## 5. Orphaned / Superfluous Code

Concrete findings, in descending size:

1. **Entire `apps/backend/server/apis/v1/` directory** (~114 KB, 24 files: controllers/services/middlewares/utils) — orphaned. `apps/backend/server/common/server.js:26` hardcodes `const ALLOWED_API_VERSIONS = [2];`, so v1 cannot be reached even via config.
2. **`scripts/legacy_unmaintained_build.sh`** — self-declares `"WARNING: This script is legacy and unmaintained. Use at your own risk."`, kept for reference only, referenced in CHANGELOG as obsolete since v4.3.0.
3. **Commented-out IE11 polyfill imports** in `apps/admin/src/index.js:10-12` (`core-js`, `react-app-polyfill/ie11`, `react-app-polyfill/stable`) — dead, neither package is used anywhere else.
4. **Backbone.js + jQuery in `apps/admin/src/models/*`** — not dead code (actively used in ~10 model files like `documenteditor.js`, `mapsettings.js` via `Model.extend()`), but is a vestigial framework layer from an earlier admin architecture, consistent with AGENTS.md's note that Admin is legacy and shouldn't be majorly refactored.
5. **`react-smooth-dnd`** dependency — used in exactly one file (`apps/admin/src/views/components/FieldEditor.jsx`); a single-use dependency, not itself dead but a migration remnant.
6. `apps/admin/node_modules/form-data/README.md.bak` — a stray backup file inside a third-party package's extracted contents (harmless, not part of the repo's own code).
7. CHANGELOG.md references `buildConfig.json` as no longer used following the CRA→Vite migration for Client; the file itself has already been removed (confirmed absent), so no cleanup action is outstanding there — it's just a documented historical removal, not a currently-orphaned artifact.

No orphaned components were found in `apps/client/src` — the "legacy"-named `LegacyNonMarkdownRenderer.jsx` is actively wired into `Dialog.jsx` as an intentional fallback, not dead code.
