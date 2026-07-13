# Settings and Preferences

## What This Feature Does

Defines the application-wide configuration surface for startup behavior, window behavior, visuals, scanning, library sources, third-party integrations, links, maintenance actions, suspend resume, and app information.

This parent file is the settings overview and routing document. Detailed behavior for each main tab lives in the settings sub-runbooks under [settings/](./settings/README.md).

## Related Documentation

- [Settings Architecture](./settings-architecture.md) - system-level map of settings UI, persistence, and runtime consumers.
- [Main View](./main-view.md) — many layout and display options (panel width, view mode, categories) are applied in the main view.
- [Library import and startup scan](./library-import-and-startup-scan.md), [Metadata matching and enrichment](./metadata-matching-and-enrichment.md), [Links and link management](./links-and-link-management.md) — settings tabs affect those features.
- [Suspend and resume](./suspend-and-resume.md), [Crash detection and bug reporting](./crash-detection-and-bug-reporting.md) — related settings and modals.

## User-Facing Surfaces

- `Onyx Settings` modal ([OnyxSettingsModal.tsx](../../renderer/src/components/OnyxSettingsModal.tsx)).
- Extracted tab components under [`renderer/src/components/settings/`](../../renderer/src/components/settings), including [`SettingsGeneralTab.tsx`](../../renderer/src/components/settings/SettingsGeneralTab.tsx), [`SettingsAnimationsTab.tsx`](../../renderer/src/components/settings/SettingsAnimationsTab.tsx), [`SettingsIntegrationsTab.tsx`](../../renderer/src/components/settings/SettingsIntegrationsTab.tsx), [`SettingsAboutTab.tsx`](../../renderer/src/components/settings/SettingsAboutTab.tsx), [`SettingsLibrariesTab.tsx`](../../renderer/src/components/settings/SettingsLibrariesTab.tsx), [`SettingsAdvancedTab.tsx`](../../renderer/src/components/settings/SettingsAdvancedTab.tsx), [`SettingsLinksTab.tsx`](../../renderer/src/components/settings/SettingsLinksTab.tsx), [`SettingsScanningTab.tsx`](../../renderer/src/components/settings/SettingsScanningTab.tsx), and [`SettingsSuspendTab.tsx`](../../renderer/src/components/settings/SettingsSuspendTab.tsx), which now carry the heaviest tab-specific layouts and help keep the modal shell smaller.
- Shared modal runtime behavior now also flows through [`useOnyxSettingsModalShellState.ts`](../../renderer/src/hooks/useOnyxSettingsModalShellState.ts) so updater/about state, API credentials status, and tab routing no longer sit inline inside the modal shell.
- Launcher source loading and manual-folder actions now also flow through [`useOnyxSettingsLibrarySources.ts`](../../renderer/src/hooks/useOnyxSettingsLibrarySources.ts) so the modal shell no longer owns all library-source discovery and editing behavior inline.
- Settings loading, save application, destructive reset/remove flows, background scan values, and suspend shortcut persistence now also flow through [`useOnyxSettingsModalPersistence.ts`](../../renderer/src/hooks/useOnyxSettingsModalPersistence.ts) so the modal shell no longer owns the full persistence workflow inline.
- Main settings tabs:
  - [General](./settings/general.md)
  - [Animations](./settings/animations.md)
  - [Scanning](./settings/scanning.md)
  - [Libraries](./settings/libraries.md)
  - [API Integrations](./settings/api-integrations.md)
  - [Link Management](./settings/link-management.md)
  - [Advanced](./settings/advanced.md)
  - [Suspend Resume](./settings/suspend-resume.md)
  - [About](./settings/about.md)

## Settings and Toggles

