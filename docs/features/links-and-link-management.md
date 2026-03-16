# Links and Link Management

## What This Feature Does

Provides a full lifecycle for game links:

- Discover links from metadata providers during import/refresh.
- Persist links per game in library storage.
- Display links in the right panel game bar with icons and ordering rules.
- Allow manual editing and icon customization in Game Manager.
- Rebuild links in bulk (links-only refresh) or as part of full metadata refresh.

## Related Documentation

- [Add Games](./add-games.md) - staged import-review flow that reuses per-game link editing before a title is committed to the library.
- [Game Manager](./game-manager.md) - per-game link editing, icon customization, and links-only refresh entry points.
- [Game Details Panel](./main-view/components/game-details-panel.md) — right-panel link bar ([GameLinks.tsx](../../renderer/src/components/GameLinks.tsx)).
- [Settings and preferences](./settings-and-preferences.md) — [Link Management](./settings/link-management.md) tab for visibility and ordering.
- [Metadata matching and enrichment](./metadata-matching-and-enrichment.md) — link discovery during refresh and metadata fetch.
- [Library import and startup scan](./library-import-and-startup-scan.md) — links attached during import.

## User-Facing Surfaces

### 1) Right Panel Link Bar (main library view)

- Location: game details panel on the right side of the app.
- Component: [GameDetailsPanel.tsx](../../renderer/src/components/GameDetailsPanel.tsx) renders [GameLinks.tsx](../../renderer/src/components/GameLinks.tsx).
- Behavior:
   - Visible links render as icon buttons.
   - Clicking opens external URL.
   - Right-click opens link context menu for hide/show and ordering actions.
   - Links hidden by default (from settings) can still be reached via overflow/up-arrow path.

### 2) Game Manager -> Links tab (per-game editing)

- Location: `Game Manager` per-game editor, `Links` tab.
- Behavior:
   - `Refresh Links` fetches candidate links for selected game (`findLinks`).
   - `Apply All` appends non-duplicate link types by name.
   - `+ Add Link` adds manual rows.
   - Users can edit label, URL, remove links, and set custom per-link icon URL.
   - Save writes updated links back through normal `saveGame` flow.

### 3) Game Manager -> Manage Metadata dialog

- `Refresh all metadata for all games` includes links as part of full metadata.
- `Refresh all Links` performs links-only fetch and replaces links for each game.
- Links-only mode requires IGDB credentials check in UI before execution.

### 4) Add Games (ImportWorkbench)

- Scan phase finds games/executables.
- Metadata phase fetches metadata for each staged game.
- Any discovered links are attached to staged game and persisted when imported.

## Settings and Toggles

### Link visibility and ordering

- Settings page: `Onyx Settings` -> `Links` tab.
- Controls:
   - Ordered list of link types (`linkDisplayOrder`) with move up/down actions.
   - `Hidden by default` toggle per link type (`visibleLinkTypes`).
- Save behavior:
   - Preferences are saved on `Save` in settings.
   - Main UI reloads these preferences and updates right-panel link rendering.

### Animated icon behavior

- Settings page: `Onyx Settings` -> `Animations`.
- `Disable animated icons` affects link icon hover animations.
- Runtime combines this with `Disable all animations` and overlay state.

### Stored-but-not-active preference

- `linkDisplayMode` is persisted in preferences (`icons` / `dropdown`).
- Current right-panel runtime path renders icons mode in `GameDetailsPanel`.
- Treat `linkDisplayMode` as stored for compatibility but not primary active switch in current right-panel implementation.

## Confirmed End-to-End Flows

1. Initial scan (Add Games): links are fetched during importer metadata processing and saved on import.
2. Game Manager -> game -> Links tab:
    - `Refresh Links` fetches fresh links for selected game.
    - `+ Add Link` supports manual add/edit/remove.
3. Game Manager -> Manage Metadata -> `Refresh all metadata for all games`:
    - Full metadata refresh includes links.
