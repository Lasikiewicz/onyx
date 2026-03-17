# Onyx Refactor Roadmap

This file tracks the remaining work to fully refactor Onyx into smaller, safer, easier-to-test modules.
Completed historical items have been removed so this stays focused on what is still worth doing.

## 1. Renderer Hotspots

- [ ] **Finish decomposing `App.tsx`** - Move the remaining shell orchestration in [`App.tsx`](../renderer/src/App.tsx) into focused hooks/components, especially background/media policy, importer handoff state, and any remaining modal-control glue that still makes the file hard to reason about.
  Current progress: animated-media policy now lives in [`useAnimatedMediaPolicy.ts`](../renderer/src/hooks/useAnimatedMediaPolicy.ts), importer lifecycle/handoff now lives in [`useImporterWorkbench.ts`](../renderer/src/hooks/useImporterWorkbench.ts), startup scan review handoff now lives in [`useStartupScanReview.ts`](../renderer/src/hooks/useStartupScanReview.ts), shell modal state now lives in [`useAppShellModals.ts`](../renderer/src/hooks/useAppShellModals.ts), updater/crash runtime state now lives in [`useAppShellSystemState.ts`](../renderer/src/hooks/useAppShellSystemState.ts), settings-save readback now lives in [`useSettingsSaveRefresh.ts`](../renderer/src/hooks/useSettingsSaveRefresh.ts), some direct shell preference writes now flow through [`usePreferenceWriter.ts`](../renderer/src/hooks/usePreferenceWriter.ts), Game Manager shell follow-up now lives in [`useGameManagerShellBridge.ts`](../renderer/src/hooks/useGameManagerShellBridge.ts), main-view shell action bundles now live in [`useMainViewShellControls.ts`](../renderer/src/hooks/useMainViewShellControls.ts), right-click settings menu routing now lives in [`useRightClickMenuControls.ts`](../renderer/src/hooks/useRightClickMenuControls.ts), smaller onboarding/context-menu/overlay shell props now live in [`useAppShellSurfaceActions.ts`](../renderer/src/hooks/useAppShellSurfaceActions.ts), game-details-panel shell props now live in [`useGameDetailsPanelControls.ts`](../renderer/src/hooks/useGameDetailsPanelControls.ts), and settings/importer/Game Manager modal shell props now live in [`useAppShellModalControls.ts`](../renderer/src/hooks/useAppShellModalControls.ts), so the remaining work is the rest of the shell-level control orchestration.
- [ ] **Split `OnyxSettingsModal.tsx` by tab/workflow** - Break [`OnyxSettingsModal.tsx`](../renderer/src/components/OnyxSettingsModal.tsx) into tab-level components plus shared settings state/persistence helpers so the modal is no longer a single giant UI surface.
  Current progress: heavy tabs now live in [`SettingsIntegrationsTab.tsx`](../renderer/src/components/settings/SettingsIntegrationsTab.tsx), [`SettingsAboutTab.tsx`](../renderer/src/components/settings/SettingsAboutTab.tsx), [`SettingsLibrariesTab.tsx`](../renderer/src/components/settings/SettingsLibrariesTab.tsx), [`SettingsAdvancedTab.tsx`](../renderer/src/components/settings/SettingsAdvancedTab.tsx), and [`SettingsLinksTab.tsx`](../renderer/src/components/settings/SettingsLinksTab.tsx), so the remaining work is the rest of the embedded settings tabs and shared modal workflow state.
- [ ] **Refactor `RightClickMenu.tsx` into view-specific sections** - Extract view settings, per-game actions, and shell display controls from [`RightClickMenu.tsx`](../renderer/src/components/RightClickMenu.tsx) so context-menu behavior is easier to change without regressions.
- [ ] **Decompose `GamePropertiesPanel.tsx`** - Split [`GamePropertiesPanel.tsx`](../renderer/src/components/GamePropertiesPanel.tsx) into tab components and shared hooks, mirroring the Game Manager refactor, because Add Games still depends on one very large staged-game editor.
- [ ] **Break up `ImportWorkbenchV2.tsx`** - Split [`ImportWorkbenchV2.tsx`](../renderer/src/components/importer/ImportWorkbenchV2.tsx) into queue/sidebar, staged editor, import progress, and scanner-control slices so importer changes do not require editing one large screen component.

## 2. Main-Process Hotspots

