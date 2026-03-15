# Library Import and Startup Scan

## What This Feature Does

Finds games from configured launchers/folders and imports them into the local library.

## User-Facing Surfaces

- Initial startup scan flow.
- Manual library update/import dialogs.
- Found games, missing games, and remove-deleted-games review dialogs.
- Settings surfaces for launcher configuration, library folders, and startup scanning.

## Settings and Toggles

- `Update Libraries on Startup`
- Background scanning enablement and interval
- Library folder configuration
- Launcher-specific install and library path configuration

## Confirmed End-to-End Flows

1. Renderer starts scan from menu/settings/startup flow.
2. Main startup sequence checks preferences and coordinates update-check timing.
3. `ImportService` orchestrates launcher readers and normalization.
4. `GameMatcher` deduplicates and resolves identity.
5. `GameStore` persists the resulting game set.
6. Progress and discovered games are streamed back to renderer.

## Discovery and Data Sources

- Sources include configured launchers plus manual library folders.
- Launcher detection and launcher-specific metadata come from `LauncherDetectionService` and `LauncherService`.
- Matching uses known IDs, executable paths, launcher identifiers, and title heuristics.

## Data Model and Persistence

- Imported games are persisted in `GameStore`.
- User preferences determine whether startup and background scans run automatically.
- Launcher and library configuration must remain stable across rescans to avoid duplicates.

## Failure Modes and Triage

### Symptom: Startup scan never starts

- Confirm `updateLibrariesOnStartup` preference is true.
- Check update-check gate is not waiting forever.
- Verify `app:ready` is emitted from renderer.

### Symptom: Scan runs but finds zero games

- Validate launcher paths/config in settings.
- Check per-launcher detection output from `LauncherDetectionService`.
- Verify any manual folders exist and are accessible.

### Symptom: Duplicate games appear

- Review matcher logic and ID conventions.
- Confirm source IDs remain stable between scans.

### Symptom: Games disappear after refresh

- Check missing-games and remove-deleted-games review flows.
- Confirm launcher or library source paths still exist and are accessible.

## File Ownership Map

- Main process
  - `main/main.ts`
  - `main/ImportService.ts`
  - `main/LauncherService.ts`
  - `main/LauncherDetectionService.ts`
  - `main/GameMatcher.ts`
  - `main/GameStore.ts`
  - `main/UserPreferencesService.ts`
- Preload bridge
  - `main/preload.ts`
- Renderer
  - `renderer/src/App.tsx`
  - `renderer/src/components/FoundGamesModal.tsx`
  - `renderer/src/components/UpdateLibraryModal.tsx`
  - `renderer/src/components/MissingGamesModal.tsx`
  - `renderer/src/components/RemoveDeletedGamesDialog.tsx`
