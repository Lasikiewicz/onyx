# Logo View (Main View)

## What This Feature Does

Displays the games list as a grid of tiles that emphasize game logos instead of boxart (same layout as Grid View but with logo-focused display options). Uses the same [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx) component as Grid View with `useLogosInsteadOfBoxart` and logo-specific sizing/positioning. Part of the [Main View](../../main-view.md) layout.

## Related Documentation

- [Main View](../../main-view.md) — layout and view mode.
- [Grid View](./grid-view.md) — shared grid component and reorder behavior.
- [Game Details Panel](../components/game-details-panel.md) — right panel when a game is selected.
- [Settings and preferences](../../settings-and-preferences.md) — logo and grid options persistence.

## User-Facing Surfaces

- Left panel: grid of game tiles showing logos (and optional boxart behind/alongside), optional title. Same interactions as Grid View: click to select, play, context menu, drag to reorder.
- Right panel: game details. See [Game Details Panel](../components/game-details-panel.md).

## Settings and Toggles

- Logo size, logo position (top/middle/bottom/underneath), logo over boxart, logo background color/opacity; grid size and tile padding. Shared with grid view where applicable; logo-specific options apply when view mode is "logo". Configured via [RightClickMenu.tsx](../../../../renderer/src/components/RightClickMenu.tsx) and [UserPreferencesService](../../../../main/UserPreferencesService.ts).

## Confirmed End-to-End Flows

1. User switches view mode to logo: grid re-renders with logo-centric layout; logo size and position from preferences.
2. User adjusts logo size or position: tiles update; preferences saved.
3. Reorder and selection behave as in Grid View.

## Discovery and Data Sources

- Same as Grid View; viewMode "logo" selects logo-specific props (useLogosInsteadOfBoxart, logoSize, etc.) in [App.tsx](../../../../renderer/src/App.tsx).

## Data Model and Persistence

- Logo size, position, background options stored in [UserPreferencesService](../../../../main/UserPreferencesService.ts); same persistence path as grid view for shared options.

## Failure Modes and Triage

### Symptom: Logos not showing or wrong size

- Verify viewMode === 'logo' and logoSize/useLogosInsteadOfBoxart passed to [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx) from [App.tsx](../../../../renderer/src/App.tsx); game.logoUrl present.

### Symptom: Layout same as grid with boxart

- Ensure useLogosInsteadOfBoxart is true for logo view in [App.tsx](../../../../renderer/src/App.tsx) when passing props to LibraryGrid.

## File Ownership Map

- **Renderer**
  - [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx) — shared with Grid View
  - [SortableGameCard.tsx](../../../../renderer/src/components/SortableGameCard.tsx)
  - [App.tsx](../../../../renderer/src/App.tsx) — viewMode, logoSize, logo options for logo view
- **Main**
  - [UserPreferencesService.ts](../../../../main/UserPreferencesService.ts) — logo and grid options
