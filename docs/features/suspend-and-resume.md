# Suspend and Resume

## What This Feature Does

Allows pausing/resuming supported game processes through OS-level process control.

## User-Facing Surfaces

- `Onyx Settings` -> `Suspend/Resume` tab.
- Context-menu or in-app actions exposed for supported running games.
- Any shortcut-driven suspend or resume actions registered at runtime.

## Settings and Toggles

- Enable suspend/resume
- Suspend-resume keyboard shortcut
- Restart-as-admin flow when elevated shortcut registration is required

## Confirmed End-to-End Flows

1. Renderer requests suspend/resume via preload suspend API.
2. Main suspend service validates feature enablement and target process.
3. Service executes suspend/resume operation and returns success/error.
4. Renderer updates running/suspended status in UI.

## Discovery and Data Sources

- Target process data comes from launch/process tracking state.
- Enablement and shortcut configuration come from user preferences.
- Runtime control is implemented in the process suspend service and main bootstrap code.

## Data Model and Persistence

- Enablement and shortcut values are persisted in user preferences.
- Actual suspended-state information is runtime process state and cannot outlive the target process.

## Failure Modes and Triage

### Symptom: Suspend controls disabled

- Confirm suspend feature is enabled in settings.
- Check platform/process constraints.

### Symptom: Suspend call returns error

- Verify process is still alive and owned permissions allow control.
- Check service logs for OS-level failure reason.

### Symptom: Shortcut works inconsistently

- Confirm the saved shortcut is valid.
- Check whether elevation or app restart is required for global shortcut registration.

## File Ownership Map

- Main process
  - `main/ProcessSuspendService.ts`
  - `main/ipc/appHandlers.ts`
  - `main/main.ts`
- Renderer
  - `renderer/src/components/OnyxSettingsModal.tsx`
  - `renderer/src/App.tsx`
  - `renderer/src/components/RightClickMenu.tsx`
- Related docs
  - `docs/SUSPEND_FEATURE_QUICK_REFERENCE.md`
