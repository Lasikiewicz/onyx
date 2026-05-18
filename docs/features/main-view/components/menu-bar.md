# Menu Bar (Main View)

## What This Feature Does

Fixed top bar in the library window providing the Onyx menu, search, sort, launcher and category filters, pinned category buttons, and entry points to settings, scan, and other actions. Part of the [Main View](../../main-view.md) layout.

## Related Documentation

- [Main View](../../main-view.md) — layout and when the menu bar is shown.
- [Games List](./games-list.md) — consumes search, sort, launcher, category state for filtering.
- [Settings and preferences](../../settings-and-preferences.md) — top bar positions and related preferences.

## User-Facing Surfaces

- Top of main window: Onyx menu, search field, Sort by, Launcher, Categories, pinned category buttons such as Favorites/Games/VR, optional develop controls, and native window controls.
- Right-clicking anywhere on the fixed top bar opens [`TopBarContextMenu.tsx`](../../../../renderer/src/components/TopBarContextMenu.tsx), the Top Bar Layout menu for moving or hiding top-bar controls.
- Search drives `searchQuery`; sort/launcher/category drive filtering of the games list.

## Settings and Toggles

- Top bar visibility and positions (search, sort, launcher, category menu, pinned categories) via preferences and the top-bar right-click context menu. See [Settings and preferences](../../settings-and-preferences.md) and [TopBarContextMenu.tsx](../../../../renderer/src/components/TopBarContextMenu.tsx).
- The Top Bar Layout menu supports Move All, Hide All, Show All, and individual left/middle/right/hide controls without closing after each change.

## Confirmed End-to-End Flows

1. User types in search: `searchQuery` updates in [App.tsx](../../../../renderer/src/App.tsx); games list filters by title (or other criteria).
2. User changes Sort by / Launcher / Categories: selection state updates; games list and active game selection reflect filters.
3. User opens menu: File, View, Settings, etc.; modals or actions open as appropriate.
4. User right-clicks any top-bar area; the Top Bar Layout menu opens at the cursor and writes position/visibility changes through the shell preference path while staying open for repeated adjustments.

## Discovery and Data Sources

- Preferences for top bar positions and visibility from [UserPreferencesService](../../../../main/UserPreferencesService.ts). Game library and category/launcher lists for filter options.
- Shell-level MenuBar callbacks are packaged in [useMainViewShellControls.ts](../../../../renderer/src/hooks/useMainViewShellControls.ts), which routes scan, refresh, settings, tutorial, updater preview, and search/view control actions out of [App.tsx](../../../../renderer/src/App.tsx).

## Data Model and Persistence

- Top bar positions and related preferences persist via [UserPreferencesService](../../../../main/UserPreferencesService.ts). Loaded in [App.tsx](../../../../renderer/src/App.tsx) and passed to [MenuBar](../../../../renderer/src/components/MenuBar.tsx).
- `topBarPositions` includes `searchBar`, `sortBy`, `launcher`, `categories`, and `pinnedCategories`; each can be `left`, `middle`, `right`, or `hidden`.

## Failure Modes and Triage

### Symptom: Menu bar not visible or overlapping content

- Check fixed positioning (e.g. `fixed top-0`) and z-index in [MenuBar.tsx](../../../../renderer/src/components/MenuBar.tsx). Main content area should have top padding (e.g. pt-10) in [App.tsx](../../../../renderer/src/App.tsx) to clear the bar.

### Symptom: Search or filters not affecting list

- Verify `searchQuery`, `sortBy`, `selectedLauncher`, `selectedCategory` are passed from [MenuBar](../../../../renderer/src/components/MenuBar.tsx) to [App.tsx](../../../../renderer/src/App.tsx) state and used in filtering.

### Symptom: Top Bar Layout menu closes after every edit or misses empty top-bar space

- Check the shared top-bar context-menu opener in [MenuBar.tsx](../../../../renderer/src/components/MenuBar.tsx).
- Confirm [TopBarContextMenu.tsx](../../../../renderer/src/components/TopBarContextMenu.tsx) only closes on explicit close, Escape, or outside click, not after `onPositionsChange`.

## File Ownership Map

- **Renderer**
  - [App.tsx](../../../../renderer/src/App.tsx) — state, layout padding for menu bar
  - [MenuBar.tsx](../../../../renderer/src/components/MenuBar.tsx) — menu bar UI and filter controls
  - [TopBarContextMenu.tsx](../../../../renderer/src/components/TopBarContextMenu.tsx) - top-bar layout controls for position and visibility
  - [useMainViewShellControls.ts](../../../../renderer/src/hooks/useMainViewShellControls.ts) - shell callback bundle passed into the menu bar and sibling top-bar controls
- **Main**
  - [UserPreferencesService.ts](../../../../main/UserPreferencesService.ts) — top bar position and related preference keys
