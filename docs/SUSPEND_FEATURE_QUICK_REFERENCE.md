# Suspend/Resume Feature — Quick Reference

This feature is **disabled by default** and is not enabled in production builds.

## What it does

The Suspend/Resume feature allows pausing and resuming running game processes (Windows only). It is implemented in `main/ProcessSuspendService.ts` and uses Windows APIs to suspend/resume processes by PID.

## Why it's disabled

- Potential system-level side effects and admin requirements
- Requires additional testing and documentation before being turned on in production

## Implementation details

- **Service**: `main/ProcessSuspendService.ts`
- **IPC handlers**: `main/ipc/suspendHandlers.ts` (registration is commented out in `main/main.ts`)
- **Preferences**: `enableSuspendFeature` and `suspendShortcut` in `main/UserPreferencesService.ts` (default: disabled, shortcut `Ctrl+Shift+S`)

## Enabling (for development only)

Enabling requires uncommenting and wiring the suspend handlers and initialization in `main/main.ts`, and enabling the preference in the app. Do not enable in production until the feature has been fully reviewed and validated.
