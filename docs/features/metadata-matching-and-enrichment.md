# Metadata Matching and Enrichment

## What This Feature Does

Resolves game metadata (titles, identifiers, links, artwork candidates) from configured providers.

For detailed links-only behavior and troubleshooting, see `docs/features/links-and-link-management.md`.

## User-Facing Surfaces

- Per-game metadata editor.
- Search and manual metadata selection modal.
- Refresh metadata dialog for single or bulk operations.
- Game details surfaces that reflect updated titles, descriptions, links, and artwork.

## Settings and Toggles

- Provider enablement and credentials in the `API Integrations` settings tab.
- Link-management settings that affect link portions of metadata refresh.
- Refresh mode flags such as links-only or broader metadata refresh options.

## Confirmed End-to-End Flows

1. Renderer requests refresh for one game or many games.
2. Main metadata fetcher queries providers via unified provider contracts.
3. Responses are normalized and validated.
4. Metadata cache is updated and applied to `GameStore` records.
5. Renderer reloads/patches game state for immediate UI updates.

## Discovery and Data Sources

- Providers include IGDB, RAWG, SteamGridDB, Giant Bomb, Steam, and Xbox-related sources where implemented.
- Provider services fetch remote API payloads and provider adapters normalize them into the app metadata model.
- Metadata cache reduces repeated fetches and supports refresh workflows.

## Data Model and Persistence

- Game metadata is persisted into `GameStore` records.
- Cache state is maintained separately in `MetadataCache`.
- Provider-specific identifiers, artwork URLs, descriptions, and links are normalized before persistence.

## Failure Modes and Triage

### Symptom: Metadata refresh always fails

- Check API credentials are present and valid.
- Confirm provider-specific HTTP endpoints are reachable.
- Inspect provider status call and per-provider error messages.

### Symptom: Wrong game matched

- Check matcher inputs (title, app ID, platform hints).
- Confirm provider score/ranking behavior.
- Retry with manual metadata editor flow.

### Symptom: Partial updates only (e.g., links update but not images)

- Confirm refresh mode/flags (`linksOnly`, game selection).
- Check image pipeline health separately.

### Symptom: Old metadata keeps reappearing

- Check whether cache invalidation happened for the affected game or provider.
- Confirm a manual edit is not being overwritten by a later bulk refresh.

## File Ownership Map

- Main process core
  - `main/MetadataFetcherService.ts`
  - `main/MetadataProvider.ts`
  - `main/MetadataCache.ts`
  - `main/MetadataValidator.ts`
  - `main/RateLimitCoordinator.ts`
- Provider implementations
  - `main/IGDBMetadataProvider.ts`
  - `main/RAWGMetadataProvider.ts`
  - `main/SteamGridDBMetadataProvider.ts`
  - `main/GiantBombMetadataProvider.ts`
  - `main/SteamMetadataProvider.ts`
- Provider API services
  - `main/IGDBService.ts`
  - `main/RAWGService.ts`
  - `main/SteamGridDBService.ts`
  - `main/GiantBombService.ts`
  - `main/SteamService.ts`
  - `main/XboxService.ts`
- Renderer
  - `renderer/src/components/GameMetadataEditor.tsx`
  - `renderer/src/components/MetadataSearchModal.tsx`
  - `renderer/src/components/RefreshMetadataDialog.tsx`
  - `renderer/src/App.tsx`
