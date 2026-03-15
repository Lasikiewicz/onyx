# Settings Advanced Tab

## What This Feature Does

Exposes maintenance and destructive application actions such as cache inspection, app-data access, bulk removal, and factory reset.

## User-Facing Surfaces

- `Onyx Settings` -> `Advanced` tab.
- Maintenance action buttons.

## Settings and Toggles

- Open cache folder action.
- Open app data folder action.
- Remove all games action.
- Factory reset action.

## Confirmed End-to-End Flows

1. User triggers an action.
2. Renderer calls the corresponding IPC action.
3. Main process opens a path or performs destructive library reset logic.
4. App UI refreshes after action completion where needed.

## Discovery and Data Sources

- UI actions live in `OnyxSettingsModal` advanced tab.
- Main handlers open filesystem locations or mutate store state.

## Data Model and Persistence

- These actions affect game library state, cache state, or complete app preference state.
- Factory reset is expected to clear multiple stores, not only preferences.

## Failure Modes and Triage

### Symptom: Factory reset does not fully reset app

- Check which stores are cleared.
- Verify credentials, cache, and library database cleanup all ran.

### Symptom: Remove all games leaves stale UI entries

- Confirm the renderer reloaded the library after the bulk delete completed.

## File Ownership Map

- Renderer
  - `renderer/src/components/OnyxSettingsModal.tsx`
- Main process
  - `main/GameStore.ts`
  - `main/UserPreferencesService.ts`
  - `main/ipc/appHandlers.ts`
