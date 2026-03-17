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

- UI editing happens in [`SettingsLibrariesTab.tsx`](../../../renderer/src/components/settings/SettingsLibrariesTab.tsx), mounted by [`OnyxSettingsModal.tsx`](../../../renderer/src/components/OnyxSettingsModal.tsx).
- Import pipeline, launcher detection, and startup scan consume the saved config.

## Data Model and Persistence

- Stored in user preferences and launcher config storage used by import services.
- Folder lists are persisted as arrays of paths.

## Failure Modes and Triage

### Symptom: Added library folder is not scanned

- Confirm the folder was persisted.
- Verify import/scan code reads the same config source.
- Check whether folder permissions or existence checks failed.

## File Ownership Map

- **Renderer**
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
  - [SettingsLibrariesTab.tsx](../../../renderer/src/components/settings/SettingsLibrariesTab.tsx)
- **Main process**
  - [UserPreferencesService.ts](../../../main/UserPreferencesService.ts)
  - [LauncherDetectionService.ts](../../../main/LauncherDetectionService.ts)
  - [ImportService.ts](../../../main/ImportService.ts)
