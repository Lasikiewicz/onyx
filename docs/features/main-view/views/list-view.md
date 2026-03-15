# List View (Main View)

## What This Feature Does

Displays the games list as a vertical list of rows, each showing game art (boxart or logo), title, and optional metadata (description, playtime, release date, genres, platform, launcher). Supports multiple display modes (boxart-title, logo-title, logo-only, title-only, icon-title) and configurable row height and text sizes.

## User-Facing Surfaces

- Left panel: scrollable list of game rows. Each row can show boxart/logo, title, description snippet, playtime, release date, genres, platform/launcher. Right-click for context menu and list view options.
- Right panel: game details. See [Game Details Panel](../components/game-details-panel.md).

## Settings and Toggles

- List view options: show description, categories, playtime, release date, genres, platform, launcher, logos; title/section text size; display mode; tile height; boxart/logo size. Configured via RightClickMenu and preferences.

## Confirmed End-to-End Flows

1. User changes display mode (e.g. logo-title): list re-renders with new layout; preference saved.
2. User toggles playtime or description: rows show or hide those fields; preferences saved.
3. User adjusts list view size (row height): rows resize; preference saved.

## Discovery and Data Sources

- Games list from App (filtered). ListViewOptions and listViewSize from preferences.

## Data Model and Persistence

- List view options and listViewSize persisted via UserPreferencesService.

## Failure Modes and Triage

### Symptom: List shows wrong fields or layout

- Check listViewOptions passed from App to LibraryListView; ensure preferences load and override defaults.

### Symptom: Playtime or dates not showing

- Verify game object has playtime/releaseDate; formatPlaytime/formatDate in LibraryListView.

## File Ownership Map

- Renderer
  - `renderer/src/components/LibraryListView.tsx`
  - `renderer/src/App.tsx` (listViewOptions, listViewSize, preferences)