- [ ] **Refactor `ImportService.ts` into real scanner modules** - Continue the scanner cleanup in [`ImportService.ts`](../main/ImportService.ts) by moving launcher-specific scanning into pluggable scanner modules instead of keeping the service as the central control tower for every source.
- [ ] **Split `UserPreferencesService.ts` into domain slices** - Separate defaults/schema, migration logic, import/export logic, and per-feature preference helpers inside [`UserPreferencesService.ts`](../main/UserPreferencesService.ts) so preference changes are easier to review and test.
- [ ] **Break down `ImageCacheService.ts`** - Extract cache path resolution, optimization/FFmpeg work, remote fetch normalization, and cleanup policy from [`ImageCacheService.ts`](../main/ImageCacheService.ts) into smaller modules with narrower responsibilities.
- [ ] **Keep shrinking `main.ts`** - Move any remaining startup/window/tray/update orchestration from [`main.ts`](../main/main.ts) into dedicated modules so the Electron entrypoint stays mostly wiring, not behavior.

## 3. Contract and State Safety

- [ ] **Add focused tests for app-shell state hooks** - Cover [`useAppPreferences.ts`](../renderer/src/hooks/useAppPreferences.ts), [`useAppShellEvents.ts`](../renderer/src/hooks/useAppShellEvents.ts), and [`useGameLaunchFlow.ts`](../renderer/src/hooks/useGameLaunchFlow.ts) directly so future shell refactors do not silently break selection, view switching, or startup/update wiring.
- [ ] **Add focused tests for Game Manager hooks** - Cover [`useGameManagerImageSearch.ts`](../renderer/src/components/gameManager/useGameManagerImageSearch.ts), [`useGameManagerMetadata.ts`](../renderer/src/components/gameManager/useGameManagerMetadata.ts), [`useGameManagerMaintenance.ts`](../renderer/src/components/gameManager/useGameManagerMaintenance.ts), and [`useGameManagerRefresh.ts`](../renderer/src/components/gameManager/useGameManagerRefresh.ts).
- [ ] **Add a stronger mocked Electron shell regression suite** - Expand [`renderer/tests/App.shell.smoke.test.tsx`](../renderer/tests/App.shell.smoke.test.tsx) into a more useful suite that verifies selection, view switching, startup overlays, and updater/menu-event behavior.
- [ ] **Add snapshot/default coverage for preferences** - Add tests around [`UserPreferencesService.ts`](../main/UserPreferencesService.ts) defaults, migration paths, and resolution normalization so app-shell and settings refactors have a safety net.

## 4. Settings and Persistence Cleanup

- [ ] **Centralize renderer preference writes** - Reduce scattered `window.electronAPI.savePreferences(...)` calls across [`App.tsx`](../renderer/src/App.tsx), [`RightClickMenu.tsx`](../renderer/src/components/RightClickMenu.tsx), and settings surfaces by creating clearer per-domain save helpers.
- [ ] **Unify settings import/export refresh behavior** - Make sure settings import, live shell updates, and persisted preference reloads use one clear pathway so future shell/settings changes cannot reintroduce state snap-back bugs.
- [ ] **Audit per-view preference ownership** - Clarify which view-specific preferences belong in shell state, per-view helpers, or settings tab components so there is less duplication between [`App.tsx`](../renderer/src/App.tsx), [`RightClickMenu.tsx`](../renderer/src/components/RightClickMenu.tsx), and [`UserPreferencesService.ts`](../main/UserPreferencesService.ts).

## 5. Documentation Gaps

- [x] **Add a dedicated settings architecture runbook** - Added [`docs/features/settings-architecture.md`](./features/settings-architecture.md) to tie together [`OnyxSettingsModal.tsx`](../renderer/src/components/OnyxSettingsModal.tsx), [`UserPreferencesService.ts`](../main/UserPreferencesService.ts), and runtime consumers.
- [x] **Add an importer architecture runbook** - Added [`docs/features/importer-architecture.md`](./features/importer-architecture.md) to document scanner selection, staged-game editing, metadata/image enrichment, and final library persistence as one system.

## 6. Maintenance Follow-Through

- [ ] **Prune temporary lint exemptions over time** - Revisit [`eslint.config.mjs`](../eslint.config.mjs) and remove targeted legacy exceptions as the largest renderer and main-process hotspots are split up.

## 7. Suggested Order

- [ ] **Phase 1** - `OnyxSettingsModal.tsx`, `GamePropertiesPanel.tsx`, and `ImportWorkbenchV2.tsx`
- [ ] **Phase 2** - `ImportService.ts`, `UserPreferencesService.ts`, and `ImageCacheService.ts`
- [ ] **Phase 3** - stronger app-shell/Game Manager hook tests and broader mocked Electron regressions
- [ ] **Phase 4** - remove temporary lint exceptions and tighten static-analysis rules again
