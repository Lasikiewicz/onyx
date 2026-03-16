# Library Import and Startup Scan

## What This Feature Does

Finds games from configured launchers/folders and imports them into the local library.

## Related Documentation

- [Settings and preferences](./settings-and-preferences.md) — [Libraries](./settings/libraries.md) and [Scanning](./settings/scanning.md) tabs for startup and background scan options.
- [Game launch and process tracking](./game-launch-and-process-tracking.md) — launcher resolution uses [LauncherService](../../main/LauncherService.ts) and [LauncherDetectionService](../../main/LauncherDetectionService.ts).
- [Metadata matching and enrichment](./metadata-matching-and-enrichment.md) — identity and matching during import.

## User-Facing Surfaces

- Initial startup scan flow.
- Manual library update/import dialogs.
- Add Games review/editor surfaces for per-title metadata, links, and artwork changes before import completes.
- Found games, missing games, and remove-deleted-games review dialogs.
- Settings surfaces for launcher configuration, library folders, and startup scanning.

## Settings and Toggles

- `Update Libraries on Startup`
- Background scanning enablement and interval
- Library folder configuration
- Launcher-specific install and library path configuration
- Automatic background scans are temporarily paused while the update notification modal is open, then resumed when the modal closes.

## Confirmed End-to-End Flows

1. Renderer starts scan from menu/settings/startup flow.
2. Main startup sequence initializes the packaged update service before the renderer can signal `app:ready`, then checks preferences and coordinates update-check timing.
3. [ImportService.ts](../../main/ImportService.ts) orchestrates launcher readers and normalization.
4. [GameMatcher.ts](../../main/GameMatcher.ts) deduplicates and resolves identity.
5. Add Games review can adjust staged metadata and run the shared multi-provider image search/browse flow before import.
6. Staged edits that are represented on the `Game` model, such as categories, links, launch arguments, screenshots, and launcher-specific launch fields, are copied into the imported library record.
7. [GameStore.ts](../../main/GameStore.ts) persists the resulting game set.
8. Startup scans emit `startup:*` progress/new-game events so the startup overlay owns the UX, while recurring background scans avoid that startup-only progress UI and use `background:newGamesFound`.

## Discovery and Data Sources

- Sources include configured launchers plus manual library folders.
- Launcher detection and launcher-specific metadata come from [LauncherDetectionService.ts](../../main/LauncherDetectionService.ts) and [LauncherService.ts](../../main/LauncherService.ts).
- Matching uses known IDs, executable paths, launcher identifiers, and title heuristics.

## Data Model and Persistence

- Imported games are persisted in [GameStore.ts](../../main/GameStore.ts).
- User preferences ([UserPreferencesService.ts](../../main/UserPreferencesService.ts)) determine whether startup and background scans run automatically.
- Launcher and library configuration must remain stable across rescans to avoid duplicates.

## Failure Modes and Triage

### Symptom: Startup scan never starts

- Confirm `updateLibrariesOnStartup` preference is true.
- Check update-check gate is not waiting forever.
- Confirm the update modal is not still open; startup/background scan work stays paused until that prompt is dismissed or completed.
- Verify `app:ready` is emitted from renderer.
- In packaged builds, confirm the update service initialized before the renderer handshake so the first startup update check can publish a completion status.

### Symptom: Scan runs but finds zero games

- Validate launcher paths/config in settings.
- Check per-launcher detection output from [`LauncherDetectionService`](../../main/LauncherDetectionService.ts).
- Verify any manual folders exist and are accessible.

### Symptom: Duplicate games appear

- Review matcher logic and ID conventions.
- Confirm source IDs remain stable between scans.

### Symptom: Games disappear after refresh

- Check missing-games and remove-deleted-games review flows.
- Confirm launcher or library source paths still exist and are accessible.

### Symptom: Startup scan opens the full importer immediately

- Confirm the scan was started through the startup path, which should emit `startup:newGamesFound` rather than `background:newGamesFound`.
- Check the renderer is listening for startup-overlay events separately from the recurring background scan importer flow.

## File Ownership Map

- **Main process**
  - [main.ts](../../main/main.ts)
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
  - [FoundGamesModal.tsx](../../renderer/src/components/FoundGamesModal.tsx)
  - [UpdateLibraryModal.tsx](../../renderer/src/components/UpdateLibraryModal.tsx)
  - [MissingGamesModal.tsx](../../renderer/src/components/MissingGamesModal.tsx)
  - [RemoveDeletedGamesDialog.tsx](../../renderer/src/components/RemoveDeletedGamesDialog.tsx)
