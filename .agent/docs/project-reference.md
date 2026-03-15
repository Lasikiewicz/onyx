# Onyx Project Reference

## Runtime Constraints

- Onyx is an Electron application.
- Browser-only execution is unsupported because native Electron APIs are required.
- Use `npm run electron:dev` for local development.

## High-Level Structure

- `main/`: Electron backend, IPC handlers, services, persistence.
- `renderer/src/`: React frontend and UI state.
- `main/preload.ts`: ContextBridge API surface between renderer and main.
- `dist-electron/`: generated build output (do not edit).

## Key Technologies

- React + TypeScript + Vite + Tailwind (renderer)
- Electron + Node.js + TypeScript (main process)
- `electron-store` for local persistence

## Important Data/ID Conventions

- Steam game IDs: `steam-{appId}`
- Custom game IDs: `custom-{timestamp}-{random}`
- Store keys:
  - Games: `game-library`
  - Preferences: `user-preferences`
  - App configs: `app-configs`
  - Steam auth: `steam-auth`

## Development Commands

- `npm run electron:dev` — primary development entry
- `npm run build` — compile renderer and main code
- `npm run dist` — local production packaging
- `npm run increment-build` — bump patch/build number

## Feature Documentation Rule

- Every core feature has a dedicated Markdown file in `docs/features/`.
- When a feature changes, update its corresponding feature file in the same commit.
- Every feature file must follow `docs/features/FEATURE_DOC_STANDARD.md`.
- Settings is documented as both a parent overview and per-tab runbooks in `docs/features/settings/`.
- Required sections include user-facing surfaces, settings/toggles, end-to-end flows, data sources, persistence, triage, and file ownership.

## Critical Files

- `main/main.ts` — app bootstrap + IPC handlers
- `main/preload.ts` — renderer API exposure
- `renderer/src/App.tsx` — renderer root
- `renderer/src/components/GameDetailsPanel.tsx` — game details UI
- `renderer/src/components/GameManager.tsx` — game editing UI
- `renderer/src/components/OnyxSettingsModal.tsx` — settings UI

## Core Patterns

- UI state with React hooks.
- Renderer->main communication only through preload APIs.
- Service-level persistence in main process.
- User-facing error handling via clear try/catch boundaries.
