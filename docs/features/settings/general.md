# Settings General Tab

## What This Feature Does

Controls app startup, tray integration, controller navigation, hardware acceleration, and basic window behavior. Part of [Settings and preferences](../settings-and-preferences.md).

## Related Documentation

- [Settings and preferences](../settings-and-preferences.md) — parent overview and persistence.
- [Game launch and process tracking](../game-launch-and-process-tracking.md) — minimize on launch, restore on exit, confirm launch.

## User-Facing Surfaces

- `Onyx Settings` -> `General` tab.
- Two visible sections:
  - `System`
  - `Controller`
  - `Window Behavior`

## Settings and Toggles

- `Start with Windows` -> `startWithComputer`
- `Start Minimized` -> `startMinimized`
- `System Tray Icon` -> `showSystemTrayIcon`
- `Minimize to Tray` -> `minimizeToTray`
- `Close to Tray` -> `closeToTray`
- `Start Closed to Tray` -> `startClosedToTray`
- `Hardware Acceleration` -> `enableHardwareAcceleration`
- `Controller Navigation` -> `enableGamepadSupport`
- `Button Labels` -> `gamepadButtonLayout`
- `Navigation Repeat` -> `gamepadNavigationSpeed`
- `Minimize on Game Launch` -> `minimizeOnGameLaunch`
- `Restore Window on Game Exit` -> `restoreAfterLaunch`
- `Confirm Game Launch` -> `confirmGameLaunch`

## Confirmed End-to-End Flows

1. User opens settings and changes a toggle.
2. Modal local state updates immediately.
3. `Save` writes preferences through main-process settings handlers.
4. Startup settings are translated into an explicit login/startup mode:
   - `Start Minimized` launches the main window and minimizes it to the taskbar.
   - `Start Closed to Tray` keeps the main window hidden and relies on the tray icon.
5. App reloads preferences after save and updates active runtime state where supported.
6. Controller settings apply after save; the app shell refreshes them and [useControllerNavigation.ts](../../../renderer/src/hooks/useControllerNavigation.ts) starts or stops polling without a restart.

## Discovery and Data Sources

- UI lives in [SettingsGeneralTab.tsx](../../../renderer/src/components/settings/SettingsGeneralTab.tsx), mounted by [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx).
- Persistence uses [UserPreferencesService.ts](../../../main/UserPreferencesService.ts) defaults and save flow.
- Runtime consumers include tray/window lifecycle and launch behavior in [main.ts](../../../main/main.ts) / [App.tsx](../../../renderer/src/App.tsx).
- Controller navigation is consumed by [useControllerNavigation.ts](../../../renderer/src/hooks/useControllerNavigation.ts), which reads the refreshed settings from [App.tsx](../../../renderer/src/App.tsx).

## Data Model and Persistence

- Stored in user preferences store.
- Defaults are defined in [UserPreferencesService.createDefaultPreferences()](../../../main/UserPreferencesService.ts).
- Some settings apply immediately; some require restart or next launch.
- Startup registration is applied through [appHandlers.ts](../../../main/ipc/appHandlers.ts) and consumed during bootstrap in [main.ts](../../../main/main.ts).

## Failure Modes and Triage

### Symptom: Start with Windows does not work

- Confirm saved preference changed.
- Verify OS startup registration path/service is still implemented in runtime.

### Symptom: Start Minimized and Start Closed to Tray behave the same

- Confirm the saved startup mode was written by [appHandlers.ts](../../../main/ipc/appHandlers.ts).
- Verify [main.ts](../../../main/main.ts) resolves startup mode correctly:
  - `minimized` should show then minimize.
  - `tray` should keep the main window hidden and require a tray icon.
- If tray icon is disabled, tray startup falls back to minimized startup.

### Symptom: Hardware acceleration toggle changes nothing

- Expected until restart if runtime only reads it on startup.

### Symptom: Controller input does nothing

- Confirm `Controller Navigation` is enabled and the app window has focus.
- Press any controller button once after focusing Onyx so Chromium exposes the gamepad through `navigator.getGamepads()`.
- When Chromium detects the device, Onyx shows a controller-ready toast. The first decoded controller command also shows a controller-input toast. If ready appears but input does not, check `window.__onyxControllerDebug` in DevTools for the sampled device id, mapping, pressed buttons, axes, routed action, active controller mode, and overlay state.
- Controller navigation currently applies to grid, logo, and list views; carousel and coverflow are not wired yet.

## File Ownership Map

- **Renderer**
  - [SettingsGeneralTab.tsx](../../../renderer/src/components/settings/SettingsGeneralTab.tsx)
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
  - [App.tsx](../../../renderer/src/App.tsx)
  - [useControllerNavigation.ts](../../../renderer/src/hooks/useControllerNavigation.ts)
- **Main process**
  - [UserPreferencesService.ts](../../../main/UserPreferencesService.ts)
  - [ipc/appHandlers.ts](../../../main/ipc/appHandlers.ts)
  - [main.ts](../../../main/main.ts)
