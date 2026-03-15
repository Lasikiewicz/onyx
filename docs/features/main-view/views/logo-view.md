# Logo View (Main View)

## What This Feature Does

Displays the games list as a grid of tiles that emphasize game logos instead of boxart (same layout as Grid View but with logo-focused display options). Uses the same LibraryGrid component as Grid View with `useLogosInsteadOfBoxart` and logo-specific sizing/positioning.

## User-Facing Surfaces

- Left panel: grid of game tiles showing logos (and optional boxart behind/alongside), optional title. Same interactions as Grid View: click to select, play, context menu, drag to reorder.
- Right panel: game details. See [Game Details Panel](../components/game-details-panel.md).

## Settings and Toggles

- Logo size, logo position (top/middle/bottom/underneath), logo over boxart, logo background color/opacity; grid size and tile padding. Shared with grid view where applicable; logo-specific options apply when view mode is "logo".

## Confirmed End-to-End Flows

1. User switches view mode to logo: grid re-renders with logo-centric layout; logo size and position from preferences.
2. User adjusts logo size or position: tiles update; preferences saved.
3. Reorder and selection behave as in Grid View.

## Discovery and Data Sources

- Same as Grid View; viewMode "logo" selects logo-specific props (useLogosInsteadOfBoxart, logoSize, etc.) in App.

## Data Model and Persistence

- Logo size, position, background options stored in preferences; same persistence path as grid view for shared options.

## Failure Modes and Triage

### Symptom: Logos not showing or wrong size

- Verify viewMode === 'logo' and logoSize/useLogosInsteadOfBoxart passed to LibraryGrid; game.logoUrl present.

### Symptom: Layout same as grid with boxart

- Ensure useLogosInsteadOfBoxart is true for logo view in App when passing props to LibraryGrid.

## File Ownership Map

- Renderer
  - `renderer/src/components/LibraryGrid.tsx` (shared with Grid View)
  - `renderer/src/components/SortableGameCard.tsx`
  - `renderer/src/App.tsx` (viewMode, logoSize, logo options for logo view)
