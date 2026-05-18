# Settings Advanced Tab

## What This Feature Does

Exposes maintenance and destructive application actions such as cache inspection, app-data access, bulk removal, and factory reset.

## User-Facing Surfaces

- `Onyx Settings` -> `Advanced` tab.
- Maintenance action buttons. The System Folders actions fill the available grid width so the cache-folder and app-data-folder entries remain balanced in the Advanced tab layout.

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
5. The System Folders section uses a two-column responsive grid on wider viewports and a single column on narrow viewports so the two folder actions occupy the full row instead of leaving a third empty slot.

## Discovery and Data Sources

- Advanced tab UI now lives in [`SettingsAdvancedTab.tsx`](../../../renderer/src/components/settings/SettingsAdvancedTab.tsx), mounted by [`OnyxSettingsModal.tsx`](../../../renderer/src/components/OnyxSettingsModal.tsx).
- The destructive reset/remove workflows now flow through [`useOnyxSettingsModalPersistence.ts`](../../../renderer/src/hooks/useOnyxSettingsModalPersistence.ts) before calling main-process handlers.
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

### Symptom: System Folders buttons look cramped or leave unused width

- Check the grid classes in [`SettingsAdvancedTab.tsx`](../../../renderer/src/components/settings/SettingsAdvancedTab.tsx); the two folder actions should fill the available section width at the active breakpoint.

## File Ownership Map

- **Renderer**
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
  - [SettingsAdvancedTab.tsx](../../../renderer/src/components/settings/SettingsAdvancedTab.tsx)
  - [useOnyxSettingsModalPersistence.ts](../../../renderer/src/hooks/useOnyxSettingsModalPersistence.ts)
- **Main process**
  - [GameStore.ts](../../../main/GameStore.ts)
  - [UserPreferencesService.ts](../../../main/UserPreferencesService.ts)
  - [ipc/appHandlers.ts](../../../main/ipc/appHandlers.ts)
