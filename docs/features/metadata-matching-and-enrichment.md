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
- Artwork merging prefers dedicated high-quality visual sources for first-import media: Steam keeps top priority, SteamGridDB now beats lower-resolution general metadata artwork, and Steam covers prefer the `library_600x900_2x.jpg` asset when it exists.
- [MetadataFetcherService.ts](../../main/MetadataFetcherService.ts) treats IGDB as a fallback-only provider in both `fetchArtworkForGame` and `fetchDescriptionForGame`: the faster, more lenient providers (Steam/SteamGridDB/GiantBomb/RAWG) run first, and IGDB is only queried afterward if the result is still missing key fields (box art/logo for artwork; description/links for description). The one exception is links-only refreshes, where Steam/RAWG are skipped and IGDB is the sole source.
- [MetadataFetcherService.ts](../../main/MetadataFetcherService.ts) caches which providers fail `validateAllProviders()` (`knownInvalidProviders`) and every subsequent real search/artwork/description call in that session skips a provider already known to be broken instead of retrying — and timing out on — it for every game. `isAvailable()` alone only reflects whether a key is *configured*, not whether it was confirmed to actually work.
- Every provider call reachable from a scan/search path is individually timeout-bounded (`withTimeout`), tuned so the slowest possible combination still resolves inside the renderer's own client-side timeouts even accounting for [RateLimitCoordinator.ts](../../main/RateLimitCoordinator.ts)'s 2-concurrent-per-service queuing — a single hanging/misconfigured provider (e.g. an axios client with no request timeout) cannot stall the others sharing a `Promise.allSettled`/`Promise.all` call.
- The renderer-side per-game metadata workflow is now split so [`GameManagerMetadataTab.tsx`](../../renderer/src/components/gameManager/GameManagerMetadataTab.tsx) owns the Metadata tab layout while [`useGameManagerMetadata.ts`](../../renderer/src/components/gameManager/useGameManagerMetadata.ts) owns save, fix-match search, match-apply, and cancel-edit orchestration for the Game Manager flow.
- The Add Games staged-editor metadata workflow now also flows through [`useGamePropertiesMetadata.ts`](../../renderer/src/components/gameProperties/useGamePropertiesMetadata.ts), which owns staged undo, fix-match search, and match-apply behavior outside the main staged-editor shell.

## Data Model and Persistence

- Game metadata is persisted into [GameStore.ts](../../main/GameStore.ts) records.
- Cache state is maintained separately in [MetadataCache.ts](../../main/MetadataCache.ts).
- Provider-specific identifiers, artwork URLs, descriptions, and links are normalized before persistence.
- Steam descriptions prefer the Steam Store `about_the_game` HTML field for the app `description`, fall back to `short_description` when needed, and keep `detailed_description` in `summary`.
- Explicit per-game metadata reapply flows bypass the in-memory metadata cache so a user-triggered rematch or re-fetch pulls fresh provider data instead of reusing an older cached description payload.

## Game Title Matching Strategy

[GameMatcher.ts](../../main/GameMatcher.ts) implements confidence-based matching between scanned games and metadata provider results.

### Title Normalization

- Titles are normalized to lowercase and have special characters removed for consistent comparison.
- Special cases handle games where standard normalization is insufficient:
  - `Tony Hawk's Pro Skater 3+4` → `tony hawks pro skater 3 4`
  - `AFOP` → `avatar frontiers of pandora`
  - `Cyberpunk 2077` → `cyberpunk 2077`
  - `Neverness To Everness` → `neverness to everness` (hardcoded game path auto-detection)

### Matching Confidence Scoring

- Titles are scored using exact match (0.5), fuzzy match (0.2-0.4), or word overlap heuristics.
- Steam App ID matches boost confidence (+0.4); mismatches penalize (-0.2).
- Source matching (e.g., Steam provider) adds bonuses for provider consistency.
- A match must exceed 0.3 confidence to be accepted.

## Failure Modes and Triage

### Symptom: Metadata refresh always fails

- Check API credentials are present and valid.
- Confirm provider-specific HTTP endpoints are reachable.
- Inspect provider status call and per-provider error messages.

### Symptom: One bad/invalid provider key seems to slow down or block metadata for every game

- Confirm the provider's `validateCredentials()` result is actually reflected in `knownInvalidProviders` in [MetadataFetcherService.ts](../../main/MetadataFetcherService.ts) — `isAvailable()` alone only means "a key is configured", not "confirmed working".
- Check that the provider's search/artwork/description calls are wrapped in `withTimeout` rather than awaited directly; an unbounded call (e.g. an axios client created without a `timeout` option) inside a shared `Promise.allSettled`/`Promise.all` can stall sibling providers even though they don't reject.

### Symptom: Wrong game matched

- Check matcher inputs (title, app ID, platform hints).
- Confirm provider score/ranking behavior.
- Retry with manual metadata editor flow.
- If a specific game consistently matches incorrectly, consider adding a special-case title normalization rule in [GameMatcher.ts](../../main/GameMatcher.ts).

### Symptom: Game not matched (confidence too low)

- Verify the game exists in at least one configured metadata provider (IGDB, RAWG, Steam, SteamGridDB, etc.).
- For hardcoded game paths (e.g., `C:\Program Files\Neverness To Everness`), ensure the title is normalized to match provider records.
- Manually apply the correct match via the "Fix Match" editor in Game Manager or Add Games.

### Symptom: Partial updates only (e.g., links update but not images)

- Confirm refresh mode/flags (`linksOnly`, game selection).
- Check image pipeline health separately.

### Symptom: Old metadata keeps reappearing

- Check whether cache invalidation happened for the affected game or provider.
- Confirm a manual edit is not being overwritten by a later bulk refresh.

## File Ownership Map

- **Main process core**
  - [MetadataFetcherService.ts](../../main/MetadataFetcherService.ts)
  - [GameMatcher.ts](../../main/GameMatcher.ts)
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
