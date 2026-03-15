# Game Launch and Process Tracking

## What This Feature Does

Launches games from multiple sources and tracks running state for UX actions (minimize/restore/background scan behavior).

## User-Facing Surfaces

- Launch buttons on game cards and game details views.
- Context menus and right-click launch actions.
- Running-state indicators and post-launch window behavior.

## Settings and Toggles

- `Minimize on Game Launch`
- `Restore Window on Game Exit`
- `Confirm Game Launch`
- Launcher and library configuration that determines whether launch targets are valid

## Confirmed End-to-End Flows

1. Renderer invokes launch action from game card/context menu.
2. Main launcher service resolves launch target and spawns process/URI.
3. Process state is monitored and signaled back to renderer.
4. Renderer applies UI state changes (running status, minimize/restore behavior).

## Discovery and Data Sources

- Launch sources include executable paths, launcher-managed titles, and URI-based launch targets.
- Launcher resolution and process tracking live in `LauncherService` with supporting app bootstrap coordination.
- Running-state updates are emitted back to renderer through IPC/state events.

## Data Model and Persistence

- Launch metadata is stored on the game record, including paths, launcher identifiers, and source details.
- Running process state is runtime-only.
- User preferences govern launch confirmation and window behavior around active sessions.

## Failure Modes and Triage

### Symptom: Game launch button does nothing

- Verify executable/URI path exists and is valid.
- Check launcher configuration for that source.
- Inspect main-process launch errors in logs.

### Symptom: Running state never clears

- Confirm process PID tracking is correct.
- Check process existence polling/termination handling.
- Verify game stop events are being emitted.

### Symptom: App minimizes or restores at the wrong time

- Confirm launch-behavior preferences were saved and reloaded.
- Check whether the launched target is actually being tracked as the active game process.

## File Ownership Map

- Main process
  - `main/LauncherService.ts`
  - `main/LauncherDetectionService.ts`
  - `main/ipc/appHandlers.ts`
  - `main/main.ts`
- Renderer
  - `renderer/src/App.tsx`
  - `renderer/src/components/GameCard.tsx`
  - `renderer/src/components/RightClickMenu.tsx`
  - `renderer/src/components/GameContextMenu.tsx`
