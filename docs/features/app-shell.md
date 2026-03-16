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
- The shell launch bridge in [`useGameLaunchFlow.ts`](../../renderer/src/hooks/useGameLaunchFlow.ts), which owns launch confirmation, launch execution, running-state tracking, and restore/minimize process-side behavior.

## Settings and Toggles

- App-shell behavior depends on persisted preferences loaded and applied by [`App.tsx`](../../renderer/src/App.tsx), especially view mode, layout preferences, startup page, animation controls, and launch/restore options.
- Startup scan gating depends on updater dismissal and startup scan settings documented in [Library Import and Startup Scan](./library-import-and-startup-scan.md).
- Update modal behavior depends on the updater flow documented in [Updater and Release Install](./updater.md).

## Confirmed End-to-End Flows

1. Renderer boots in [`App.tsx`](../../renderer/src/App.tsx); [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts) loads preferences, applies baseline defaults when needed, restores shell state, and then the library window mounts with the persisted shell configuration.
2. Main-process startup/update events reach the renderer via preload listeners; [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts) updates root state in [`App.tsx`](../../renderer/src/App.tsx) and [`AppShellOverlays.tsx`](../../renderer/src/components/appShell/AppShellOverlays.tsx) renders the matching overlay.
3. Startup scans show progress first, then use [`StartupScanOverlay.tsx`](../../renderer/src/components/appShell/StartupScanOverlay.tsx) to either dismiss quietly or route found games into the importer.
4. Update availability, crash dumps, tutorial prompts, toast messages, and missing-games cleanup all render above the library shell without each feature owning its own root-level wiring.

## Discovery and Data Sources

- Root renderer state comes from [`App.tsx`](../../renderer/src/App.tsx), [`useGameLibrary.ts`](../../renderer/src/hooks/useGameLibrary.ts), [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts), [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts), and preload APIs exposed by [`main/preload.ts`](../../main/preload.ts).
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

## File Ownership Map

- [App.tsx](../../renderer/src/App.tsx) - renderer root, shell state ownership, top-level event wiring, and library-shell composition.
- [AppShellOverlays.tsx](../../renderer/src/components/appShell/AppShellOverlays.tsx) - root overlay compositor for update, crash, tutorial, toast, missing-games, and startup scan UI.
- [StartupScanOverlay.tsx](../../renderer/src/components/appShell/StartupScanOverlay.tsx) - startup progress overlay and found-games review handoff.
- [useAppShellEvents.ts](../../renderer/src/hooks/useAppShellEvents.ts) - root menu, startup scan, updater, and crash-dump listener registration for the app shell.
- [useAppPreferences.ts](../../renderer/src/hooks/useAppPreferences.ts) - renderer preference bootstrap, refresh, baseline-default application, and resolution-change preference sync.
- [useGameLaunchFlow.ts](../../renderer/src/hooks/useGameLaunchFlow.ts) - renderer launch confirmation, launch execution, process polling, and running-state tracking for the app shell.
- [FoundGamesModal.tsx](../../renderer/src/components/FoundGamesModal.tsx) - reusable found-games review modal used by the startup overlay when scans discover new titles.
- [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx) - top-level shell entry points into importer, settings, updater, tutorial, and other library actions.
