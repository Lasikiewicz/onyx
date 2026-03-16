# Settings Scanning Tab

## What This Feature Does

Controls automatic background scans, scan interval, startup library refresh, and startup update checks.

## User-Facing Surfaces

- `Onyx Settings` -> `Scanning` tab.
- Sections:
  - `Automatic Scanning`
  - `Startup Behavior`

## Settings and Toggles

- `Background Scanning` -> background scan enabled state
- `Scan Interval (Minutes)` -> background scan interval
- `Update Libraries on Startup` -> `updateLibrariesOnStartup`
- `Check for Updates on Startup` -> `checkForUpdatesOnStartup`

## Confirmed End-to-End Flows

1. Background scan settings write directly through dedicated background-scan APIs.
2. Startup toggles save into preferences.
3. Startup sequence in main reads these values to decide whether to scan or check updates.

## Discovery and Data Sources

- UI: `OnyxSettingsModal` scanning tab.
- Main consumers: startup sequencing in [`main.ts`](../../../main/main.ts) and background scan service handlers.

## Data Model and Persistence

- Background scanning uses dedicated getter/setter APIs.
- Startup options persist in user preferences.

## Failure Modes and Triage

### Symptom: Background scanning never runs

- Confirm enabled state and interval are saved.
- Verify runtime background scan service is active.

### Symptom: Startup library scan ignored

- Confirm `updateLibrariesOnStartup` is true.
- Check whether update-check gating delayed or blocked scan startup.

## File Ownership Map

- **Renderer**
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
  - [App.tsx](../../../renderer/src/App.tsx)
- **Main process**
  - [UserPreferencesService.ts](../../../main/UserPreferencesService.ts)
  - [main.ts](../../../main/main.ts)
  - [ipc/appHandlers.ts](../../../main/ipc/appHandlers.ts)
