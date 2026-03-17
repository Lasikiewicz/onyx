# Settings General Tab

## What This Feature Does

Controls app startup, tray integration, hardware acceleration, and basic window behavior. Part of [Settings and preferences](../settings-and-preferences.md).

## Related Documentation

- [Settings and preferences](../settings-and-preferences.md) — parent overview and persistence.
- [Game launch and process tracking](../game-launch-and-process-tracking.md) — minimize on launch, restore on exit, confirm launch.

## User-Facing Surfaces

- `Onyx Settings` -> `General` tab.
- Two visible sections:
  - `System`
  - `Window Behavior`

## Settings and Toggles

- `Start with Windows` -> `startWithComputer`
- `Start Minimized` -> `startMinimized`
- `System Tray Icon` -> `showSystemTrayIcon`
- `Minimize to Tray` -> `minimizeToTray`
- `Close to Tray` -> `closeToTray`
- `Start Closed to Tray` -> `startClosedToTray`
- `Hardware Acceleration` -> `enableHardwareAcceleration`
- `Minimize on Game Launch` -> `minimizeOnGameLaunch`
- `Restore Window on Game Exit` -> `restoreAfterLaunch`
- `Confirm Game Launch` -> `confirmGameLaunch`

## Confirmed End-to-End Flows

1. User opens settings and changes a toggle.
2. Modal local state updates immediately.
3. `Save` writes preferences through main-process settings handlers.
4. App reloads preferences after save and updates active runtime state where supported.

## Discovery and Data Sources

- UI lives in [SettingsGeneralTab.tsx](../../../renderer/src/components/settings/SettingsGeneralTab.tsx), mounted by [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx).
- Persistence uses [UserPreferencesService.ts](../../../main/UserPreferencesService.ts) defaults and save flow.
- Runtime consumers include tray/window lifecycle and launch behavior in [main.ts](../../../main/main.ts) / [App.tsx](../../../renderer/src/App.tsx).

## Data Model and Persistence

- Stored in user preferences store.
- Defaults are defined in [UserPreferencesService.createDefaultPreferences()](../../../main/UserPreferencesService.ts).
- Some settings apply immediately; some require restart or next launch.

## Failure Modes and Triage

### Symptom: Start with Windows does not work

- Confirm saved preference changed.
- Verify OS startup registration path/service is still implemented in runtime.

### Symptom: Hardware acceleration toggle changes nothing

- Expected until restart if runtime only reads it on startup.

## File Ownership Map

- **Renderer**
  - [SettingsGeneralTab.tsx](../../../renderer/src/components/settings/SettingsGeneralTab.tsx)
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
  - [App.tsx](../../../renderer/src/App.tsx)
- **Main process**
  - [UserPreferencesService.ts](../../../main/UserPreferencesService.ts)
  - [ipc/appHandlers.ts](../../../main/ipc/appHandlers.ts)
  - [main.ts](../../../main/main.ts)
