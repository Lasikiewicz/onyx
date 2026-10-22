# Settings General Tab

## What This Feature Does

Controls app startup, tray integration, controller navigation, Big Screen, hardware acceleration, and basic window behavior. Part of [Settings and preferences](../settings-and-preferences.md). The TV layout and the Moonlight host entry are documented in [Big Screen and controllers](../big-screen-and-controllers.md).

## Related Documentation

- [Settings and preferences](../settings-and-preferences.md) — parent overview and persistence.
- [Game launch and process tracking](../game-launch-and-process-tracking.md) — minimize on launch, restore on exit, confirm launch.

## User-Facing Surfaces

- `Onyx Settings` -> `General` tab.
- Visible sections:
  - `System`
  - `Controller`
  - `Big Screen`
  - `Moonlight, Sunshine, and Apollo`
  - `Window Behavior`

## Settings and Toggles

- `Start with Windows` -> `startWithComputer`
- `Start Minimized` -> `startMinimized`
- `System Tray Icon` -> `showSystemTrayIcon`
- `Minimize to Tray` -> `minimizeToTray`
- `Close to Tray` -> `closeToTray`
- `Start Closed to Tray` -> `startClosedToTray`
- `Hardware Acceleration` -> `enableHardwareAcceleration`
- `Controller Navigation` -> `enableGamepadSupport` (default on, after preferences load)
- `Button Labels` -> `gamepadButtonLayout`
- `Navigation Repeat` -> `gamepadNavigationSpeed`
- `Bring Onyx to Front` -> `enableBringToFrontShortcut` (default on, shortcut `Ctrl+Shift+G`)
- `Xbox Guide Button` -> `enableGuideButtonWake` (Windows only)
- `Start in Big Screen` -> `startInBigScreen` (default off)
- `Display` -> `bigScreenDisplay` (`current`, `primary`, or a display id)
- Enter Big Screen closes settings and opens the TV layout on the chosen display.
- The Moonlight section detects Sunshine and Apollo `apps.json` files and adds or removes "Onyx Big Screen" only after confirmation. A development build shows the command and does not write.
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
5. App reloads preferences after save and updates active runtime state where supported, including the main-process tray flags used by minimize and close actions.
6. Saving controller or Big Screen settings writes the preferences and calls `bigScreen.syncWake()` so the bring-to-front shortcut is registered or cleared immediately. If that shortcut matches an enabled Suspend/Resume shortcut, the save still completes and an alert explains why the shortcut was not registered.

## Discovery and Data Sources

- UI lives in [SettingsGeneralTab.tsx](../../../renderer/src/components/settings/SettingsGeneralTab.tsx), mounted by [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx).
- Persistence uses [UserPreferencesService.ts](../../../main/UserPreferencesService.ts) defaults and save flow.
- Runtime consumers include tray/window lifecycle and launch behavior in [main.ts](../../../main/main.ts), [appHandlers.ts](../../../main/ipc/appHandlers.ts), [tray.ts](../../../main/ui/tray.ts), and [App.tsx](../../../renderer/src/App.tsx).
- Controller navigation is implemented by [useControllerNavigation.ts](../../../renderer/src/hooks/useControllerNavigation.ts) and enabled from [App.tsx](../../../renderer/src/App.tsx) when `enableGamepadSupport` is on. Big Screen behavior is in [useBigScreenMode.ts](../../../renderer/src/hooks/useBigScreenMode.ts). The host helper is [SettingsSunshineSection.tsx](../../../renderer/src/components/settings/SettingsSunshineSection.tsx).

## Data Model and Persistence

- Stored in user preferences store.
- Defaults are defined in [UserPreferencesService.createDefaultPreferences()](../../../main/UserPreferencesService.ts).
- Some settings apply immediately; some require restart or next launch.
- Startup registration is applied through [appHandlers.ts](../../../main/ipc/appHandlers.ts) and consumed during bootstrap in [main.ts](../../../main/main.ts).
- `showSystemTrayIcon`, `minimizeToTray`, and `closeToTray` are mirrored into main-process tray/window runtime state so renderer minimize requests and BrowserWindow close/minimize events use the same saved values. Close-to-tray hides immediately and persists window state asynchronously so startup scans cannot block the user from closing or reopening the shell.

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

### Symptom: Minimize to Tray does not hide the window

- Confirm `Minimize to Tray` and `System Tray Icon` are both enabled and saved.
- Check [appHandlers.ts](../../../main/ipc/appHandlers.ts) for renderer minimize requests and [main.ts](../../../main/main.ts) for the BrowserWindow minimize event path.
- Check [tray.ts](../../../main/ui/tray.ts) if the tray restore action reopens the window but does not preserve maximized/fullscreen state.

### Symptom: Tray icon appears unresponsive during startup scan

- Check that [main.ts](../../../main/main.ts) and [tray.ts](../../../main/ui/tray.ts) show/focus the BrowserWindow before waiting on preference readback.
- Check that [appHandlers.ts](../../../main/ipc/appHandlers.ts), [preload.ts](../../../main/preload.ts), and [useOnyxSettingsModalPersistence.ts](../../../renderer/src/hooks/useOnyxSettingsModalPersistence.ts) pass `closeToTray` through the live tray settings update path.

### Symptom: Hardware acceleration toggle changes nothing

- The preference is read from `user-preferences.json` before the app is ready (`main/hardwareAccelerationPreference.ts`, called from `main/main.ts`). The change applies on the next launch, which the setting label states.
- Check that the file holds `"enableHardwareAcceleration": false` under `preferences`. A file with a byte-order mark is read correctly. A missing or unreadable file falls back to enabled.
- With the setting off, the GPU process should drop to a few tens of MB. If it stays large, confirm the app was restarted after the change.

### Symptom: Controller input does nothing

- Confirm Controller Navigation is on and settings were saved. Polling starts after preferences load.
- Carousel and cover flow on the desktop do not take controller movement. Big Screen does. See [Big Screen and controllers](../big-screen-and-controllers.md).

## File Ownership Map

- **Renderer**
  - [SettingsGeneralTab.tsx](../../../renderer/src/components/settings/SettingsGeneralTab.tsx)
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
  - [App.tsx](../../../renderer/src/App.tsx)
  - [useControllerNavigation.ts](../../../renderer/src/hooks/useControllerNavigation.ts)
  - [SettingsSunshineSection.tsx](../../../renderer/src/components/settings/SettingsSunshineSection.tsx)
  - [useBigScreenMode.ts](../../../renderer/src/hooks/useBigScreenMode.ts)
- **Main process**
  - [UserPreferencesService.ts](../../../main/UserPreferencesService.ts)
  - [ipc/appHandlers.ts](../../../main/ipc/appHandlers.ts)
  - [main.ts](../../../main/main.ts)
  - [tray.ts](../../../main/ui/tray.ts)
