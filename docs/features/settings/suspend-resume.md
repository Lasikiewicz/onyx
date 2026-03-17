# Settings Suspend Resume Tab

## What This Feature Does

Controls whether suspend-resume behavior is enabled and how the suspend hotkey is configured.

## User-Facing Surfaces

- `Onyx Settings` -> `Suspend/Resume` tab.
- Enable toggle.
- Shortcut capture and admin restart control.

## Settings and Toggles

- Enable suspend/resume -> `enableSuspendResume`
- Suspend shortcut -> `suspendResumeShortcut`
- Restart as admin action for shortcut registration scenarios.

## Confirmed End-to-End Flows

1. User enables suspend support or changes shortcut.
2. Save persists preference changes.
3. Runtime keyboard registration and suspend handlers use the saved values.
4. Some paths may require elevated restart for global shortcut registration.

## Discovery and Data Sources

- UI in [`SettingsSuspendTab.tsx`](../../../renderer/src/components/settings/SettingsSuspendTab.tsx), mounted by [`OnyxSettingsModal.tsx`](../../../renderer/src/components/OnyxSettingsModal.tsx).
- Runtime consumers in suspend/resume services and app startup.

## Data Model and Persistence

- Stored in user preferences.
- Shortcut string is stored as the canonical accelerator text used by Electron/global shortcut logic.

## Failure Modes and Triage

### Symptom: Shortcut never triggers suspend

- Confirm feature is enabled.
- Confirm shortcut was saved in valid accelerator format.
- Check whether restart or elevation is required.

## File Ownership Map

- **Renderer**
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
  - [SettingsSuspendTab.tsx](../../../renderer/src/components/settings/SettingsSuspendTab.tsx)
- **Main process**
  - [UserPreferencesService.ts](../../../main/UserPreferencesService.ts)
  - [main.ts](../../../main/main.ts)
  - [preload.ts](../../../main/preload.ts)