- This feature owns the app's complete settings surface.
- Detailed toggle inventories are maintained in the tab-specific runbooks.
- Shared persistence is centered on [UserPreferencesService](../../main/UserPreferencesService.ts), with some tabs also calling dedicated IPC or credential storage APIs.
- Controller navigation settings (`enableGamepadSupport`, `gamepadNavigationSpeed`, `gamepadButtonLayout`) default in [UserPreferencesService](../../main/UserPreferencesService.ts), but the General tab currently marks them coming soon and [App.tsx](../../renderer/src/App.tsx) keeps [useControllerNavigation.ts](../../renderer/src/hooks/useControllerNavigation.ts) disabled.
- Top-bar layout settings (`topBarPositions`) default in [UserPreferencesService](../../main/UserPreferencesService.ts), are loaded by [useAppShellViewState.ts](../../renderer/src/hooks/useAppShellViewState.ts), and are edited from the fixed top bar's right-click layout menu in [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx) / [TopBarContextMenu.tsx](../../renderer/src/components/TopBarContextMenu.tsx).
- Tray settings (`showSystemTrayIcon`, `minimizeToTray`, `closeToTray`) are stored as General preferences and consumed by [main.ts](../../main/main.ts), [appHandlers.ts](../../main/ipc/appHandlers.ts), and [tray.ts](../../main/ui/tray.ts) so minimize, close, and tray-restore behavior stay aligned.

## Confirmed End-to-End Flows

1. Renderer opens `OnyxSettingsModal` and loads current settings state.
2. User edits values in one or more tabs.
3. Renderer saves through preload-exposed APIs.
4. Main-process services persist preferences, credentials, or operational config.
5. Renderer refreshes state and runtime consumers pick up changes immediately or on next startup, depending on the setting.
6. The settings modal is lazy-loaded from [App.tsx](../../renderer/src/App.tsx), so the initial app shell does not pay the full settings bundle cost until the user opens Settings.
7. Top-bar layout edits are applied from the top-bar context menu rather than the settings modal, but they use the same preferences store and restore with the rest of the app shell on launch.

## Discovery and Data Sources

- Primary settings UI: [OnyxSettingsModal.tsx](../../renderer/src/components/OnyxSettingsModal.tsx)
- Extracted tab bodies: [SettingsGeneralTab.tsx](../../renderer/src/components/settings/SettingsGeneralTab.tsx), [SettingsAnimationsTab.tsx](../../renderer/src/components/settings/SettingsAnimationsTab.tsx), [SettingsIntegrationsTab.tsx](../../renderer/src/components/settings/SettingsIntegrationsTab.tsx), [SettingsAboutTab.tsx](../../renderer/src/components/settings/SettingsAboutTab.tsx), [SettingsLibrariesTab.tsx](../../renderer/src/components/settings/SettingsLibrariesTab.tsx), [SettingsAdvancedTab.tsx](../../renderer/src/components/settings/SettingsAdvancedTab.tsx), [SettingsLinksTab.tsx](../../renderer/src/components/settings/SettingsLinksTab.tsx), [SettingsScanningTab.tsx](../../renderer/src/components/settings/SettingsScanningTab.tsx), and [SettingsSuspendTab.tsx](../../renderer/src/components/settings/SettingsSuspendTab.tsx)
- Shared modal workflow hooks: [useOnyxSettingsModalShellState.ts](../../renderer/src/hooks/useOnyxSettingsModalShellState.ts), [useOnyxSettingsLibrarySources.ts](../../renderer/src/hooks/useOnyxSettingsLibrarySources.ts), and [useOnyxSettingsModalPersistence.ts](../../renderer/src/hooks/useOnyxSettingsModalPersistence.ts)
- Shared persistence: [UserPreferencesService.ts](../../main/UserPreferencesService.ts)
- Runtime application of settings happens in [App.tsx](../../renderer/src/App.tsx), [useAppPreferences.ts](../../renderer/src/hooks/useAppPreferences.ts), [useAppShellViewState.ts](../../renderer/src/hooks/useAppShellViewState.ts), [useSettingsSaveRefresh.ts](../../renderer/src/hooks/useSettingsSaveRefresh.ts), [usePreferenceWriter.ts](../../renderer/src/hooks/usePreferenceWriter.ts), [useRightClickMenuControls.ts](../../renderer/src/hooks/useRightClickMenuControls.ts), [useAppShellModalControls.ts](../../renderer/src/hooks/useAppShellModalControls.ts), Electron bootstrap code, metadata services, import services, and launcher flows.
- Per-tab behavior is documented in [settings/README.md](./settings/README.md) and the linked tab docs.

## Data Model and Persistence

