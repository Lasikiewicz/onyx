# Grid View (Main View)

## What This Feature Does

Displays the games list as a resizable grid of cover-art (or boxart) tiles. Supports drag-and-drop reorder, configurable tile size, optional logos over boxart, and optional auto-size-to-fit. Used for view mode "grid". Part of the [Main View](../../main-view.md) layout.

## Related Documentation

- [Main View](../../main-view.md) — layout and view mode.
- [Game Details Panel](../components/game-details-panel.md) — right panel when a game is selected.
- [Games List](../components/games-list.md) — left panel that hosts the grid.
- [Settings and preferences](../../settings-and-preferences.md) — grid size and tile options persistence.

## User-Facing Surfaces

- Left panel: scrollable grid of game cards ([SortableGameCard.tsx](../../../../renderer/src/components/SortableGameCard.tsx)). Each card shows boxart (or logo), optional title, and supports click (select), play, context menu, drag for reorder.
- Right panel: game details (when a game is selected). See [Game Details Panel](../components/game-details-panel.md).

## Settings and Toggles

- Grid size (tile size), game tile padding, hide game titles, show logo over boxart, logo position (top/middle/bottom/underneath), logo background color/opacity, description size. Auto-size-to-fit to fill visible rows. Right-click menu ([RightClickMenu.tsx](../../../../renderer/src/components/RightClickMenu.tsx)) and [UserPreferencesService](../../../../main/UserPreferencesService.ts).

## Confirmed End-to-End Flows

1. User resizes grid (slider or right-click): tile size updates; preference saved via [App.tsx](../../../../renderer/src/App.tsx).
2. User drags a tile: reorder via dnd-kit in [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx); onReorder persists new order.
3. User toggles logo over boxart or logo position: display updates; preferences saved.

## Discovery and Data Sources

- Games list from [App.tsx](../../../../renderer/src/App.tsx) (filtered). Reorder persisted via GameStore/preferences. Grid/list options from [UserPreferencesService](../../../../main/UserPreferencesService.ts).

## Data Model and Persistence

- Grid size, tile padding, logo/boxart options, auto-size-to-fit stored in [UserPreferencesService](../../../../main/UserPreferencesService.ts). Game order persisted on drag-end.

## Failure Modes and Triage

### Symptom: Grid not reordering

- Check DndContext and SortableContext in [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx); onReorder callback and persistence in [App.tsx](../../../../renderer/src/App.tsx).

### Symptom: Tiles too large/small or not filling space

- Verify gridSize and autoSizeToFit logic; container ref and row calculation in [App.tsx](../../../../renderer/src/App.tsx) for auto-size.

## File Ownership Map

- **Renderer**
  - [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx)
  - [SortableGameCard.tsx](../../../../renderer/src/components/SortableGameCard.tsx)
  - [App.tsx](../../../../renderer/src/App.tsx) — gridSize, autoSizeToFit, ref, preferences
- **Main**
  - [UserPreferencesService.ts](../../../../main/UserPreferencesService.ts) — grid size and tile options