4. Game Manager -> Manage Metadata -> `Refresh all Links`:
    - Uses links-only metadata fetch and replaces each game's links.

## Discovery and Data Sources

- Main links fetch path uses metadata fetcher with `linksOnly: true` for links-focused runs.
- IGDB path is primary for links-rich metadata fields (`websites`, `external_games`).
- `findLinks` (per-game refresh) performs a fresh metadata fetch (bypass cache) with links-only mode.
- `refreshAllMetadata` with `linksOnly` runs per game, then saves replaced link arrays.

## Data Model and Persistence

### Game record link schema

- Link objects are stored on each `Game` record under `links`.
- Current shape in store:
   - `name: string`
   - `url: string`
   - `hidden?: boolean`
   - `iconUrl?: string`

### Persistence behavior

- Per-game edits save through `saveGame`.
- Links-only bulk refresh replaces `links` and saves each game.
- Clear-links action exists (`clearAllLinks`) and is used by links-mode preparation flows.

## Defaults and Display Rules

- Default display order comes from `LINK_DISPLAY_ORDER` in `GameLinks`.
- Default visible types come from `DEFAULT_VISIBLE_LINK_TYPES`.
- Link key inference for icon/visibility mapping uses `inferLinkKey(url, name)`.
- Unknown link types fall back to generic link icon and fallback color.

## Failure Modes and Triage

### Symptom: No links after Add Games import

- Verify importer metadata phase completed for the game (not timed out/failed).
- Confirm provider credentials are valid (IGDB especially for links flow).
- Confirm staged game had `links` before final import save.

### Symptom: Refresh Links in Game Manager returns nothing

- Verify selected game ID exists in library.
- Check `metadata:findLinks` handler logs for fetch/provider errors.
- Confirm IGDB provider availability and credential validity.

### Symptom: Refresh all Links appears to do nothing

- Confirm mode is `linksOnly` in refresh request.
- Verify progress text shows `Searching for links...`.
- Confirm each game save executes with replaced link array.

### Symptom: Manual links disappear

- Expected when a links-only rebuild replaces links for that game.
- Re-apply manual links after bulk rebuild if needed.

### Symptom: Link visibility toggles do not reflect in bar

- Confirm settings were saved and preferences reloaded.
- Verify `visibleLinkTypes` and `linkDisplayOrder` were read from preferences in app state.

## File Ownership Map

- **Renderer**
  - [importer/ImportWorkbenchV2.tsx](../../renderer/src/components/importer/ImportWorkbenchV2.tsx)
  - [GameManager.tsx](../../renderer/src/components/GameManager.tsx)
  - [gameManager/GameManagerLinksTab.tsx](../../renderer/src/components/gameManager/GameManagerLinksTab.tsx)
  - [GameLinks.tsx](../../renderer/src/components/GameLinks.tsx)
  - [RefreshMetadataDialog.tsx](../../renderer/src/components/RefreshMetadataDialog.tsx)
  - [GameDetailsPanel.tsx](../../renderer/src/components/GameDetailsPanel.tsx)
  - [OnyxSettingsModal.tsx](../../renderer/src/components/OnyxSettingsModal.tsx)
  - [App.tsx](../../renderer/src/App.tsx)
  - [GamePropertiesPanel.tsx](../../renderer/src/components/GamePropertiesPanel.tsx)
- **Preload bridge**
  - [preload.ts](../../main/preload.ts)
- **Main process**
  - [ipc/metadataHandlers.ts](../../main/ipc/metadataHandlers.ts)
  - [ipc/gameHandlers.ts](../../main/ipc/gameHandlers.ts)
  - [MetadataFetcherService.ts](../../main/MetadataFetcherService.ts)
  - [IGDBService.ts](../../main/IGDBService.ts)
  - [IGDBMetadataProvider.ts](../../main/IGDBMetadataProvider.ts)
  - [UserPreferencesService.ts](../../main/UserPreferencesService.ts)
  - [GameStore.ts](../../main/GameStore.ts)