- Most settings persist in the user preferences store ([UserPreferencesService.ts](../../main/UserPreferencesService.ts)).
- The top-bar layout preference stores individual positions for `searchBar`, `sortBy`, `launcher`, `categories`, and `pinnedCategories`, including the `hidden` state for each item.
- Gamepad settings are ordinary user preferences, not a separate controller profile store; the renderer keeps the stored values for future support while the controller surface is marked coming soon.
- Some operational values use dedicated APIs or related stores:
  - background scanning configuration
  - API credentials ([APICredentialsService.ts](../../main/APICredentialsService.ts))
  - launcher and library configuration
- Defaults originate in [UserPreferencesService.createDefaultPreferences()](../../main/UserPreferencesService.ts).
- Game Details logo size (`rightPanelLogoSize`) defaults to `300` px to present a large, high-fidelity logo standardly. The description text container dynamically auto-fits to the available height of the panel using `minHeight: 0` and `overflowY: 'auto'` to prevent content from pushing details below the fold.
- Grid and Logo views share a single `gridSmartFill` preference (right-click menu "Smart Fill") that auto-shrinks tiles so every game fits on one screen without scrolling, replacing the earlier grid-only pixel-size "Fill Available Space" behavior; see [Grid View](./main-view/views/grid-view.md) and [Logo View](./main-view/views/logo-view.md) for the tile-fitting details.

## Failure Modes and Triage

### Symptom: Setting saves in UI but is lost after restart

- Verify the save path writes to the expected persistence service.
- Confirm the preference key exists in defaults and readback logic.
- Check whether the setting belongs to credentials or another non-preferences store.

### Symptom: Setting persists but behavior does not change

- Confirm the runtime consumer reads the same key.
- Check whether the affected subsystem only reads the setting at startup.
- Inspect the relevant tab runbook for subsystem-specific application rules.

### Symptom: Top-bar controls do not restore, move, or hide correctly

- Confirm `topBarPositions` has the expected keys in [UserPreferencesService.ts](../../main/UserPreferencesService.ts).
- Check [useAppShellViewState.ts](../../renderer/src/hooks/useAppShellViewState.ts) for preference load/defaults and [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx) for rendering hidden versus positioned controls.

### Symptom: A settings area is unclear or incomplete

- Treat the matching tab doc in [settings/](./settings/README.md) as the first required update target.
- Update this parent overview if architecture or cross-tab behavior changed.

## File Ownership Map

- **Overview and navigation docs**
  - [settings/README.md](./settings/README.md)
  - [general.md](./settings/general.md), [animations.md](./settings/animations.md), [scanning.md](./settings/scanning.md), [libraries.md](./settings/libraries.md), [api-integrations.md](./settings/api-integrations.md), [link-management.md](./settings/link-management.md), [advanced.md](./settings/advanced.md), [suspend-resume.md](./settings/suspend-resume.md), [about.md](./settings/about.md)
- **Main process**
  - [UserPreferencesService.ts](../../main/UserPreferencesService.ts)
  - [AppConfigService.ts](../../main/AppConfigService.ts)
  - [InstallerPreferenceService.ts](../../main/InstallerPreferenceService.ts)
  - [APICredentialsService.ts](../../main/APICredentialsService.ts)
  - [electronStoreShim.ts](../../main/electronStoreShim.ts)
  - [ipc/appHandlers.ts](../../main/ipc/appHandlers.ts)
  - [main.ts](../../main/main.ts)
  - [tray.ts](../../main/ui/tray.ts)
- **Renderer**
  - [OnyxSettingsModal.tsx](../../renderer/src/components/OnyxSettingsModal.tsx)
  - [App.tsx](../../renderer/src/App.tsx)
  - [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx)
  - [TopBarContextMenu.tsx](../../renderer/src/components/TopBarContextMenu.tsx)
  - [useAppShellViewState.ts](../../renderer/src/hooks/useAppShellViewState.ts)
  - [useSettingsSaveRefresh.ts](../../renderer/src/hooks/useSettingsSaveRefresh.ts)
  - [usePreferenceWriter.ts](../../renderer/src/hooks/usePreferenceWriter.ts)
  - [useRightClickMenuControls.ts](../../renderer/src/hooks/useRightClickMenuControls.ts)
  - [useAppShellModalControls.ts](../../renderer/src/hooks/useAppShellModalControls.ts)

