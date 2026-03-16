# Onyx Architecture Guide

This document is the technical architecture reference for AI agents and contributors.
It explains module boundaries, data flow, and release pipeline expectations.

## Core Runtime Topology

- `main/`: Electron main process, native integrations, storage, and IPC handlers.
- `renderer/src/`: React UI, user interaction logic, and calls to secure preload APIs.
- `main/preload.ts`: Controlled bridge API between renderer and main process.
- `dist-electron/`: Build output only; never edit manually.
- Large renderer surfaces may extract pure helpers into feature-local folders such as `renderer/src/components/gameManager/` so orchestration-heavy components do not also own every normalization/filtering utility inline.
- `renderer/src/components/gameManager/` now owns both image normalization helpers and ordered image-result aggregation helpers, leaving `GameManager.tsx` focused on state transitions, IPC coordination, and modal rendering.
- `renderer/src/components/gameManager/` also owns provider-progress helper logic for the image-search status row, so provider availability and provider-status event mapping stay outside the modal component body.

## Data and Control Flow

1. UI actions in renderer call preload-exposed APIs.
2. Main process IPC handlers validate and route requests to services.
3. Services persist state (e.g., `electron-store`) and return typed results.
4. Renderer updates local state and component views.

### Preload Contract Ownership

- `main/preload.ts` owns the `electronAPI` bridge object and exports `type ElectronAPI = typeof electronAPI`.
- Renderer-side global typing imports that exported type instead of maintaining a separate duplicate interface, so preload and renderer stay on the same contract.

### Startup Sequence Coordination

- `main/startupCoordinator.ts` owns the packaged-update gate, renderer `app:ready` handshake, startup-scan cancellation, and fallback startup timer.
- `main/main.ts` now initializes the updater first, registers the startup coordinator, and leaves the coordinator to gate `performBackgroundScan(true, true)` until update status allows startup scanning to proceed.

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
- Renderer bundle shaping: `vite.config.mts` defines manual chunking for React/vendor-heavy dependencies so large secondary UI flows can be lazy-loaded without bloating the initial app shell.
- Static analysis: `eslint.config.mjs` and `npm run lint` provide lightweight repo-wide checks for import duplication and targeted hook hygiene without forcing a formatter.
- The lint config intentionally relaxes `no-unused-vars` for legacy-heavy `main/` services and disables `react-hooks/exhaustive-deps` in a short list of hotspot renderer files until those modules are decomposed further, so lint stays actionable instead of devolving into broad migration noise.
- Release/build script entrypoints that use ESM now use explicit `.mjs` filenames such as `scripts/generate-icons.mjs`, `scripts/validate-icons.mjs`, and `scripts/increment-build.mjs` so Node does not reparse typeless release tooling during local packaging or version bumps.
- Secrets baseline gate: `npm run scan:secrets`
- Commit-time guardrails: `.husky/pre-commit`
- Package manager policy: npm-only (`packageManager` is `npm@10` and CI must not install/use pnpm for packaging)

## Module Index

<!-- AUTO-GENERATED:MODULE_INDEX:START -->
- Main process source files: 70
- Renderer source files: 93
- Automation scripts: 30
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
