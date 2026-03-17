# Onyx Architecture Guide

This document is the technical architecture reference for AI agents and contributors.
It explains module boundaries, data flow, and release pipeline expectations.

## Core Runtime Topology

- `main/`: Electron main process, native integrations, storage, and IPC handlers.
- `renderer/src/`: React UI, user interaction logic, and calls to secure preload APIs.
- `main/preload.ts`: Controlled bridge API between renderer and main process.
- `dist-electron/`: Build output only; never edit manually.
- Large renderer surfaces may extract pure helpers into feature-local folders such as `renderer/src/components/gameManager/` so orchestration-heavy components do not also own every normalization/filtering utility inline.
- `renderer/src/components/appShell/` owns root overlay composition for the app shell, so `App.tsx` does not also carry every startup/update/crash/tutorial modal block inline.
- `renderer/src/hooks/useAppShellEvents.ts` owns root renderer listener wiring for menu actions, startup/background scan events, updater status, and crash-dump availability, leaving `App.tsx` focused more on shell state and composition than subscription setup.
- `renderer/src/hooks/useAppPreferences.ts` owns preference bootstrap, baseline defaults, refresh, and resolution-change preference sync for the app shell, so `App.tsx` does not also carry the whole startup preference application pipeline inline.
- `renderer/src/hooks/useAnimatedMediaPolicy.ts` owns shell-wide animated-image sanitization and DOM video pause/resume enforcement, so overlay/media policy does not stay embedded in `App.tsx`.
- `renderer/src/hooks/useAppShellModals.ts` owns shell-level modal state and common open/close helpers for settings, Game Manager, onboarding, and related modal entry points, so `App.tsx` does not also carry every modal routing toggle inline.
- `renderer/src/hooks/useAppShellSystemState.ts` owns update-modal, changelog, and crash-dump runtime state plus related shell actions, so `App.tsx` does not also carry every updater/crash coordination effect inline.
- `renderer/src/hooks/useSettingsSaveRefresh.ts` owns the post-settings-save preference readback and runtime refresh path for shell consumers, so `App.tsx` does not also carry a large settings modal `onSave` callback inline.
- `renderer/src/hooks/usePreferenceWriter.ts` owns lightweight renderer-side `savePreferences` helpers for direct shell control surfaces, so repeated state-update-plus-persist patterns do not stay duplicated inline.
- `renderer/src/hooks/useStartupScanReview.ts` owns startup scan found-games review and dismissal handoff, so importer-opening actions for startup overlays do not stay embedded in `App.tsx`.
- `renderer/src/hooks/useGameManagerShellBridge.ts` owns the app-shell side of Game Manager maintenance wiring, including save/delete handoff and importer-open maintenance actions, so `App.tsx` does not also carry those modal-bridge callbacks inline.
- `renderer/src/hooks/useMainViewShellControls.ts` owns the root MenuBar/TopBar action wiring for shell entry points such as scan, refresh, settings, tutorial, updater preview, and preference-backed view/search controls, so `App.tsx` does not also carry those callback bundles inline.
- App-shell preference bootstrap is intentionally one-time at renderer startup; later shell state changes must not implicitly reload persisted preferences, or root UI state like view mode and active selection can snap back to saved values.
- `renderer/src/hooks/useGameLaunchFlow.ts` owns renderer-side launch confirmation, launch execution, PID polling, and running-state updates for the app shell, so `App.tsx` does not also carry the whole launch/process workflow inline.
- `renderer/src/hooks/useImporterWorkbench.ts` owns importer open guards, startup/background scan handoff, importer reset behavior, and post-import follow-up, so `App.tsx` can treat importer lifecycle as a focused hook instead of another root-level modal workflow.
- `renderer/src/App.tsx` still owns active-library selection policy for the shell, including reconciling `activeGameId` against the currently visible filtered game set so details/background state cannot stay pinned to an off-screen game after filters or clicks change the visible library.
- `renderer/src/components/GameDetailsPanel.tsx` owns right-panel collision avoidance for oversized logo and boxart artwork: both content columns align below the logo, left-side boxart reserves inset on the description side, and right-side boxart pushes the details column downward instead of narrowing it.
- `renderer/src/components/GameDetailsPanel.tsx` also owns the default right-panel boxart anchor offsets, including the extra inward inset used by the default right-side boxart placement.
- `renderer/src/components/GameDetailsPanel.tsx` clamps rendered boxart width against the active description/details split so narrow panels cannot let hanging boxart span across the divider and cover live metadata content.
- `renderer/src/components/GameDetailsPanel.tsx` keeps artwork-clearance spacing outside the actual scroll containers so description/details scrolling starts at the visual bottom edge of the logo/boxart instead of inside hidden top padding.
- `renderer/src/components/GameDetailsPanel.tsx` also owns compact metadata presentation rules for the right column, including tighter vertical rhythm and primary-developer summarization when providers return multiple branch/studio developer entries.
- `renderer/src/components/GameDetailsPanel.tsx` bases logo-clearance spacing on the logo's effective rendered cap inside the fanart area rather than the raw requested slider value, preventing oversized-logo dead space when the logo stops visually growing.
- `renderer/src/components/RightClickMenu.tsx` constrains the Game Details per-game logo-size slider to the current fanart-derived visible maximum so the control surface does not offer non-functional values above the logo render cap.
- `renderer/src/components/gameManager/` now owns both image normalization helpers and ordered image-result aggregation helpers, leaving `GameManager.tsx` focused on state transitions, IPC coordination, and modal rendering.
- `renderer/src/components/gameManager/` also owns provider-progress helper logic for the image-search status row, so provider availability and provider-status event mapping stay outside the modal component body.
- `renderer/src/components/settings/` now owns extracted settings-tab bodies such as `SettingsIntegrationsTab.tsx` and `SettingsAboutTab.tsx`, leaving `OnyxSettingsModal.tsx` focused more on shared modal state, save orchestration, and tab routing than every large tab layout inline.

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
- Renderer source files: 114
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
