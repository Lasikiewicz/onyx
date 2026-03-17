# App Shell

## What This Feature Does

Owns the renderer root experience in [`App.tsx`](../../renderer/src/App.tsx): library-window composition, shell-level overlays, startup/update/crash handoffs, and the modal entry points that sit above individual feature surfaces.

## Related Documentation

- [Main View (Library Window)](./main-view.md)
- [Library Import and Startup Scan](./library-import-and-startup-scan.md)
- [Updater and Release Install](./updater.md)
- [Settings and Preferences Overview](./settings-and-preferences.md)
- [Crash Detection and Bug Reporting](./crash-detection-and-bug-reporting.md)
- [Add Games](./add-games.md)

## User-Facing Surfaces

- The root window shell in [`App.tsx`](../../renderer/src/App.tsx), which mounts the menu bar, current library view, details panel, and modal stack.
- The shell overlay compositor in [`AppShellOverlays.tsx`](../../renderer/src/components/appShell/AppShellOverlays.tsx), which renders startup scan progress, found-games review, update prompts, crash dump prompts, tutorial handoff, toast feedback, and missing-games cleanup.
- The startup scan progress/review overlay in [`StartupScanOverlay.tsx`](../../renderer/src/components/appShell/StartupScanOverlay.tsx), which shows startup scan progress and hands newly found games into the importer review flow.
- The shell event bridge in [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts), which owns root menu-event, startup-scan, updater, and crash-dump listener wiring.
- The shell preference bridge in [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts), which owns initial preference load, baseline defaults, refresh, and resolution-change preference reapplication.
- [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts) must treat initial preference bootstrap as a one-time startup action; normal in-session shell changes such as switching library view must not trigger a fresh preference load from disk.
- The shell animated-media policy bridge in [`useAnimatedMediaPolicy.ts`](../../renderer/src/hooks/useAnimatedMediaPolicy.ts), which strips animated image formats during overlays or disabled animation categories and enforces shell-wide video pause/resume behavior.
- The shell modal-state bridge in [`useAppShellModals.ts`](../../renderer/src/hooks/useAppShellModals.ts), which centralizes shell modal open/close state and tab/game targeting for settings, Game Manager, onboarding, and adjacent modal entry points.
- The shell system-state bridge in [`useAppShellSystemState.ts`](../../renderer/src/hooks/useAppShellSystemState.ts), which centralizes updater/changelog state, dev update-preview helpers, background-scan pause while update prompts are open, and crash-dump prompt actions.
- The settings-save refresh bridge in [`useSettingsSaveRefresh.ts`](../../renderer/src/hooks/useSettingsSaveRefresh.ts), which reloads shell-facing preferences after settings saves so runtime consumers update immediately without duplicating readback code in [`App.tsx`](../../renderer/src/App.tsx).
- The shell preference-writer bridge in [`usePreferenceWriter.ts`](../../renderer/src/hooks/usePreferenceWriter.ts), which centralizes direct renderer-side preference writes for root control surfaces such as the right-click menu.
- The startup scan review bridge in [`useStartupScanReview.ts`](../../renderer/src/hooks/useStartupScanReview.ts), which owns review/cancel actions for startup-discovered games before they hand off into the importer.
- The Game Manager shell bridge in [`useGameManagerShellBridge.ts`](../../renderer/src/hooks/useGameManagerShellBridge.ts), which owns the app-shell side of Game Manager save/delete maintenance actions and importer-open maintenance handoffs.
- The shell launch bridge in [`useGameLaunchFlow.ts`](../../renderer/src/hooks/useGameLaunchFlow.ts), which owns launch confirmation, launch execution, running-state tracking, and restore/minimize process-side behavior.
- The importer handoff bridge in [`useImporterWorkbench.ts`](../../renderer/src/hooks/useImporterWorkbench.ts), which owns importer-open guards, startup-scan/new-games handoff, importer reset behavior, and post-import tutorial follow-up.
- The visible-library selection policy in [`App.tsx`](../../renderer/src/App.tsx), which keeps `activeGameId` aligned to the current filtered game set so the details panel and background shell do not stick to an off-screen game after filters or clicks change the visible library.

## Settings and Toggles

- App-shell behavior depends on persisted preferences loaded and applied by [`App.tsx`](../../renderer/src/App.tsx), especially view mode, layout preferences, startup page, animation controls, and launch/restore options.
- Startup scan gating depends on updater dismissal and startup scan settings documented in [Library Import and Startup Scan](./library-import-and-startup-scan.md).
- Update modal behavior depends on the updater flow documented in [Updater and Release Install](./updater.md).

