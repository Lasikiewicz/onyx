# Grid View (Main View)

## What This Feature Does

Displays the games list as a resizable grid of cover-art (or boxart) tiles. Supports drag-and-drop reorder, configurable tile size, optional logos over boxart, and optional auto-size-to-fit. Used for view mode "grid".

## User-Facing Surfaces

- Left panel: scrollable grid of game cards (SortableGameCard). Each card shows boxart (or logo), optional title, and supports click (select), play, context menu, drag for reorder.
- Right panel: game details (when a game is selected). See [Game Details Panel](../components/game-details-panel.md).

## Settings and Toggles

- Grid size (tile size), game tile padding, hide game titles, show logo over boxart, logo position (top/middle/bottom/underneath), logo background color/opacity, description size. Auto-size-to-fit to fill visible rows. Right-click menu and preferences.

## Confirmed End-to-End Flows

1. User resizes grid (slider or right-click): tile size updates; preference saved.
2. User drags a tile: reorder via dnd-kit; onReorder persists new order.
3. User toggles logo over boxart or logo position: display updates; preferences saved.

## Discovery and Data Sources

- Games list from App (filtered). Reorder persisted via GameStore/preferences. Grid/list options from preferences.

## Data Model and Persistence

- Grid size, tile padding, logo/boxart options, auto-size-to-fit stored in preferences. Game order persisted on drag-end.

## Failure Modes and Triage

### Symptom: Grid not reordering

- Check DndContext and SortableContext in LibraryGrid; onReorder callback and persistence in App.

### Symptom: Tiles too large/small or not filling space

- Verify gridSize and autoSizeToFit logic; container ref and row calculation in App for auto-size.

## File Ownership Map

- Renderer
  - `renderer/src/components/LibraryGrid.tsx`
  - `renderer/src/components/SortableGameCard.tsx`
  - `renderer/src/App.tsx` (gridSize, autoSizeToFit, ref, preferences)
