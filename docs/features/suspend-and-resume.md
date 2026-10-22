# Suspend and Resume

## What This Feature Does

On Windows, pauses a running game and resumes it later. The shortcut freezes the foreground window and every process that window's process started, then resumes that same set on the next press. Launch-tracked games can also be paused from Settings. The feature is off until `enableSuspendFeature` is turned on.

The Windows calls match [Nyrna](https://github.com/Merrit/nyrna): `NtSuspendProcess` / `NtResumeProcess` with `PROCESS_SUSPEND_RESUME` only, `ShowWindow` with `SW_FORCEMINIMIZE`, a 500ms wait, then the parent process and its children. Onyx does not copy Nyrna's source.

## Related Documentation

- [Settings and preferences](./settings-and-preferences.md) — [Suspend Resume](./settings/suspend-resume.md) tab for enablement and shortcut.
- [Game launch and process tracking](./game-launch-and-process-tracking.md) — process state comes from launch/tracking.
- [Quick reference](../SUSPEND_FEATURE_QUICK_REFERENCE.md) — where the wiring lives.

## User-Facing Surfaces

- `Onyx Settings` -> `Suspend/Resume` tab, including the list of launch-tracked games.
- Global shortcut (default `Ctrl+Shift+S`) when the feature is enabled.
- Play on a suspended tracked game resumes it before launching again.

## Settings and Toggles

- Enable suspend/resume -> `enableSuspendFeature` (default off)
- Suspend shortcut -> `suspendShortcut` (default `Ctrl+Shift+S`)
- Restart as Administrator when a game refuses the suspend call

## Confirmed End-to-End Flows

1. Renderer requests suspend/resume via the preload suspend API.
2. The shortcut asks for the foreground window first. If that window is Onyx, Onyx hides itself and looks again (up to three times). File Explorer is refused. Otherwise that window's process is suspended, then every descendant.
3. Launcher IPC still captures a pre-launch process baseline, and [ProcessSuspendService.ts](../../main/ProcessSuspendService.ts) tracks the launched game. Suspending that entry uses the foreground process when its path is the game, instead of a store launcher stub.
4. A failed suspend restores the window. A failed foreground resume forgets that hotkey target so the next press is not stuck retrying it.
5. Quitting Onyx resumes paused games. A crash leaves `suspended-processes.json`; the next launch resumes a pid only when its creation time still matches.
6. These flows are covered by unit tests. They have not been exercised against a real game on Windows in this change.

## Discovery and Data Sources

- The shortcut reads the foreground HWND (`GetForegroundWindow` + `GetWindowThreadProcessId`) and the process image path.
- Children come from a Toolhelp snapshot taken after the parent suspend succeeds. If that snapshot fails, the CIM parent-process list taken before the suspend is used.
- Library rediscovery matches the executable path, then the file name, then a non-helper process inside the install directory.
- Enablement and the shortcut come from user preferences.

## Data Model and Persistence

- `enableSuspendFeature` and `suspendShortcut` live in user preferences.
- While a game is suspended, its pid list and each process's creation time are kept in memory and in `suspended-processes.json` under the app user-data directory.
- A pid is resumed only when that creation time still matches, so a reused pid is left alone.

## Failure Modes and Triage

### Symptom: Suspend controls do nothing

- Confirm the feature is enabled and Onyx was restarted so the shortcut registered.
- The feature only runs on Windows.

### Symptom: The game keeps running after the shortcut

- The shortcut suspends the foreground window. A launch stub is not the target unless it owns that window.
- If the direct ntdll load fails, Onyx falls back to a PowerShell helper. That path is slower and can miss the minimize window.
- The process-list structure has to be registered with koffi before the Toolhelp prototypes, and only once. Registering it afterwards (or a second time under the same name) throws, and the log says direct ntdll suspend is unavailable. Every suspend then uses the PowerShell helper.
- Protected or anti-cheat processes can deny `OpenProcess`. Run Onyx as Administrator only when the error says access was denied. Suspending a protected game can still disconnect it.

### Symptom: A game stays frozen

- Quit Onyx, or launch it again. Both paths resume recorded pids whose creation time still matches.
- If resume itself failed, the hotkey forgets that target. Resume the process from Task Manager if it is still frozen.

### Symptom: Shortcut works inconsistently

- Confirm the saved shortcut is a valid accelerator.
- Global shortcuts can require an elevated restart when the game is elevated.

## File Ownership Map

- **Main process**
  - [ProcessSuspendService.ts](../../main/ProcessSuspendService.ts)
  - [win32NativeSuspend.ts](../../main/win32NativeSuspend.ts)
  - [suspendTargets.ts](../../main/suspendTargets.ts)
  - [ipc/suspendHandlers.ts](../../main/ipc/suspendHandlers.ts)
  - [main.ts](../../main/main.ts)
  - [preload.ts](../../main/preload.ts)
- **Renderer**
  - [SettingsSuspendTab.tsx](../../renderer/src/components/settings/SettingsSuspendTab.tsx)
  - [OnyxSettingsModal.tsx](../../renderer/src/components/OnyxSettingsModal.tsx)
