# Menu Bar (Main View)

## What This Feature Does

Fixed top bar in the library window providing app menu, search, sort, launcher and category filters, and entry points to settings, scan, and other actions.

## User-Facing Surfaces

- Top of main window: search field, Sort by, Launcher, Categories (and optional filters such as Demo, Games, VR). Menu items (File, etc.) and window controls.
- Search drives `searchQuery`; sort/launcher/category drive filtering of the games list.

## Settings and Toggles

- Top bar visibility and positions (search, sort, launcher, categories) via preferences and right-click context menu. See settings runbooks.

## Confirmed End-to-End Flows

1. User types in search: `searchQuery` updates; games list filters by title (or other criteria).
2. User changes Sort by / Launcher / Categories: selection state updates; games list and active game selection reflect filters.
3. User opens menu: File, View, Settings, etc.; modals or actions open as appropriate.

## Discovery and Data Sources

- Preferences for top bar positions and visibility. Game library and category/launcher lists for filter options.

## Data Model and Persistence

- Top bar positions and related preferences persisted via UserPreferencesService.

## Failure Modes and Triage

### Symptom: Menu bar not visible or overlapping content

- Check fixed positioning (e.g. `fixed top-0`) and z-index. Main content area should have top padding (e.g. pt-10) to clear the bar.

### Symptom: Search or filters not affecting list

- Verify `searchQuery`, `sortBy`, `selectedLauncher`, `selectedCategory` are passed from MenuBar to App state and used in filtering.

## File Ownership Map

- Renderer
  - `renderer/src/App.tsx` (state, layout padding for menu bar)
  - `renderer/src/components/MenuBar.tsx`
