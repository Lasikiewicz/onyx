# List View (Main View)

## What This Feature Does

Displays the games list as a vertical list of rows, each showing game art (boxart or logo), title, and optional metadata (description, playtime, release date, genres, platform, launcher). Supports multiple display modes (boxart-title, logo-title, logo-only, title-only, icon-title) and configurable row height and text sizes. Part of the [Main View](../../main-view.md) layout.

## Related Documentation

- [Main View](../../main-view.md) — layout and view mode.
- [Game Details Panel](../components/game-details-panel.md) — right panel when a game is selected.
- [Games List](../components/games-list.md) — left panel that hosts the list.
- [Settings and preferences](../../settings-and-preferences.md) — list view options persistence.

## User-Facing Surfaces

- Left panel: scrollable list of game rows. Each row can show boxart/logo, title, description snippet, playtime, release date, genres, platform/launcher. Right-click for context menu and list view options.
- Right panel: game details. See [Game Details Panel](../components/game-details-panel.md).
- Description snippets in list rows are rendered as plain text previews, stripping any HTML markup from the stored description so rich text does not leak literal tags into the cards.
- The currently focused list row now uses a subtler surface highlight instead of the previous bright blue ring, keeping selection visible without drawing a large outline around the card.
- The shared right-click menu now still opens in a broader normal full layout, but can be switched into focused Games View, Dividers, and Game Details modes so a smaller centered popup can sit over just the section being adjusted. Those focused editors reflow their controls into two columns, split some previously combined cards into separate setting groups, surface readable helper descriptions under the main tuning controls, and collapse those descriptions back to compact `?` hints when the menu returns to its normal layout. The default unfocused popup is also wider now so its full multi-column editor does not look cramped.

## Settings and Toggles

- List view options: show description, categories, playtime, release date, genres, platform, launcher, logos; title/section text size; display mode; and mode-specific size controls. Boxart + Title uses boxart size, Logo + Title and Logo Only use logo size, and Icon + Title uses tile size. Configured via [RightClickMenu.tsx](../../../../renderer/src/components/RightClickMenu.tsx) and [UserPreferencesService](../../../../main/UserPreferencesService.ts).

## Confirmed End-to-End Flows

1. User changes display mode (e.g. logo-title): list re-renders with new layout; preference saved.
2. User toggles playtime or description: rows show or hide those fields; preferences saved.
3. User adjusts list view size (row height): rows resize; preference saved.

## Discovery and Data Sources

- Games list from [App.tsx](../../../../renderer/src/App.tsx) (filtered). ListViewOptions and listViewSize from [UserPreferencesService](../../../../main/UserPreferencesService.ts).

## Data Model and Persistence

- List view options and listViewSize persisted via [UserPreferencesService](../../../../main/UserPreferencesService.ts). See [Settings and preferences](../../settings-and-preferences.md).

## Failure Modes and Triage

### Symptom: List shows wrong fields or layout

- Check listViewOptions passed from [App.tsx](../../../../renderer/src/App.tsx) to [LibraryListView.tsx](../../../../renderer/src/components/LibraryListView.tsx); ensure preferences load and override defaults.

### Symptom: Playtime or dates not showing

- Verify game object has playtime/releaseDate; formatPlaytime/formatDate in [LibraryListView.tsx](../../../../renderer/src/components/LibraryListView.tsx).

## File Ownership Map

- **Renderer**
  - [LibraryListView.tsx](../../../../renderer/src/components/LibraryListView.tsx)
  - [App.tsx](../../../../renderer/src/App.tsx) — listViewOptions, listViewSize, preferences
- **Main**
  - [UserPreferencesService.ts](../../../../main/UserPreferencesService.ts) — list view options and size
