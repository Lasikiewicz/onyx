# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Onyx is a Windows Electron desktop app — a unified game library that aggregates games from Steam, Epic, GOG, Xbox, and others. Stack: Electron + Node (main process) and React 18 + TypeScript + Vite + Tailwind (renderer). npm-only (`packageManager` is `npm@10`); do not use pnpm/yarn.

## Working agreement (read before editing code)

This repo enforces a strict, agent-specific workflow defined in `agents.md` and `.agent/docs/`. Key rules that differ from typical defaults:

- **Implementation-only by default.** Make exactly the change requested. Do **not** touch docs, `CHANGELOG.md`, or generated doc blocks, and do **not** run build/lint/test/`docs:sync`/`docs:check` until the user explicitly approves the implementation or asks for validation/commit prep.
- After implementing, summarize the exact files changed and ask whether the user is happy — *then* run the validation/docs workflow if approved.
- **Docs guard.** Code under `main/` or `renderer/src/` is mapped to required docs via `.agent/docs/doc-map.json`. When the user approves commit prep, changes to mapped files must update the owning doc(s) in the **same commit** — at minimum a `docs/features/*` runbook, plus `.agent/docs/architecture.md` if module boundaries, IPC contracts, state ownership, or release flow changed. `.husky/pre-commit` and `.github/workflows/docs-guard.yml` enforce this; `npm run docs:sync` then `npm run docs:check` keep it green.
- **Never push without explicit permission.** Run `npm run scan:secrets` before any push. Use terminal git only (no editor SCM UI). Don't add Co-authored-by/Cursor lines to commit messages. Don't use the word "alpha" in commit messages destined for `main`.

`.agent/docs/architecture.md` is the authoritative, frequently-updated map of module ownership and which file owns which responsibility — consult it when locating where logic lives.

## Commands

```bash
npm ci                  # install
npm run electron:dev    # primary dev entry: Vite dev server + Electron with DevTools
npm run build           # tsc + vite build + compile main & preload tsconfigs (also validates icons)
npm run lint            # eslint over main, renderer, and config files
npm test                # vitest run (whole suite)
npm run test:watch      # vitest watch
```

Run a single test file or focused test:

```bash
npx vitest run main/SecurityUtils.test.ts          # one file
npx vitest run -t "partial test name"              # by test name
```

Pre-PR / pre-push checks (only when the user has asked for validation):

```bash
npm run scan:secrets        # committed-secrets gate — must pass before any push
npm run check:no-raw-ipc    # forbids raw window.ipcRenderer in renderer
npm run docs:sync           # regenerate AUTO-GENERATED doc blocks
npm run docs:check          # verify required docs updated for staged code
```

Packaging: `npm run build:alpha`, `npm run build:prod`, `npm run dist` (output to `release/`). `BUILD_PROFILE` (`alpha` | `production`) drives App ID and product name in `electron-builder.config.js` so Alpha and Production install side-by-side.

## Architecture

Three layers, communicating in one direction:

```
renderer/src (React UI)  ──calls──>  main/preload.ts (ContextBridge)  ──>  main/ipc/*Handlers.ts  ──>  main/*Service.ts
```

- **`main/`** — Electron backend: services (one responsibility each), IPC handlers in `main/ipc/` (`app`, `game`, `launcher`, `metadata`, `scanning`, `suspend`), source scanners in `main/scanners/`, and `main/main.ts` bootstrap. Persistence via `electron-store`.
- **`main/preload.ts`** — the only bridge. It owns the `electronAPI` object and exports `type ElectronAPI = typeof electronAPI`; the renderer's global typing imports that exported type rather than duplicating it. Renderer must reach main **only** through these preload APIs — never raw `ipcRenderer` (enforced by `check:no-raw-ipc`).
- **`renderer/src/`** — React UI with heavy use of feature-local hooks. `App.tsx` is intentionally a thin shell; most orchestration lives in extracted hooks (`useAppShell*`, `useApp*`, `useGameLaunchFlow`, `useImporterWorkbench`, etc.) and feature folders (`components/gameManager/`, `components/settings/`, `components/gameProperties/`, `components/importer/`, `components/appShell/`). When adding shell logic, follow this extraction pattern instead of inlining into `App.tsx`.
- **`dist-electron/`** and **`dist/`** — build output only; never edit by hand.

Data flow: UI action → preload API → IPC handler validates/routes → service persists and returns typed result → renderer updates local React state. App-shell preferences are bootstrapped **once** at renderer startup; later state changes must not implicitly reload persisted preferences (doing so snaps view mode / active selection back to saved values).

### Conventions

- Game IDs: Steam = `steam-{appId}`, custom = `custom-{timestamp}-{random}`.
- `electron-store` keys: games `game-library`, prefs `user-preferences`, app configs `app-configs`, Steam auth `steam-auth`.
- Several right-panel display settings (logo/boxart/text/button/transparency) are persisted **per view mode** (grid/list/logo), not globally.
- ESM release scripts use explicit `.mjs` (e.g. `scripts/generate-icons.mjs`).
- `main/axiosShim.ts` preserves `baseURL` path segments when joining relative paths (e.g. IGDB `/v4` + `/games`).

## Metadata & artwork

Game metadata/artwork come from third-party APIs (IGDB, RAWG, SteamGridDB; GiantBomb currently unavailable). Keys are configured in-app (Settings > APIs) or via `.env` (copy `.env.example`) and stored in the OS secure credential store when available, falling back to `electron-store`. Never commit real keys. `metadata:fetchGameImages` treats requests carrying `gameId`/`steamAppId`/`igdbId` as "known-game" flows that skip Auto-Match and fetch provider artwork directly; Auto-Match is only the fallback for unidentified queries.

## Git / release workflow

All local work happens on **`master`**. Releases promote by force-pushing branches (full procedures in `.agent/docs/release-workflows.md`):

- **Force to Alpha**: `git push origin master:develop --force` → triggers Alpha CI build from `develop`.
- **Force to Main**: `git push origin develop:main --force` → triggers Production CI build from `main`.

`CHANGELOG.md` must list each user-visible change as its own bullet; for refactors, use one parent bullet per source file with extracted subfiles as child bullets, and group same-prefix entries under a parent bullet (never flat `- Prefix: detail` lines).

## Disabled features

Implemented but off by default — don't assume they're live:

- **Suspend/Resume** (`main/ProcessSuspendService.ts`, IPC/UI commented) — Windows-focused, may need admin.
- **Steam playtime display** (`renderer/src/components/GameDetailsPanel.tsx`) — hidden UI block.

See `.agent/docs/known-issues-disabled-features.md`.
