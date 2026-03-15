# Settings About Tab

## What This Feature Does

Provides version, project, and update-related information inside the settings modal.

## User-Facing Surfaces

- `Onyx Settings` -> `About` tab.
- Update information and app metadata.
- Credits and project references.

## Settings and Toggles

- This tab is informational.
- It may expose update-trigger actions but does not own persistent preference toggles.

## Confirmed End-to-End Flows

1. User opens the tab.
2. Renderer displays current version/update state.
3. If update actions are available, renderer invokes updater IPC calls.

## Discovery and Data Sources

- UI in `OnyxSettingsModal` about tab.
- Update state supplied by app/update services.

## Data Model and Persistence

- No primary preferences are persisted by this tab.
- Displayed values are derived from app metadata and updater state.

## Failure Modes and Triage

### Symptom: Version or update status is stale

- Check app metadata source.
- Check updater status event wiring.

## File Ownership Map

- **Renderer**
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
- **Main process**
  - [AppUpdateService.ts](../../../main/AppUpdateService.ts)
  - [main.ts](../../../main/main.ts)
