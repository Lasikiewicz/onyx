# Onyx Refactor Roadmap

This file tracks the remaining work to fully refactor Onyx into smaller, safer, easier-to-test modules.
Completed historical items have been removed so this stays focused on what is still worth doing.

- Main-Process Hotspots
  - [ ] **Refactor `ImportService.ts` into real scanner modules**
    - Continue the scanner cleanup in [`ImportService.ts`](../main/ImportService.ts) by moving launcher-specific scanning into pluggable scanner modules instead of keeping the service as the central control tower for every source.
  - [ ] **Split `UserPreferencesService.ts` into domain slices**
    - Separate defaults/schema, migration logic, import/export logic, and per-feature preference helpers inside [`UserPreferencesService.ts`](../main/UserPreferencesService.ts) so preference changes are easier to review and test.
  - [ ] **Break down `ImageCacheService.ts`**
    - Extract cache path resolution, optimization/FFmpeg work, remote fetch normalization, and cleanup policy from [`ImageCacheService.ts`](../main/ImageCacheService.ts) into smaller modules with narrower responsibilities.
  - [ ] **Keep shrinking `main.ts`**
    - Move any remaining startup/window/tray/update orchestration from [`main.ts`](../main/main.ts) into dedicated modules so the Electron entrypoint stays mostly wiring, not behavior.

- Contract and State Safety
  - [ ] **Add focused tests for app-shell state hooks**
    - Cover [`useAppPreferences.ts`](../renderer/src/hooks/useAppPreferences.ts), [`useAppShellEvents.ts`](../renderer/src/hooks/useAppShellEvents.ts), and [`useGameLaunchFlow.ts`](../renderer/src/hooks/useGameLaunchFlow.ts) directly so future shell refactors do not silently break selection, view switching, or startup/update wiring.
  - [ ] **Add focused tests for Game Manager hooks**
    - Cover [`useGameManagerImageSearch.ts`](../renderer/src/components/gameManager/useGameManagerImageSearch.ts), [`useGameManagerMetadata.ts`](../renderer/src/components/gameManager/useGameManagerMetadata.ts), [`useGameManagerMaintenance.ts`](../renderer/src/components/gameManager/useGameManagerMaintenance.ts), and [`useGameManagerRefresh.ts`](../renderer/src/components/gameManager/useGameManagerRefresh.ts).
  - [ ] **Add a stronger mocked Electron shell regression suite**
    - Expand [`renderer/tests/App.shell.smoke.test.tsx`](../renderer/tests/App.shell.smoke.test.tsx) into a more useful suite that verifies selection, view switching, startup overlays, and updater/menu-event behavior.
  - [ ] **Add snapshot/default coverage for preferences**
    - Add tests around [`UserPreferencesService.ts`](../main/UserPreferencesService.ts) defaults, migration paths, and resolution normalization so app-shell and settings refactors have a safety net.

- Settings and Persistence Cleanup
  - [ ] **Centralize renderer preference writes**
    - Reduce scattered `window.electronAPI.savePreferences(...)` calls across [`App.tsx`](../renderer/src/App.tsx), [`RightClickMenu.tsx`](../renderer/src/components/RightClickMenu.tsx), and settings surfaces by creating clearer per-domain save helpers.
  - [ ] **Unify settings import/export refresh behavior**
    - Make sure settings import, live shell updates, and persisted preference reloads use one clear pathway so future shell/settings changes cannot reintroduce state snap-back bugs.
  - [ ] **Audit per-view preference ownership**
    - Clarify which view-specific preferences belong in shell state, per-view helpers, or settings tab components so there is less duplication between [`App.tsx`](../renderer/src/App.tsx), [`RightClickMenu.tsx`](../renderer/src/components/RightClickMenu.tsx), and [`UserPreferencesService.ts`](../main/UserPreferencesService.ts).

- Maintenance Follow-Through
  - [ ] **Prune temporary lint exemptions over time**
    - Revisit [`eslint.config.mjs`](../renderer/../eslint.config.mjs) and remove targeted legacy exceptions as the largest renderer and main-process hotspots are split up.

