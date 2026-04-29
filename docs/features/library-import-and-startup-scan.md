# Library Import and Startup Scan

## What This Feature Does

Finds games from configured launchers/folders and imports them into the local library.

## Related Documentation

- [Add Games](./add-games.md) - staged import-review workspace for editing discovered games before they are committed to the library.
- [Settings and preferences](./settings-and-preferences.md) — [Libraries](./settings/libraries.md) and [Scanning](./settings/scanning.md) tabs for startup and background scan options.
- [Game launch and process tracking](./game-launch-and-process-tracking.md) — launcher resolution uses [LauncherService](../../main/LauncherService.ts) and [LauncherDetectionService](../../main/LauncherDetectionService.ts).
- [Metadata matching and enrichment](./metadata-matching-and-enrichment.md) — identity and matching during import.
- [Game Manager](./game-manager.md) - per-game maintenance modal that reuses import-adjacent cleanup, fix, and refresh workflows after games are already in the library.

## User-Facing Surfaces

- Initial startup scan flow.
- Manual library update/import dialogs.
- Add Games review/editor surfaces for per-title metadata, links, and artwork changes before import completes.
- Found games, missing games, and remove-deleted-games review dialogs.
- Startup scan progress and found-games review overlay in [`StartupScanOverlay.tsx`](../../renderer/src/components/appShell/StartupScanOverlay.tsx), mounted from [`AppShellOverlays.tsx`](../../renderer/src/components/appShell/AppShellOverlays.tsx).
- Settings surfaces for launcher configuration, library folders, and startup scanning.

## Settings and Toggles

- `Update Libraries on Startup`
- Background scanning enablement and interval
- Library folder configuration
- Launcher-specific install and library path configuration
- Automatic background scans are temporarily paused while the update notification modal is open, then resumed when the modal closes.

## Confirmed End-to-End Flows

1. Renderer starts scan from menu/settings/startup flow.
2. Main startup sequence initializes the packaged update service before the renderer can signal `app:ready`, then hands control to [startupCoordinator.ts](../../main/startupCoordinator.ts) to gate update checks, startup-scan timing, cancellation, and fallback startup.
3. [ImportService.ts](../../main/ImportService.ts) orchestrates launcher readers and normalization through pluggable source-scanner modules (starting with `main/scanners/SteamScanner.ts` and `main/scanners/XboxScanner.ts`), instead of keeping launcher-specific scan logic inline.
4. Renderer-side update/import entry points keep effect dependencies explicit so reopening update/import flows does not rely on stale closures while lint guardrails around hook usage continue tightening.
5. [GameMatcher.ts](../../main/GameMatcher.ts) deduplicates and resolves identity.
6. Add Games review can adjust staged metadata and run the shared multi-provider image search/browse flow before import.
7. Staged edits that are represented on the `Game` model, such as categories, links, launch arguments, screenshots, and launcher-specific launch fields, are copied into the imported library record.
8. [GameStore.ts](../../main/GameStore.ts) persists the resulting game set.
9. Startup scans emit `startup:*` progress/new-game events so the startup overlay owns the UX, while recurring background scans avoid that startup-only progress UI and use `background:newGamesFound`.
10. Manual importer scans keep the main panel in a lightweight progress state until scanning completes; the full staged editor only mounts after scan-time discovery/metadata churn settles.

## Discovery and Data Sources

- Sources include configured launchers, manual library folders, and hardcoded known game paths.
- Hardcoded known game paths include:
  - `C:\Program Files\Neverness To Everness` — automatically discovered if installed
- When a hardcoded path match is found, scan results under that same install root are collapsed to the hardcoded entry so launcher support folders do not appear as separate games.
- Launcher detection and launcher-specific metadata come from [LauncherDetectionService.ts](../../main/LauncherDetectionService.ts) and [LauncherService.ts](../../main/LauncherService.ts).
- Matching uses known IDs, executable paths, launcher identifiers, and title heuristics.
- Renderer-side post-import maintenance flows launched from Game Manager now route through [useGameManagerRefresh.ts](../../renderer/src/components/gameManager/useGameManagerRefresh.ts), which owns refresh confirmation/progress state plus match-fix and boxart-fix continuation behavior after library updates are started from the manager.

