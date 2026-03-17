# Image Search and Selection

## What This Feature Does

Lets users search provider/web image sources, preview candidates, and assign boxart/banner/logo/icon assets.

## Related Documentation

- [Add Games](./add-games.md) - staged import-review flow that reuses artwork search, quick image fetch, and local image assignment before import.
- [Game Manager](./game-manager.md) - main modal that hosts the Images tab and aggregated provider artwork workflow.
- [Game Details Panel](./main-view/components/game-details-panel.md) — image display and context menus; Game Manager Images tab (this feature).
- [Metadata matching and enrichment](./metadata-matching-and-enrichment.md) — provider image fetch and metadata flow.
- [Image cache and optimization](./image-cache-and-optimization.md) — downstream cache after selection.
- [Settings and preferences](./settings-and-preferences.md) — [API Integrations](./settings/api-integrations.md), [Animations](./settings/animations.md).

## User-Facing Surfaces

- Image search modal.
- Image selector controls on game details and metadata-edit surfaces.
- Add Games per-title editor ([GamePropertiesPanel.tsx](../../renderer/src/components/GamePropertiesPanel.tsx)) uses the same aggregated multi-provider image fetch path as Game Manager when swapping artwork during import review.
- Add Games image orchestration now also flows through [`useGamePropertiesImages.ts`](../../renderer/src/components/gameProperties/useGamePropertiesImages.ts), which owns staged image search, browse, fast-search, and apply-image behavior outside the main staged-editor shell.
- Add Games image rendering now also flows through [`GamePropertiesImagesTab.tsx`](../../renderer/src/components/gameProperties/GamePropertiesImagesTab.tsx) and [`GamePropertiesImageStrip.tsx`](../../renderer/src/components/gameProperties/GamePropertiesImageStrip.tsx), which own the staged Images tab controls and artwork slot strip outside the main staged-editor shell.
- Boxart, banner, logo, and icon fix flows plus image context menus.

## Settings and Toggles

- Provider enablement and credentials in `API Integrations` affect which image sources are available.
- Animation settings affect how chosen animated assets are displayed after selection.

## Confirmed End-to-End Flows

1. Renderer opens image selection UI for a game and image type.
2. Search calls go through preload to metadata image endpoints.
3. Main process merges provider and optional web results.
4. User selects an image and saves it back to game metadata.
5. Renderer updates state immediately and persists via main process save flow.

### Game Manager Images Tab Interaction Rules

- First click on an image slot can trigger an image search for that type when no results are loaded yet.
- After results are loaded, clicking image slots at the top of the Images tab switches the active image-type view without starting a new search.
- Selecting any image candidate keeps the user on the Images tab and updates the top preview strip immediately.
- Re-running a search is explicit via the search controls (for example, Quick All or New Search).
- When the request already has known game identity (for example `gameId`, `steamAppId`, or `igdbId`), the main-process image fetch flow skips Auto-Match/title re-identification and proceeds directly with provider fetches.
- In provider-specific fallback stages, IGDB and RAWG fetch work can overlap so slower provider lookups do not fully serialize image-result delivery.
- Progressive image batches are rendered as soon as they are emitted by providers (no wait for full multi-provider completion in the Images tab).
- Renderer accumulation for progressive events is append-only with cross-batch dedupe so newly found images keep discovery order instead of jumping ahead by provider grouping.
- Manual per-type search now keeps discovery order by appending provider batches as they arrive (no score/exact-match resorting or front insertion during active search).
- `metadata:searchImages` now returns SteamGridDB type results directly for this flow, while IGDB metadata continues via its own parallel search channel in the renderer.
- The Images `all` tab renders from a single ordered merged stream across providers, so section ordering reflects discovery time consistently instead of per-provider grouping priority.
- Add Games image editing can also browse a local image/WEBM file, cache it, and apply it before the game is imported.
- Add Games mirrors Game Manager's linked image-field updates for background artwork, so choosing a banner also updates the imported `heroUrl`/background display path instead of reverting to older artwork after import.

## Discovery and Data Sources

- Sources include configured metadata providers plus optional web search via [DuckDuckGoImageService.ts](../../main/DuckDuckGoImageService.ts).
- URL normalization and safety helpers live in [artworkUrlUtils.ts](../../main/artworkUrlUtils.ts).
- Game Manager-specific renderer result shaping now lives in [imageSearchUtils.ts](../../renderer/src/components/gameManager/imageSearchUtils.ts), [imageResultUtils.ts](../../renderer/src/components/gameManager/imageResultUtils.ts), [providerProgressUtils.ts](../../renderer/src/components/gameManager/providerProgressUtils.ts), [useGameManagerImageSearch.ts](../../renderer/src/components/gameManager/useGameManagerImageSearch.ts), [ProviderStatusRow.tsx](../../renderer/src/components/gameManager/ProviderStatusRow.tsx), [GameArtworkStrip.tsx](../../renderer/src/components/gameManager/GameArtworkStrip.tsx), [FastSearchResultsList.tsx](../../renderer/src/components/gameManager/FastSearchResultsList.tsx), [ImageSearchResultsSections.tsx](../../renderer/src/components/gameManager/ImageSearchResultsSections.tsx), and [GameManagerImagesTab.tsx](../../renderer/src/components/gameManager/GameManagerImagesTab.tsx), which keep URL normalization, provider-name normalization, animation filtering, ordered result grouping, provider-count filtering, provider-progress state updates, image-search orchestration, provider row rendering, artwork slot rendering, quick-result rendering, grouped image-result rendering, and overall image-tab layout separate from the modal component UI.
- Search inputs typically include game title, platform hints, and requested artwork type.

## Data Model and Persistence

- Selected image URLs are persisted on the game metadata record.
- Downstream cache and optimization services consume those persisted URLs.
- Invalid or unsupported URLs should be filtered before final save.

## Failure Modes and Triage

### Symptom: Search never returns results

- Check provider credentials and provider availability status.
- Verify query construction includes game title/platform hints.
- Inspect network failures and fallback behavior.

### Symptom: Selected image does not persist

- Confirm save call succeeded (`saveGame`/metadata update path).
- Check image URL validation and sanitization.

### Symptom: Selected image saves but display does not change

- Check whether cache or optimization is still serving an older file.
- Confirm the renderer reloaded the updated game metadata.

## File Ownership Map

- **Main process**
  - [MetadataFetcherService.ts](../../main/MetadataFetcherService.ts)
  - [DuckDuckGoImageService.ts](../../main/DuckDuckGoImageService.ts)
  - [artworkUrlUtils.ts](../../main/artworkUrlUtils.ts)
  - [ipc/appHandlers.ts](../../main/ipc/appHandlers.ts)
- **Renderer**
  - [GameManager.tsx](../../renderer/src/components/GameManager.tsx)
  - [gameManager/useGameManagerImageSearch.ts](../../renderer/src/components/gameManager/useGameManagerImageSearch.ts)
  - [ImageSearchModal.tsx](../../renderer/src/components/ImageSearchModal.tsx)
  - [ImageSelector.tsx](../../renderer/src/components/ImageSelector.tsx)
  - [BoxartFixDialog.tsx](../../renderer/src/components/BoxartFixDialog.tsx)
  - [GameDetailsPanel.tsx](../../renderer/src/components/GameDetailsPanel.tsx)
  - [ImageContextMenu.tsx](../../renderer/src/components/ImageContextMenu.tsx)
