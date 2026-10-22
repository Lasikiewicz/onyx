# Settings Suspend Resume Tab

## What This Feature Does

Turns Windows suspend/resume on, sets the global shortcut, and lists games Onyx tracked at launch so one of them can be paused or resumed from the tab.

## User-Facing Surfaces

- `Onyx Settings` -> `Suspend/Resume` tab.
- Enable toggle.
- Shortcut capture and admin restart control.
- Launch-tracked game list with Suspend and Resume buttons, polled every few seconds while the tab is open.

## Settings and Toggles

- Enable suspend/resume -> `enableSuspendFeature` (default off)
- Suspend shortcut -> `suspendShortcut` (default `Ctrl+Shift+S`)
- Restart as Administrator when a game returns access denied

The shortcut suspends the foreground window, or resumes it if that window was the one Onyx paused. The list is the launch-tracked set, not the foreground window.

## Confirmed End-to-End Flows

1. User enables suspend support or changes the shortcut.
2. Save persists `enableSuspendFeature` and `suspendShortcut`.
3. After restart, the global shortcut is registered and the suspend handlers use those values.
4. With the feature on, the tab lists tracked games and can suspend or resume one.
5. An elevated restart is only needed when the game process itself requires it.

## Discovery and Data Sources

- UI in [`SettingsSuspendTab.tsx`](../../../renderer/src/components/settings/SettingsSuspendTab.tsx), mounted by [`OnyxSettingsModal.tsx`](../../../renderer/src/components/OnyxSettingsModal.tsx).
- Tracked games come from `suspend.getRunningGames`.
- Preferences are owned by [`UserPreferencesService.ts`](../../../main/UserPreferencesService.ts).

## Data Model and Persistence

- Stored in user preferences.
- Shortcut string is the Electron accelerator, for example `Ctrl+Shift+S`.
- Suspended pid lists are not stored in preferences. See [Suspend and Resume](../suspend-and-resume.md).

## Failure Modes and Triage

### Symptom: Shortcut never triggers suspend

- Confirm the feature is enabled and Onyx was restarted after saving.
- Confirm the shortcut is a valid accelerator.
- The tab list can still suspend a tracked game when the shortcut is not registered.

### Symptom: The list is empty while a game is running

- The list is games tracked from a launch, not every foreground window. The shortcut still targets the foreground window.

## File Ownership Map

- **Renderer**
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
  - [SettingsSuspendTab.tsx](../../../renderer/src/components/settings/SettingsSuspendTab.tsx)
- **Main process**
  - [UserPreferencesService.ts](../../../main/UserPreferencesService.ts)
  - [main.ts](../../../main/main.ts)
  - [preload.ts](../../../main/preload.ts)
  - [ipc/suspendHandlers.ts](../../../main/ipc/suspendHandlers.ts)
