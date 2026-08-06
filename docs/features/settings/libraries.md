# Settings Libraries Tab

## What This Feature Does

Lets users manage manual library folders and launcher-specific library configuration that feeds import and rescan workflows.

## User-Facing Surfaces

- `Onyx Settings` -> `Libraries` tab.
- Manual library folder list.
- Launcher-specific configuration editors.

## Settings and Toggles

- Manual library folder paths.
- Launcher enablement and launcher-specific path/config values.

## Confirmed End-to-End Flows

1. User adds or removes manual library folders.
2. User edits launcher configuration.
3. Save persists updated launcher and library configuration.
4. Import and startup scan features read this configuration on next run or refresh.

## Discovery and Data Sources

- UI editing happens in [`SettingsLibrariesTab.tsx`](../../../renderer/src/components/settings/SettingsLibrariesTab.tsx), mounted by [`OnyxSettingsModal.tsx`](../../../renderer/src/components/OnyxSettingsModal.tsx), while launcher/manual-folder loading and actions now flow through [`useOnyxSettingsLibrarySources.ts`](../../../renderer/src/hooks/useOnyxSettingsLibrarySources.ts).
- Import pipeline, launcher detection, and startup scan consume the saved config.
- **The list of sources is platform-dependent** and comes from [`librarySourceDefaults.ts`](../../../renderer/src/utils/librarySourceDefaults.ts), the single source shared with [`ConfigureAppsModal.tsx`](../../../renderer/src/components/ConfigureAppsModal.tsx) (both previously carried duplicate Windows-only copies). The platform is resolved at load time via `app:getPlatform`, falling back to the Windows list if that bridge call is unavailable, so the list is never empty.
  - **Linux hides** Xbox Game Pass, EA App/Origin, Ubisoft Connect, Battle.net, Humble and Rockstar, because none has a Linux client. It **adds** Lutris and Bottles, and relabels Epic and GOG as "(Heroic)" since that is what provides them.
  - Default paths may contain variables — `%LOCALAPPDATA%`/`%USERPROFILE%` on Windows, `~` on Linux. They are stored and displayed exactly as written; the main process expands them at scan time via `expandPathVariables` in [`platformSupport.ts`](../../../main/platformSupport.ts).
  - The Lutris entry points at `~/Games` (its default install root), **not** its data directory, because Lutris records its library in a sqlite database Onyx does not read — the scanner walks a folder instead. Bottles points at the bottles root so each prefix's `drive_c` is reachable.

## Data Model and Persistence

- Stored in user preferences and launcher config storage used by import services.
- Folder lists are persisted as arrays of paths.

## Failure Modes and Triage

### Symptom: Added library folder is not scanned

- Confirm the folder was persisted.
- Verify import/scan code reads the same config source.
- Check whether folder permissions or existence checks failed.
- If the path contains a variable (`%LOCALAPPDATA%`, `~`), confirm it resolves: `expandPathVariables` in [`platformSupport.ts`](../../../main/platformSupport.ts) leaves **unknown** variables untouched by design, so the existence check then fails and the source is skipped. This was the cause of itch.io, Humble and Rockstar never scanning on Windows despite defaulting to enabled — nothing expanded the variable at all, so Onyx looked for a folder named literally `%LOCALAPPDATA%\itch`.

### Symptom: A source is missing from the list entirely

- Expected on Linux for Xbox Game Pass, EA App, Ubisoft Connect, Battle.net, Humble and Rockstar — these are omitted deliberately, not broken.
- Otherwise check what `app:getPlatform` returned. If the preload bundle is stale (a dev run against an old `dist-electron/preload.js`), `getPlatform` is undefined and the Windows list is used as a fallback; rebuild the preload.

## File Ownership Map

- **Renderer**
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
  - [SettingsLibrariesTab.tsx](../../../renderer/src/components/settings/SettingsLibrariesTab.tsx)
  - [useOnyxSettingsLibrarySources.ts](../../../renderer/src/hooks/useOnyxSettingsLibrarySources.ts)
- **Main process**
  - [UserPreferencesService.ts](../../../main/UserPreferencesService.ts)
  - [LauncherDetectionService.ts](../../../main/LauncherDetectionService.ts)
  - [ImportService.ts](../../../main/ImportService.ts)
