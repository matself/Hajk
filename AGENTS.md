# AI Agent Instructions for Hajk

Hajk is an open-source web GIS solution based on React, Material UI, and OpenLayers. This guide outlines key architectural patterns and workflows to help AI agents effectively contribute to the codebase.

## Project Architecture

This is a monorepo with three independent apps — no root-level workspace tooling (no Lerna, yarn workspaces, etc.). Each app manages its own dependencies.

### Core Components

- **Client UI** (`apps/client/`): Web map frontend — React 19, Vite 7, OpenLayers 10, MUI v9. Port 3000.
- **Admin UI** (`apps/admin/`): Configuration UI for maps/layers — React 16, Create React App 3 (legacy), MUI v4, OpenLayers 5. Port 3001.
- **Backend** (`apps/backend/`): REST API server — Node.js ≥22 (ESM), Express 5. Port 3002.

### Tech Stack at a Glance

| | Backend | Client | Admin |
| --- | --- | --- | --- |
| Framework | Express 5 | React 19 | React 16 (legacy) |
| Build | ES modules (no bundler) | Vite 7 | Create React App 3 |
| UI | — | MUI v9 | MUI v4 + Ant Design 4 |
| Maps | — | OpenLayers 10 | OpenLayers 5 |
| Language | JavaScript (ESM) | Mostly JS/JSX; TS enabled (`strict`, but `allowJs` + `checkJs: false`) | JavaScript |
| Linting | ESLint 9 + Prettier | ESLint 9 + Prettier | Prettier only |

### Critical Configuration Files

- `apps/client/public/appConfig.json`: Client runtime config (set `mapserviceBase` to backend URL)
- `apps/admin/public/config.json`: Admin runtime config (all URLs point to backend API)
- `apps/backend/.env`: Backend environment config (copy from `.env.example`)
- `apps/backend/App_Data/`: Map and layer configuration JSON files

## Development Workflow

### Setup Flow

1. Start backend first:

   ```bash
   cd apps/backend
   npm install
   npm run dev   # Runs on http://localhost:3002
                 # API Explorer: http://localhost:3002/api-explorer/
   ```

2. Configure and start client:

   ```bash
   # Ensure apps/client/public/appConfig.json has mapserviceBase: "http://localhost:3002/api/v2"
   cd apps/client
   npm install
   npm run dev   # Runs on http://localhost:3000
   ```

3. Configure and start admin (optional):

   ```bash
   # Ensure apps/admin/public/config.json URLs point to http://localhost:3002/api/v2/...
   cd apps/admin
   npm install
   npm start     # Runs on http://localhost:3001
   ```

### Build Commands

```bash
# Backend: compile to dist/
cd apps/backend && npm run compile && npm start

# Client: build to build/
cd apps/client && npm run build

# Admin: build to build/ (requires Node OpenSSL legacy provider — handled by npm scripts)
cd apps/admin && npm run build
```

### Git Workflow Conventions

1. Always branch from `develop` — in this fork too. `develop` tracks `upstream/develop` (last merged in via `e089ccf8`) and is where work lands; `master` is the fork's stable branch and trails it.
2. Branch naming: `feature/ISSUE_NUM-description` (e.g., `feature/1234-blue-button`). Fork-only work with no upstream issue may use a plain descriptive name.
3. Update the changelog under "Unreleased" with format:

   ```markdown
   - area: Description. [#issue-number](https://github.com/hajkmap/Hajk/issues/issue-number)
   ```

   This fork (`matself/Hajk`) tracks two changelogs so it can still be diffed/merged cleanly against `upstream/develop`:
   - `CHANGELOG.md` — mirrors upstream exactly. Only touch this for changes that also exist in / are intended for `hajkmap/Hajk`.
   - `CHANGELOG.fork.md` — fork-only changes (not upstreamed, e.g. the admin password gate, WMTS auth proxy). This is where most work on this fork should be recorded.

### AI-Assisted Contributions

`AI_POLICY.md` (on `develop`; also summarized in `CONTRIBUTING.md`) is a **hard gate for
upstream PRs**: open an issue and get maintainer sign-off on the approach *before*
writing code, disclose the AI tool used in the PR description, test against a real Hajk
instance, and keep the diff scoped to the linked issue. PRs skipping the issue-first step
are closed on sight. This does not apply to trivial edits, nor to fork-internal work that
is never sent upstream — but it does apply the moment a change is aimed at `hajkmap/Hajk`.

## Code Patterns

### Design Principles

- Use Material UI components following Material Design principles
- Follow ESLint & Prettier configurations — run `npm run lint:fix` before committing (backend and client)
- Prefer functional components with hooks over class components (client)
- Keep components focused and modular — aim for under 200 lines
- Use TypeScript interfaces for prop types in new `.ts`/`.tsx` files (client); most existing files are plain JSX without prop types

### Common Integration Points

- Backend API paths:
  - Client UI consumes: `/api/v2/`
  - Admin UI consumes: `/api/v2/mapconfig/` for admin operations
  - ActiveDirectory auth (when enabled) affects `/config` vs `/mapconfig` responses

### Noteworthy Quirks

- **Admin is legacy**: React 16, MUI v4, TypeScript 3.9, no ESLint. Avoid major refactors unless specifically tasked.
- **Admin OpenSSL**: Uses `--openssl-legacy-provider` flag due to old dependency versions — don't remove it.
- **Client prebuild**: `npm run dev` and `npm run build` run `prebuild.js` first, which injects git hash and build date into `.env.local`.
- **Backend is ESM**: Uses ES module syntax throughout — no CommonJS `require()`.

### Debugging Tips

- Backend debug mode: `npm run dev:debug` (Node.js inspector on default port)
- Client: Vite HMR — check browser console and Vite terminal output
- Admin: Create React App dev server
- Check `mapserviceBase` in `appConfig.json` when Client APIs aren't responding
- Use React DevTools for component inspection
- OpenLayers map debugging: `window.olMap.getLayers().getArray()`

## Key Files for Context

- `apps/client/src/` - Main client application code
- `apps/client/src/plugins/` - 29 plugin directories: 28 registered tools + the `Template` scaffold
- `apps/admin/src/` - Admin interface code
- `apps/backend/server/` - Backend server implementation
- `apps/backend/App_Data/*.json` - Map configuration files

## Common Workflows

### Adding New Features

1. Determine if changes needed in client, admin, or backend (often all three)
2. Update appropriate configuration files
3. Follow Material Design patterns for UI components
4. Verify by running the app — none of the three apps has a test framework configured, so lint + manual verification against a live instance is the only gate
5. Update the changelog (`CHANGELOG.fork.md` for fork-only work, `CHANGELOG.md` only for upstream-bound changes)
