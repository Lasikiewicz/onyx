# Game Launch and Process Tracking

## What This Feature Does

Launches games from multiple sources and tracks running state for UX actions (minimize/restore/background scan behavior).

## Related Documentation

- [Main View](./main-view.md) — game cards and [Game Details Panel](./main-view/components/game-details-panel.md) host Play buttons and launch actions.
- [Settings and preferences](./settings-and-preferences.md) — launch confirmation, minimize on launch, restore on exit.

## User-Facing Surfaces

- Launch buttons on game cards and game details views.
- Context menus and right-click launch actions ([GameContextMenu.tsx](../../renderer/src/components/GameContextMenu.tsx), [RightClickMenu.tsx](../../renderer/src/components/RightClickMenu.tsx)).
- Running-state indicators and post-launch window behavior.

## Settings and Toggles

- `Minimize on Game Launch`, `Restore Window on Game Exit`, `Confirm Game Launch` (persisted via [UserPreferencesService.ts](../../main/UserPreferencesService.ts)).
- Launcher and library configuration that determines whether launch targets are valid.

## Confirmed End-to-End Flows

1. Renderer invokes launch action from game card ([GameCard.tsx](../../renderer/src/components/GameCard.tsx)) or context menu; [App.tsx](../../renderer/src/App.tsx) handles the callback.
2. Main [LauncherService.ts](../../main/LauncherService.ts) resolves launch target and spawns process/URI.
3. Process state is monitored and signaled back to renderer via IPC ([appHandlers.ts](../../main/ipc/appHandlers.ts)).
4. Renderer applies UI state changes (running status, minimize/restore behavior).

## Discovery and Data Sources

- Launch sources include executable paths, launcher-managed titles, and URI-based launch targets.
- Launcher resolution and process tracking live in [LauncherService.ts](../../main/LauncherService.ts) with supporting app bootstrap in [main.ts](../../main/main.ts).
- Running-state updates are emitted back to renderer through IPC/state events.

## Data Model and Persistence

- Launch metadata is stored on the game record, including paths, launcher identifiers, and source details.
- Running process state is runtime-only.
- User preferences ([UserPreferencesService.ts](../../main/UserPreferencesService.ts)) govern launch confirmation and window behavior around active sessions.

## Failure Modes and Triage

### Symptom: Game launch button does nothing

- Verify executable/URI path exists and is valid.
- Check launcher configuration for that source ([LauncherService.ts](../../main/LauncherService.ts), [LauncherDetectionService.ts](../../main/LauncherDetectionService.ts)).
- Inspect main-process launch errors in logs.

### Symptom: Running state never clears

- Confirm process PID tracking is correct in launcher/process handling.
- Check process existence polling/termination handling.
- Verify game stop events are being emitted to renderer.

### Symptom: App minimizes or restores at the wrong time

- Confirm launch-behavior preferences were saved and reloaded ([UserPreferencesService.ts](../../main/UserPreferencesService.ts)).
- Check whether the launched target is actually being tracked as the active game process.

## File Ownership Map

- **Main process**
  - [LauncherService.ts](../../main/LauncherService.ts)
  - [LauncherDetectionService.ts](../../main/LauncherDetectionService.ts)
  - [ipc/appHandlers.ts](../../main/ipc/appHandlers.ts)
  - [main.ts](../../main/main.ts)
- **Renderer**
  - [App.tsx](../../renderer/src/App.tsx)
  - [GameCard.tsx](../../renderer/src/components/GameCard.tsx)
  - [RightClickMenu.tsx](../../renderer/src/components/RightClickMenu.tsx)
  - [GameContextMenu.tsx](../../renderer/src/components/GameContextMenu.tsx)
