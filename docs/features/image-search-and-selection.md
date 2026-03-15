# Image Search and Selection

## What This Feature Does

Lets users search provider/web image sources, preview candidates, and assign boxart/banner/logo/icon assets.

## User-Facing Surfaces

- Image search modal.
- Image selector controls on game details and metadata-edit surfaces.
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

## Discovery and Data Sources

- Sources include configured metadata providers plus optional web search via `DuckDuckGoImageService`.
- URL normalization and safety helpers live in `artworkUrlUtils`.
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

- Main process
  - `main/MetadataFetcherService.ts`
  - `main/DuckDuckGoImageService.ts`
  - `main/artworkUrlUtils.ts`
  - `main/ipc/appHandlers.ts`
- Renderer
  - `renderer/src/components/ImageSearchModal.tsx`
  - `renderer/src/components/ImageSelector.tsx`
  - `renderer/src/components/BoxartFixDialog.tsx`
  - `renderer/src/components/GameDetailsPanel.tsx`
  - `renderer/src/components/ImageContextMenu.tsx`
