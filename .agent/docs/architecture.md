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
- `renderer/src/hooks/useRightClickMenuControls.ts` owns the root right-click settings menu callback bundle, including active-game handoff and preference-backed per-view display-control writes, so `App.tsx` does not also carry the entire `RightClickMenu` action matrix inline.
- `renderer/src/hooks/useAppShellSurfaceActions.ts` owns the smaller shell-surface callback bundles for Welcome Screen onboarding, game context menu actions, and root overlay actions, so `App.tsx` does not also carry those per-surface prop blocks inline.
- `renderer/src/hooks/useGameDetailsPanelControls.ts` owns the root `GameDetailsPanel` callback bundle plus panel-size persistence wiring, so `App.tsx` does not also carry the right-panel action and divider-save matrix inline.
- `renderer/src/hooks/useAppPreferences.ts`, `renderer/src/hooks/useRightClickMenuControls.ts`, and `main/UserPreferencesService.ts` now keep right-panel logo, boxart, text, button, and transparency settings per view mode, so grid/list/logo can persist independent values instead of sharing one global right-panel state bucket.
- `renderer/src/hooks/useAppShellModalControls.ts` owns the root modal callback bundles for settings, importer, Game Manager, and update-library flows, so `App.tsx` does not also carry those modal prop matrices inline.
- App-shell preference bootstrap is intentionally one-time at renderer startup; later shell state changes must not implicitly reload persisted preferences, or root UI state like view mode and active selection can snap back to saved values.
- `renderer/src/hooks/useGameLaunchFlow.ts` owns renderer-side launch confirmation, launch execution, PID polling, and running-state updates for the app shell, so `App.tsx` does not also carry the whole launch/process workflow inline.
- `renderer/src/hooks/useImporterWorkbench.ts` owns importer open guards, startup/background scan handoff, importer reset behavior, and post-import follow-up, so `App.tsx` can treat importer lifecycle as a focused hook instead of another root-level modal workflow.
- `renderer/src/App.tsx` still owns active-library selection policy for the shell, including reconciling `activeGameId` against the currently visible filtered game set so details/background state cannot stay pinned to an off-screen game after filters or clicks change the visible library.
- `renderer/src/components/GameDetailsPanel.tsx` owns right-panel collision avoidance for oversized logo and boxart artwork: both content columns align below the logo, left-side boxart reserves inset on the description side, and right-side boxart pushes the details column downward instead of narrowing it.
- `renderer/src/components/GameDetailsPanel.tsx` also lets left-positioned boxart float inside the description flow so the copy wraps beneath the artwork instead of staying in a separate side column.
- `renderer/src/components/GameDetailsPanel.tsx` also owns the default right-panel boxart anchor offsets, including the extra inward inset used by the default right-side boxart placement.
- `renderer/src/components/GameDetailsPanel.tsx` also owns the rich-description wide-layout policy, including the per-section floated 60%-width image treatment that pairs each screenshot with its nearest text block, keeps no-image sections full-width, and lets any overflow text continue underneath the image once it outgrows the float.
- `renderer/src/components/GameDetailsPanel.tsx` clamps rendered boxart width against the active description/details split so narrow panels cannot let hanging boxart span across the divider and cover live metadata content.
- `renderer/src/components/GameDetailsPanel.tsx` keeps artwork-clearance spacing outside the actual scroll containers so description/details scrolling starts at the visual bottom edge of the logo/boxart instead of inside hidden top padding.
- `renderer/src/components/GameDetailsPanel.tsx` also owns compact metadata presentation rules for the right column, including tighter vertical rhythm and primary-developer summarization when providers return multiple branch/studio developer entries.
- `renderer/src/components/GameDetailsPanel.tsx` bases logo-clearance spacing on the logo's effective rendered cap inside the fanart area rather than the raw requested slider value, preventing oversized-logo dead space when the logo stops visually growing.
- `renderer/src/components/RightClickMenu.tsx` constrains the Game Details per-game logo-size slider to the current fanart-derived visible maximum so the control surface does not offer non-functional values above the logo render cap.
- `main/AppUpdateService.ts`, `main/preload.ts`, `renderer/src/hooks/useAppShellEvents.ts`, and `renderer/src/components/UpdateNotificationModal.tsx` now carry live updater download percentages through `app:update-status` so the update modal can render a real progress bar while packaged downloads are in flight. That progress handoff now also covers the alpha-channel GitHub asset download branch in `AppUpdateService`, which derives percentages from streamed bytes whenever `content-length` is available.
- `renderer/src/components/gameManager/` now owns both image normalization helpers and ordered image-result aggregation helpers, leaving `GameManager.tsx` focused on state transitions, IPC coordination, and modal rendering.
- `renderer/src/components/gameManager/` also owns provider-progress helper logic for the image-search status row, so provider availability and provider-status event mapping stay outside the modal component body.
- `renderer/src/components/settings/` now owns extracted settings-tab bodies such as `SettingsIntegrationsTab.tsx` and `SettingsAboutTab.tsx`, leaving `OnyxSettingsModal.tsx` focused more on shared modal state, save orchestration, and tab routing than every large tab layout inline.
- `renderer/src/components/settings/SettingsGeneralTab.tsx` now owns the General tab body for startup, tray, hardware acceleration, and launch-window behavior toggles, so `OnyxSettingsModal.tsx` no longer embeds that UI inline.
- `renderer/src/components/settings/SettingsAnimationsTab.tsx` now owns the Animations tab body for the master animation override and per-surface animation toggles, so `OnyxSettingsModal.tsx` no longer embeds that UI inline.
- `renderer/src/hooks/useOnyxSettingsModalShellState.ts` now owns `OnyxSettingsModal.tsx` shell runtime concerns such as tab routing, updater/about state, and API credential status, so the modal shell no longer mixes those flows directly into its remaining settings persistence orchestration.
- `renderer/src/hooks/useOnyxSettingsLibrarySources.ts` now owns `OnyxSettingsModal.tsx` launcher/manual-folder loading and library-source actions, so the modal shell no longer mixes app-config discovery and manual-folder management directly into its remaining save/reset orchestration.
- `renderer/src/hooks/useOnyxSettingsModalPersistence.ts` now owns `OnyxSettingsModal.tsx` settings-load, save, background-scan, destructive reset/remove, and suspend-shortcut capture persistence workflows, so the modal shell is closer to pure tab composition than a giant persistence controller.
- `renderer/src/components/settings/SettingsLibrariesTab.tsx` now owns the Libraries tab body for manual folders and launcher configuration, further reducing the amount of library-management UI embedded directly in `OnyxSettingsModal.tsx`.
- `renderer/src/components/settings/SettingsAdvancedTab.tsx` now owns the Advanced tab body for folder actions and destructive maintenance confirmation UI, further reducing the amount of maintenance workflow markup embedded directly in `OnyxSettingsModal.tsx`.
- `renderer/src/components/settings/SettingsLinksTab.tsx` now owns the Link Management tab body for ordering and hidden-by-default visibility controls, further reducing the amount of link-settings UI embedded directly in `OnyxSettingsModal.tsx`.
- `renderer/src/components/settings/SettingsScanningTab.tsx` now owns the Scanning tab body for background scan controls and startup behavior toggles, further reducing the amount of scanning UI embedded directly in `OnyxSettingsModal.tsx`.
- `renderer/src/components/settings/SettingsSuspendTab.tsx` now owns the Suspend/Resume tab body for shortcut capture, elevation restart, and suspend feature toggles, further reducing the amount of suspend workflow UI embedded directly in `OnyxSettingsModal.tsx`.
- `renderer/src/components/gameProperties/GamePropertiesLinksTab.tsx` now owns the Add Games staged-editor Links tab body, so `GamePropertiesPanel.tsx` no longer embeds per-link row rendering and icon selection markup directly inside the giant editor shell.
- `renderer/src/components/gameProperties/GamePropertiesModManagerTab.tsx` now owns the Add Games staged-editor Mod Manager tab body, so `GamePropertiesPanel.tsx` no longer embeds that launch/configuration panel directly inside the giant editor shell.
- `renderer/src/components/gameProperties/useGamePropertiesMetadata.ts` now owns the Add Games staged-editor metadata undo/fix-match/apply-match workflow, so `GamePropertiesPanel.tsx` no longer embeds that metadata repair state machine directly inside the giant editor shell.
- `renderer/src/components/gameProperties/useGamePropertiesImages.ts` now owns the Add Games staged-editor image-search, browse, apply-image, and fast-search orchestration, so `GamePropertiesPanel.tsx` no longer embeds that image workflow state machine directly inside the giant editor shell.
- `renderer/src/components/gameProperties/GamePropertiesMetadataTab.tsx` now owns the Add Games staged-editor Metadata tab layout, so `GamePropertiesPanel.tsx` no longer needs to keep that large metadata-editing surface inline in the live render path.
- `renderer/src/components/gameProperties/GamePropertiesImagesTab.tsx` and `renderer/src/components/gameProperties/GamePropertiesImageStrip.tsx` now own the Add Games staged-editor Images tab layout and preview strip, so `GamePropertiesPanel.tsx` no longer needs to embed the image-search controls and artwork slot UI directly inside the giant editor shell.
- `renderer/src/components/GamePropertiesPanel.tsx` is now primarily a shared staged-editor shell that coordinates editable-field state, tab switching, save flushing, and footer actions instead of embedding the full metadata/images/links/mod-manager UI inline.
- `renderer/src/App.tsx` now routes uninstall actions through a confirmation state that can optionally remove the game from the Onyx library after opening the uninstall flow, while `renderer/src/components/ConfirmationDialog.tsx` supports embedded custom body content for checkbox-driven confirmations.
- `renderer/src/components/RightClickMenu.tsx` now opens the dense Game Details and Carousel button-color editor in a dedicated floating popup anchored to the trigger row, using a neutral shell border and full `Mod Manager` labeling so the picker reads like part of the menu instead of a warning state.
- `renderer/src/components/RightClickMenu.tsx` now exposes the persisted `autoSizeToFit` preference as a compact `Fill Available Space` toggle for grid view, while `renderer/src/App.tsx` recalculates grid tile width against the live left-panel width and visible height so boxart can shrink to fit all visible rows or grow to reduce right-side gaps as the details panel changes.
- `renderer/src/components/UpdateNotificationModal.tsx` now parses grouped changelog bullets with nested child items and renders each version's grouped headings directly, so update previews can mirror the actual `CHANGELOG.md` structure instead of re-splitting entries into guessed "features" and "fixes" buckets.
- `main/ipc/appHandlers.ts`, `main/preload.ts`, and `renderer/src/hooks/useAppShellSystemState.ts` now let dev/local test update previews prefer the workspace `CHANGELOG.md` before GitHub, so simulated update modals reflect unpushed local changelog edits while packaged/live update checks still use the remote-first path by default.

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
- Renderer source files: 144
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
