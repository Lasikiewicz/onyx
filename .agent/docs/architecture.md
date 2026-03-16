# Onyx Architecture Guide

This document is the technical architecture reference for AI agents and contributors.
It explains module boundaries, data flow, and release pipeline expectations.

## Core Runtime Topology

- `main/`: Electron main process, native integrations, storage, and IPC handlers.
- `renderer/src/`: React UI, user interaction logic, and calls to secure preload APIs.
- `main/preload.ts`: Controlled bridge API between renderer and main process.
- `dist-electron/`: Build output only; never edit manually.

## Data and Control Flow

1. UI actions in renderer call preload-exposed APIs.
2. Main process IPC handlers validate and route requests to services.
3. Services persist state (e.g., `electron-store`) and return typed results.
4. Renderer updates local state and component views.

### Known-Game Image Fetch Contract

- `metadata:fetchGameImages` treats requests with known identifiers (`gameId`, `steamAppId`, or `igdbId`) as known-game flows.
- In known-game flows, the handler skips Auto-Match/title re-identification and fetches provider artwork directly.
- Auto-Match remains an unknown-query fallback only when no game identifiers are provided.

## HTTP Client Notes

- `main/axiosShim.ts` is expected to preserve `baseURL` path segments when joining relative request paths (e.g., IGDB `https://api.igdb.com/v4` + `/games` -> `https://api.igdb.com/v4/games`).

## Build and Delivery Pipeline

- Local development: `npm run electron:dev`
- Type/build validation: `npm run build`
- Packaging: `npm run dist`
- Secrets baseline gate: `npm run scan:secrets`
- Commit-time guardrails: `.husky/pre-commit`
- Package manager policy: npm-only (`packageManager` is `npm@10` and CI must not install/use pnpm for packaging)

## Module Index

<!-- AUTO-GENERATED:MODULE_INDEX:START -->
- Main process source files: 66
- Renderer source files: 79
- Automation scripts: 37
- GitHub workflow files: 7
- Key entrypoints:
  - Main process entry: `main/main.ts` (present)
  - Preload bridge: `main/preload.ts` (present)
  - Renderer app root: `renderer/src/App.tsx` (present)
  - Electron builder config: `electron-builder.config.js` (present)
<!-- AUTO-GENERATED:MODULE_INDEX:END -->

## Change Documentation Rules

- Any change to module boundaries, IPC contracts, state ownership, or release flow must update this file in the same commit.
- Keep descriptions short, precise, and aligned to real file paths.