## Confirmed End-to-End Flows

1. Renderer boots in [`App.tsx`](../../renderer/src/App.tsx); [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts) loads preferences, applies baseline defaults when needed, restores shell state, and then the library window mounts with the persisted shell configuration.
2. [`App.tsx`](../../renderer/src/App.tsx) reconciles `activeGameId` against the currently visible filtered library; if the saved or previous selection is no longer visible, the shell promotes the first visible game so switching games, changing filters, and right-panel rendering stay in sync.
3. Main-process startup/update events reach the renderer via preload listeners; [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts) updates root state in [`App.tsx`](../../renderer/src/App.tsx) and [`AppShellOverlays.tsx`](../../renderer/src/components/appShell/AppShellOverlays.tsx) renders the matching overlay.
4. Startup scans show progress first, then use [`StartupScanOverlay.tsx`](../../renderer/src/components/appShell/StartupScanOverlay.tsx) to either dismiss quietly or route found games into the importer.
5. [`useAppShellModals.ts`](../../renderer/src/hooks/useAppShellModals.ts) normalizes settings, Game Manager, onboarding, and related modal routes so shell callbacks can target tabs or games without each surface reimplementing the same state transitions.
6. [`useAppShellSystemState.ts`](../../renderer/src/hooks/useAppShellSystemState.ts) owns update/changelog fetching, update-dismiss/update-download actions, and crash-dump prompt actions so updater and crash flows share one shell-level runtime state path.
7. [`useSettingsSaveRefresh.ts`](../../renderer/src/hooks/useSettingsSaveRefresh.ts) reapplies shell-facing settings after the user saves [`OnyxSettingsModal.tsx`](../../renderer/src/components/OnyxSettingsModal.tsx), keeping runtime shell controls aligned with persisted preferences without embedding that readback logic in the root component.
8. [`usePreferenceWriter.ts`](../../renderer/src/hooks/usePreferenceWriter.ts) now handles a chunk of the shell-level write-through preference updates for controls like the right-click menu, reducing repeated `savePreferences` wiring in [`App.tsx`](../../renderer/src/App.tsx).
9. [`useStartupScanReview.ts`](../../renderer/src/hooks/useStartupScanReview.ts) owns the startup overlay’s cancel/review actions so found-games review routes into the importer through one focused handoff path.
10. [`useGameManagerShellBridge.ts`](../../renderer/src/hooks/useGameManagerShellBridge.ts) owns the shell-side Game Manager maintenance bridge, including delete/save follow-up and maintenance-mode importer handoff.
11. [`useImporterWorkbench.ts`](../../renderer/src/hooks/useImporterWorkbench.ts) converts menu actions, Welcome Screen onboarding, startup-scan discoveries, and Game Manager maintenance flows into one importer lifecycle for [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx).
12. Update availability, crash dumps, tutorial prompts, toast messages, and missing-games cleanup all render above the library shell without each feature owning its own root-level wiring.

## Discovery and Data Sources

- Root renderer state comes from [`App.tsx`](../../renderer/src/App.tsx), [`useGameLibrary.ts`](../../renderer/src/hooks/useGameLibrary.ts), [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts), [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts), and preload APIs exposed by [`main/preload.ts`](../../main/preload.ts).
- Animated-media policy comes from [`useAnimatedMediaPolicy.ts`](../../renderer/src/hooks/useAnimatedMediaPolicy.ts), which derives display-safe library records from overlay state and animation preferences before library views render.
- Startup scan events come from the startup scan flow documented in [Library Import and Startup Scan](./library-import-and-startup-scan.md).
- Update state comes from the updater flow documented in [Updater and Release Install](./updater.md).
- Crash dump prompts come from crash detection services documented in [Crash Detection and Bug Reporting](./crash-detection-and-bug-reporting.md).

## Data Model and Persistence

- The shell itself does not persist a separate app-shell document store.
- Persistent shell-affecting state is loaded from preferences in [`App.tsx`](../../renderer/src/App.tsx) and written through [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts).
- Transient overlay state such as `toast`, `startupProgress`, `foundGames`, `missingGames`, `updateNotification`, and `crashDumpPaths` lives in [`App.tsx`](../../renderer/src/App.tsx) and is only held in memory.

## Failure Modes and Triage

### Symptom: Startup scan blocks the app or never reaches importer review

