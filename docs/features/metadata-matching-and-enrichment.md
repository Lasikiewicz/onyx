# Metadata Matching and Enrichment

## What This Feature Does

Resolves game metadata (titles, identifiers, links, artwork candidates) from configured providers.

## Related Documentation

- [Add Games](./add-games.md) - staged import-review flow that reuses metadata search and fix behavior before games are imported.
- [Game Manager](./game-manager.md) - main per-game maintenance modal that hosts metadata editing, fix-match, and refresh entry points.
- [Links and link management](./links-and-link-management.md) — links-only behavior and troubleshooting.
- [Image search and selection](./image-search-and-selection.md) — artwork candidates and selection flow.
- [Settings and preferences](./settings-and-preferences.md) — [API Integrations](./settings/api-integrations.md) for provider credentials.
- [Library import and startup scan](./library-import-and-startup-scan.md) — metadata during import.

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
4. [MetadataCache.ts](../../main/MetadataCache.ts) is updated and applied to [GameStore.ts](../../main/GameStore.ts) records.
5. Renderer reloads/patches game state for immediate UI updates.

## Discovery and Data Sources

- Providers include IGDB, RAWG, SteamGridDB, Giant Bomb, Steam, and Xbox-related sources where implemented.
- Provider services fetch remote API payloads and provider adapters normalize them into the app metadata model.
- Metadata cache reduces repeated fetches and supports refresh workflows.
- The renderer-side per-game metadata workflow is now split so [`GameManagerMetadataTab.tsx`](../../renderer/src/components/gameManager/GameManagerMetadataTab.tsx) owns the Metadata tab layout while [`useGameManagerMetadata.ts`](../../renderer/src/components/gameManager/useGameManagerMetadata.ts) owns save, fix-match search, match-apply, and cancel-edit orchestration for the Game Manager flow.
- The Add Games staged-editor metadata workflow now also flows through [`useGamePropertiesMetadata.ts`](../../renderer/src/components/gameProperties/useGamePropertiesMetadata.ts), which owns staged undo, fix-match search, and match-apply behavior outside the main staged-editor shell.

## Data Model and Persistence

- Game metadata is persisted into [GameStore.ts](../../main/GameStore.ts) records.
- Cache state is maintained separately in [MetadataCache.ts](../../main/MetadataCache.ts).
- Provider-specific identifiers, artwork URLs, descriptions, and links are normalized before persistence.
- Steam descriptions prefer the Steam Store `about_the_game` HTML field for the app `description`, fall back to `short_description` when needed, and keep `detailed_description` in `summary`.
- Explicit per-game metadata reapply flows bypass the in-memory metadata cache so a user-triggered rematch or re-fetch pulls fresh provider data instead of reusing an older cached description payload.

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

- **Main process core**
  - [MetadataFetcherService.ts](../../main/MetadataFetcherService.ts)
  - [MetadataProvider.ts](../../main/MetadataProvider.ts)
  - [MetadataCache.ts](../../main/MetadataCache.ts)
  - [MetadataValidator.ts](../../main/MetadataValidator.ts)
  - [RateLimitCoordinator.ts](../../main/RateLimitCoordinator.ts)
- **Provider implementations**
  - [IGDBMetadataProvider.ts](../../main/IGDBMetadataProvider.ts)
  - [RAWGMetadataProvider.ts](../../main/RAWGMetadataProvider.ts)
  - [SteamGridDBMetadataProvider.ts](../../main/SteamGridDBMetadataProvider.ts)
  - [GiantBombMetadataProvider.ts](../../main/GiantBombMetadataProvider.ts)
  - [SteamMetadataProvider.ts](../../main/SteamMetadataProvider.ts)
- **Provider API services**
  - [IGDBService.ts](../../main/IGDBService.ts), [RAWGService.ts](../../main/RAWGService.ts), [SteamGridDBService.ts](../../main/SteamGridDBService.ts), [GiantBombService.ts](../../main/GiantBombService.ts), [SteamService.ts](../../main/SteamService.ts), [XboxService.ts](../../main/XboxService.ts)
- **Renderer**
  - [GameManager.tsx](../../renderer/src/components/GameManager.tsx)
  - [gameManager/GameManagerMetadataTab.tsx](../../renderer/src/components/gameManager/GameManagerMetadataTab.tsx)
  - [gameManager/useGameManagerMetadata.ts](../../renderer/src/components/gameManager/useGameManagerMetadata.ts)
  - [gameProperties/useGamePropertiesMetadata.ts](../../renderer/src/components/gameProperties/useGamePropertiesMetadata.ts)
  - [GameMetadataEditor.tsx](../../renderer/src/components/GameMetadataEditor.tsx)
  - [MetadataSearchModal.tsx](../../renderer/src/components/MetadataSearchModal.tsx)
  - [RefreshMetadataDialog.tsx](../../renderer/src/components/RefreshMetadataDialog.tsx)
  - [App.tsx](../../renderer/src/App.tsx)
