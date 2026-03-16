# Game Manager

## What This Feature Does

Provides the main per-game maintenance workspace for the library. The Game Manager lets users review and edit a game's metadata, artwork, links, mod-manager settings, refresh actions, and removal flows from one modal-driven surface.

## Related Documentation

- [Image search and selection](./image-search-and-selection.md) - artwork search, provider aggregation, and image assignment flows used by the Images tab.
- [Metadata matching and enrichment](./metadata-matching-and-enrichment.md) - metadata search, fix-match, and refresh behavior used by the Metadata tab.
- [Links and link management](./links-and-link-management.md) - link discovery, editing, icon selection, and links-only refresh behavior.
- [Library import and startup scan](./library-import-and-startup-scan.md) - import review, missing-game cleanup, and launcher/library refresh entry points.
- [Image cache and optimization](./image-cache-and-optimization.md) - optimization queue behavior triggered after artwork changes.
- [Settings and preferences](./settings-and-preferences.md) - preferences that affect list view, providers, animations, and scanning behavior surfaced from the modal.

## User-Facing Surfaces

- The `Game Manager` modal opened from the main library UI via [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx).
- Metadata editing flows, including match fixes, metadata refresh, and per-game title/description/category changes.
- Artwork editing flows, including local browse/upload, aggregated provider search, quick search, provider filtering, and artwork context menus.
- Link editing flows, including manual link changes, icon inference, and link-icon upload/search helpers.
- Maintenance dialogs launched from the manager, including remove-deleted-games review, boxart fix, and metadata refresh confirmation flows.

## Settings and Toggles

- Provider credentials and enablement from [API Integrations](./settings/api-integrations.md) affect which metadata and image providers can return results.
- List display preferences from [General settings](./settings/general.md) affect how the game list inside the manager renders (`boxart`, `icon`, or `text` display).
- Animation-related behavior from [Animations](./settings/animations.md) influences artwork handling, while the manager currently hides animated image-search results and relies on explicit WEBM upload flows.
- Library/scanning preferences from [Scanning](./settings/scanning.md) and [Libraries](./settings/libraries.md) affect refresh/import actions launched from the manager.

## Confirmed End-to-End Flows

1. Open Game Manager for a library title, select a tab, edit fields locally, and save through [`window.electronAPI`](../../main/preload.ts) calls that persist back to the main-process game store.
2. Run metadata search or fix-match flows, preview provider candidates, apply a result, and refresh the local edited game state so the modal reflects persisted metadata immediately.
3. Open the Images tab, search multiple providers, filter by provider/type, choose an asset or browse for a local replacement, and queue optimization after artwork changes.
4. Edit links or trigger links-only refresh flows, including icon search/upload helpers, then save the updated link array back into the game record.
5. Launch maintenance dialogs such as remove-deleted-games scans, boxart fixes, or bulk refresh actions from inside the manager and return to the same modal context afterward.

## Discovery and Data Sources

- Game records come from the renderer library state and are passed into [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx) as `games`.
- Metadata candidates come from main-process provider search services reached through [`main/preload.ts`](../../main/preload.ts) and documented further in [metadata-matching-and-enrichment.md](./metadata-matching-and-enrichment.md).
- Artwork candidates come from provider and web-search paths summarized in [image-search-and-selection.md](./image-search-and-selection.md), with renderer-side result shaping in:
  - [`imageSearchUtils.ts`](../../renderer/src/components/gameManager/imageSearchUtils.ts)
  - [`imageResultUtils.ts`](../../renderer/src/components/gameManager/imageResultUtils.ts)
  - [`providerProgressUtils.ts`](../../renderer/src/components/gameManager/providerProgressUtils.ts)
- Link icon inference and search-query helpers come from [`GameLinks.tsx`](../../renderer/src/components/GameLinks.tsx).
- Preferences that shape manager behavior are read through the preload bridge and persisted by main-process preference services described in [settings-and-preferences.md](./settings-and-preferences.md).

## Data Model and Persistence

- The manager edits [`Game`](../../renderer/src/types/game.ts) records in local renderer state before saving them through preload-exposed APIs back to the main process.
- Artwork changes update per-game image fields and can queue optimization work after close via the optimization bridge exposed in [`main/preload.ts`](../../main/preload.ts).
- Link edits persist as part of the game record and may also include custom icon data handled by the link-management flow.
- Temporary UI state such as selected tab, provider filter, search results, dialog visibility, and progress rows remains renderer-only inside [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx) and its helper modules.

## Failure Modes and Triage

- If metadata or image search returns incomplete results, verify provider credentials and provider availability first in [API Integrations](./settings/api-integrations.md).
- If artwork previews disappear or fail to render, check the renderer-side URL normalization and failed-image filtering in [`imageSearchUtils.ts`](../../renderer/src/components/gameManager/imageSearchUtils.ts) and the provider result grouping in [`imageResultUtils.ts`](../../renderer/src/components/gameManager/imageResultUtils.ts).
- If provider badges or status rows behave incorrectly during image searches, inspect [`providerProgressUtils.ts`](../../renderer/src/components/gameManager/providerProgressUtils.ts) and the `metadata:imageSearchProviderStatus` listener in [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx).
- If saves appear to succeed in the modal but data does not persist, inspect the preload contract in [`main/preload.ts`](../../main/preload.ts) and the main-process store/services documented in [metadata-matching-and-enrichment.md](./metadata-matching-and-enrichment.md) and [links-and-link-management.md](./links-and-link-management.md).

## File Ownership Map

- [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx) - top-level modal orchestration for tabs, dialogs, searches, and save/delete flows.
- [`imageSearchUtils.ts`](../../renderer/src/components/gameManager/imageSearchUtils.ts) - image URL normalization, provider-name normalization, and animated-asset filtering helpers used by the Images tab.
- [`imageResultUtils.ts`](../../renderer/src/components/gameManager/imageResultUtils.ts) - ordered result grouping, provider filtering, and image-count aggregation for image search results.
- [`providerProgressUtils.ts`](../../renderer/src/components/gameManager/providerProgressUtils.ts) - provider-progress row construction and provider-status event mapping for image searches.
- [`MatchFixDialog.tsx`](../../renderer/src/components/MatchFixDialog.tsx) - manual match-repair flow launched from the Metadata tab.
- [`RefreshMetadataDialog.tsx`](../../renderer/src/components/RefreshMetadataDialog.tsx) - refresh-mode selection for metadata/images/links maintenance actions.
- [`BoxartFixDialog.tsx`](../../renderer/src/components/BoxartFixDialog.tsx) - missing-artwork repair workflow launched from the manager.
- [`RemoveDeletedGamesDialog.tsx`](../../renderer/src/components/RemoveDeletedGamesDialog.tsx) - review and cleanup flow for missing or deleted library entries.
- [`ImageContextMenu.tsx`](../../renderer/src/components/ImageContextMenu.tsx) - context menu actions for current artwork slots.
- [`GameLinks.tsx`](../../renderer/src/components/GameLinks.tsx) - link rendering helpers, icon inference, and search-query helpers reused by manager link editing flows.
- [`main/preload.ts`](../../main/preload.ts) - preload bridge for save, search, refresh, optimization, and preference APIs used by the manager.