- Check `startup:*` listeners in [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts) and rendering in [`StartupScanOverlay.tsx`](../../renderer/src/components/appShell/StartupScanOverlay.tsx).
- Cross-check startup gating in [Library Import and Startup Scan](./library-import-and-startup-scan.md).

### Symptom: Update prompt appears but changelog/version data is missing

- Check the changelog fetch in [`App.tsx`](../../renderer/src/App.tsx) and update-status listener wiring in [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts).
- Check the shell overlay handoff in [`AppShellOverlays.tsx`](../../renderer/src/components/appShell/AppShellOverlays.tsx).
- Cross-check updater behavior in [Updater and Release Install](./updater.md).

### Symptom: Crash dump or missing-games prompts do not show

- Check the relevant event listeners in [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts) and local state in [`App.tsx`](../../renderer/src/App.tsx).
- Check the shell overlay rendering path in [`AppShellOverlays.tsx`](../../renderer/src/components/appShell/AppShellOverlays.tsx).

### Symptom: layout or display settings do not restore on launch

- Check preference load/apply flow in [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts).
- Check the persisted settings source in [Settings and Preferences Overview](./settings-and-preferences.md).

### Symptom: switching views or other shell controls snap back immediately

- Check that [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts) is not re-running its initialization effect after normal shell state changes.
- Check whether the persisted preference load is being called only on startup or explicit refresh paths such as imported settings.

### Symptom: clicking another visible game does not update the shell selection

- Check the `activeGameId` reconciliation logic in [`App.tsx`](../../renderer/src/App.tsx), especially the effect that reselects the first visible game when the previous selection is no longer in `filteredGames`.
- Check that the current view component (`LibraryGrid`, `LibraryListView`, `LibraryCarousel`, or `LibraryCoverFlow`) is forwarding `onGameClick` back to [`App.tsx`](../../renderer/src/App.tsx).

## File Ownership Map

- [App.tsx](../../renderer/src/App.tsx) - renderer root, shell state ownership, top-level event wiring, and library-shell composition.
- [AppShellOverlays.tsx](../../renderer/src/components/appShell/AppShellOverlays.tsx) - root overlay compositor for update, crash, tutorial, toast, missing-games, and startup scan UI.
- [StartupScanOverlay.tsx](../../renderer/src/components/appShell/StartupScanOverlay.tsx) - startup progress overlay and found-games review handoff.
- [useAppShellEvents.ts](../../renderer/src/hooks/useAppShellEvents.ts) - root menu, startup scan, updater, and crash-dump listener registration for the app shell.
- [useAppPreferences.ts](../../renderer/src/hooks/useAppPreferences.ts) - renderer preference bootstrap, refresh, baseline-default application, and resolution-change preference sync.
- [useAnimatedMediaPolicy.ts](../../renderer/src/hooks/useAnimatedMediaPolicy.ts) - shell-wide animation sanitization and DOM video pause/resume policy enforcement.
- [useAppShellModals.ts](../../renderer/src/hooks/useAppShellModals.ts) - shell modal state ownership and tab/game-aware open-close helpers for root modal entry points.
- [useAppShellSystemState.ts](../../renderer/src/hooks/useAppShellSystemState.ts) - updater, changelog, and crash-dump runtime state plus the shell actions that operate on them.
- [useSettingsSaveRefresh.ts](../../renderer/src/hooks/useSettingsSaveRefresh.ts) - settings-save preference readback and runtime shell refresh after modal saves.
- [usePreferenceWriter.ts](../../renderer/src/hooks/usePreferenceWriter.ts) - direct renderer-side preference write helpers used by shell control surfaces.
- [useStartupScanReview.ts](../../renderer/src/hooks/useStartupScanReview.ts) - startup scan review/cancel handoff from shell overlays into the importer flow.
- [useGameManagerShellBridge.ts](../../renderer/src/hooks/useGameManagerShellBridge.ts) - shell-side Game Manager maintenance, save/delete follow-up, and importer handoff wiring.
- [useGameLaunchFlow.ts](../../renderer/src/hooks/useGameLaunchFlow.ts) - renderer launch confirmation, launch execution, process polling, and running-state tracking for the app shell.
- [useImporterWorkbench.ts](../../renderer/src/hooks/useImporterWorkbench.ts) - importer lifecycle orchestration shared by startup handoff, menu actions, onboarding, and Game Manager cleanup flows.
- [FoundGamesModal.tsx](../../renderer/src/components/FoundGamesModal.tsx) - reusable found-games review modal used by the startup overlay when scans discover new titles.
- [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx) - top-level shell entry points into importer, settings, updater, tutorial, and other library actions.
