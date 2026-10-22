# Suspend/Resume Feature — Quick Reference

This feature is **off by default** (`enableSuspendFeature`). Turn it on in Settings → Suspend/Resume. It runs on Windows only.

## What it does

The shortcut freezes the foreground window and every process that window started, then resumes them on the next press. Settings can also suspend a game Onyx tracked at launch.

It uses `NtSuspendProcess` / `NtResumeProcess` directly when the native helper loads, and a PowerShell fallback otherwise. Quitting Onyx resumes paused games. The next launch resumes them after a crash when the process creation time still matches.

## Why it stays off by default

- Freezing the wrong process, or a protected game, can leave a game hung or disconnect anti-cheat.
- Some titles need Onyx to run as Administrator.

## Implementation details

- **Service**: `main/ProcessSuspendService.ts`
- **Native calls**: `main/win32NativeSuspend.ts`
- **Target planning**: `main/suspendTargets.ts`
- **IPC handlers**: `main/ipc/suspendHandlers.ts` (registered from `main/main.ts`)
- **Preferences**: `enableSuspendFeature` and `suspendShortcut` in `main/UserPreferencesService.ts` (default off, shortcut `Ctrl+Shift+S`)
- **Crash recovery**: `suspended-processes.json` in the app user-data directory

## Enabling

Settings → Suspend/Resume → enable the feature, then restart Onyx so the global shortcut registers.