## Data Model and Persistence

- Imported games are persisted in [GameStore.ts](../../main/GameStore.ts).
- User preferences ([UserPreferencesService.ts](../../main/UserPreferencesService.ts)) determine whether startup and background scans run automatically.
- Launcher and library configuration must remain stable across rescans to avoid duplicates.
- Importer staging trims oversized scan-time metadata arrays (currently screenshots and links) before storing them in renderer state so large scans remain stable.

## Failure Modes and Triage

### Symptom: Startup scan never starts

- Confirm `updateLibrariesOnStartup` preference is true.
- Check update-check gate is not waiting forever.
- Confirm the update modal is not still open; startup/background scan work stays paused until that prompt is dismissed or completed.
- Verify `notifyAppReady()` is emitted from renderer through [preload.ts](../../main/preload.ts), which is the single source of truth for the preload contract.
- In packaged builds, confirm the update service initialized before the renderer handshake so the first startup update check can publish a completion status.

### Symptom: Scan runs but finds zero games

- Validate launcher paths/config in settings.
- Check per-launcher detection output from [`LauncherDetectionService`](../../main/LauncherDetectionService.ts).
- Verify any manual folders exist and are accessible.

### Symptom: Duplicate games appear

- Review matcher logic and ID conventions.
- Confirm source IDs remain stable between scans.
- Verify hardcoded-root collapse is active for known game paths (for example, Neverness To Everness) so nested launcher folders such as `Client` and `NTEGlobal` are not staged as separate games.

### Symptom: Games disappear after refresh

- Check missing-games and remove-deleted-games review flows.
- Confirm launcher or library source paths still exist and are accessible.

### Symptom: Startup scan opens the full importer immediately

- Confirm the scan was started through the startup path, which should emit `startup:newGamesFound` rather than `background:newGamesFound`.
- Check the renderer is listening for startup-overlay events separately from the recurring background scan importer flow.

### Symptom: Manual scan blanks the app or crashes the renderer

- Check whether the importer is mounting the lightweight scanning view first; the heavy staged editor should wait until `isScanning` is false.
- Confirm staged metadata is being trimmed before it is written into importer queue state, especially screenshots and links from multi-provider metadata.
- Inspect main-process renderer crash logs from `render-process-gone` for the crash reason and exit code.

## File Ownership Map

- **Main process**
  - [main.ts](../../main/main.ts)
  - [startupCoordinator.ts](../../main/startupCoordinator.ts)
  - [ImportService.ts](../../main/ImportService.ts)
  - [LauncherService.ts](../../main/LauncherService.ts)
  - [LauncherDetectionService.ts](../../main/LauncherDetectionService.ts)
  - [GameMatcher.ts](../../main/GameMatcher.ts)
  - [GameStore.ts](../../main/GameStore.ts)
  - [UserPreferencesService.ts](../../main/UserPreferencesService.ts)
- **Preload bridge**
  - [preload.ts](../../main/preload.ts)
- **Renderer**
  - [App.tsx](../../renderer/src/App.tsx)
  - [gameManager/useGameManagerRefresh.ts](../../renderer/src/components/gameManager/useGameManagerRefresh.ts)
  - [FoundGamesModal.tsx](../../renderer/src/components/FoundGamesModal.tsx)
  - [UpdateLibraryModal.tsx](../../renderer/src/components/UpdateLibraryModal.tsx)
  - [MissingGamesModal.tsx](../../renderer/src/components/MissingGamesModal.tsx)
  - [RemoveDeletedGamesDialog.tsx](../../renderer/src/components/RemoveDeletedGamesDialog.tsx)
