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
- The shell-side bridge in [`useGameManagerShellBridge.ts`](../../renderer/src/hooks/useGameManagerShellBridge.ts), which connects the modal to app-shell save/delete follow-up, optimizer launch, and importer maintenance modes.
- The shell modal-control bridge in [`useAppShellModalControls.ts`](../../renderer/src/hooks/useAppShellModalControls.ts), which packages the root Game Manager modal props before they reach the app shell.
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
5. Launch maintenance dialogs such as remove-deleted-games scans, boxart fixes, or bulk refresh actions from inside the manager; [`useGameManagerShellBridge.ts`](../../renderer/src/hooks/useGameManagerShellBridge.ts) handles the app-shell side of importer maintenance handoff and save/delete follow-up after those actions complete.

## Discovery and Data Sources

- Game records come from the renderer library state and are passed into [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx) as `games`.
- Metadata candidates come from main-process provider search services reached through [`main/preload.ts`](../../main/preload.ts) and documented further in [metadata-matching-and-enrichment.md](./metadata-matching-and-enrichment.md).
- Artwork candidates come from provider and web-search paths summarized in [image-search-and-selection.md](./image-search-and-selection.md), with renderer-side result shaping in:
  - [`imageSearchUtils.ts`](../../renderer/src/components/gameManager/imageSearchUtils.ts)
  - [`imageResultUtils.ts`](../../renderer/src/components/gameManager/imageResultUtils.ts)
  - [`providerProgressUtils.ts`](../../renderer/src/components/gameManager/providerProgressUtils.ts)
  - [`useGameManagerImageSearch.ts`](../../renderer/src/components/gameManager/useGameManagerImageSearch.ts)
  - [`ProviderStatusRow.tsx`](../../renderer/src/components/gameManager/ProviderStatusRow.tsx)
  - [`GameArtworkStrip.tsx`](../../renderer/src/components/gameManager/GameArtworkStrip.tsx)
  - [`FastSearchResultsList.tsx`](../../renderer/src/components/gameManager/FastSearchResultsList.tsx)
  - [`ImageSearchResultsSections.tsx`](../../renderer/src/components/gameManager/ImageSearchResultsSections.tsx)
  - [`GameManagerImagesTab.tsx`](../../renderer/src/components/gameManager/GameManagerImagesTab.tsx)
  - The async image-search, fast-search, provider-progress, and image-apply workflow now lives in [`useGameManagerImageSearch.ts`](../../renderer/src/components/gameManager/useGameManagerImageSearch.ts), while [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx) keeps only the surrounding modal wiring, context-menu shell, and WEBM upload helpers.
- Metadata editing UI is now split so [`GameManagerMetadataTab.tsx`](../../renderer/src/components/gameManager/GameManagerMetadataTab.tsx) owns the Metadata tab layout while [`useGameManagerMetadata.ts`](../../renderer/src/components/gameManager/useGameManagerMetadata.ts) owns the metadata save, fix-match, match-apply, and cancel-edit workflow state/handlers that were previously embedded in [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx).
- Metadata apply paths in [`useGameManagerMetadata.ts`](../../renderer/src/components/gameManager/useGameManagerMetadata.ts) now normalize provider HTML descriptions to plain text (via [`metadataText.ts`](../../renderer/src/utils/metadataText.ts)) before populating the Metadata tab textarea.
- The Metadata tab now keeps Save/Cancel/Delete in a fixed bottom action bar in [`GameManagerMetadataTab.tsx`](../../renderer/src/components/gameManager/GameManagerMetadataTab.tsx), and save flow in [`useGameManagerMetadata.ts`](../../renderer/src/components/gameManager/useGameManagerMetadata.ts) normalizes legacy HTML descriptions before persistence.
- Refresh/import maintenance state is now split so [`useGameManagerRefresh.ts`](../../renderer/src/components/gameManager/useGameManagerRefresh.ts) owns refresh dialog state, refresh progress events, match-fix flow, boxart-fix flow, and refresh confirmation actions while [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx) keeps the surrounding modal shell and list selection behavior.
- Link editing UI is now split so [`GameManagerLinksTab.tsx`](../../renderer/src/components/gameManager/GameManagerLinksTab.tsx) owns the Links tab layout while [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx) keeps link-icon popup state and shared save/delete orchestration.
- Per-link custom icon changes are now isolated in [`LinkIconPickerDialog.tsx`](../../renderer/src/components/gameManager/LinkIconPickerDialog.tsx), which owns the browser-search, SVG upload, and remove-custom-icon dialog flow for link rows.
- Mod manager editing UI is now split so [`GameManagerModManagerTab.tsx`](../../renderer/src/components/gameManager/GameManagerModManagerTab.tsx) owns the Mod Manager tab layout while [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx) keeps the browse/launch side-effect handlers and shared save/cancel orchestration.
- Refresh maintenance UI is now split so [`GameManagerRefreshConfirmDialog.tsx`](../../renderer/src/components/gameManager/GameManagerRefreshConfirmDialog.tsx) and [`GameManagerRefreshProgressDialog.tsx`](../../renderer/src/components/gameManager/GameManagerRefreshProgressDialog.tsx) own the confirm/progress overlays while [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx) keeps the actual refresh orchestration.
- Delete and remove-missing maintenance dialogs are now grouped in [`GameManagerMaintenanceDialogs.tsx`](../../renderer/src/components/gameManager/GameManagerMaintenanceDialogs.tsx), which owns the dialog rendering while [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx) keeps the underlying delete and missing-game handler logic.
- Delete and remove-missing maintenance state now lives in [`useGameManagerMaintenance.ts`](../../renderer/src/components/gameManager/useGameManagerMaintenance.ts), which owns the delete/remove-missing async handlers and related dialog state while [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx) keeps the rest of the modal orchestration.
- Link icon inference and search-query helpers come from [`GameLinks.tsx`](../../renderer/src/components/GameLinks.tsx).
- Preferences that shape manager behavior are read through the preload bridge and persisted by main-process preference services described in [settings-and-preferences.md](./settings-and-preferences.md).
- App-shell follow-up for Game Manager actions now runs through [`useGameManagerShellBridge.ts`](../../renderer/src/hooks/useGameManagerShellBridge.ts), which keeps [`App.tsx`](../../renderer/src/App.tsx) focused on modal composition instead of Game Manager maintenance callbacks.

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
- [`useGameManagerShellBridge.ts`](../../renderer/src/hooks/useGameManagerShellBridge.ts) - app-shell bridge for Game Manager save/delete follow-up, optimizer launch, and maintenance-mode importer handoff.
- [`imageSearchUtils.ts`](../../renderer/src/components/gameManager/imageSearchUtils.ts) - image URL normalization, provider-name normalization, and animated-asset filtering helpers used by the Images tab.
- [`imageResultUtils.ts`](../../renderer/src/components/gameManager/imageResultUtils.ts) - ordered result grouping, provider filtering, and image-count aggregation for image search results.
- [`providerProgressUtils.ts`](../../renderer/src/components/gameManager/providerProgressUtils.ts) - provider-progress row construction and provider-status event mapping for image searches.
- [`useGameManagerImageSearch.ts`](../../renderer/src/components/gameManager/useGameManagerImageSearch.ts) - hook that owns image search query state, provider progress, fast-search result flow, image selection persistence, and the Images tab's async search orchestration.
- [`ProviderStatusRow.tsx`](../../renderer/src/components/gameManager/ProviderStatusRow.tsx) - presentational provider status/filter row for the Images tab search results.
- [`GameArtworkStrip.tsx`](../../renderer/src/components/gameManager/GameArtworkStrip.tsx) - presentational artwork preview strip and context-menu entry points for boxart, logo, banner, alt-banner, and icon slots.
- [`FastSearchResultsList.tsx`](../../renderer/src/components/gameManager/FastSearchResultsList.tsx) - presentational quick-result chooser for the fast image-search path before a specific result is expanded into full artwork candidates.
- [`ImageSearchResultsSections.tsx`](../../renderer/src/components/gameManager/ImageSearchResultsSections.tsx) - presentational grouped result grids for boxart, logo, banner, alt-banner, and icon candidates in the Images tab.
- [`GameManagerImagesTab.tsx`](../../renderer/src/components/gameManager/GameManagerImagesTab.tsx) - container component for the Images tab layout, wiring the artwork strip, search controls, provider row, quick-result chooser, grouped result sections, and fallback web-search shortcuts.
- [`GameManagerMetadataTab.tsx`](../../renderer/src/components/gameManager/GameManagerMetadataTab.tsx) - container component for the Metadata tab layout, wiring the artwork strip reuse, fix-match results list, metadata field editors, category editing, and save/cancel/delete actions.
- [`useGameManagerMetadata.ts`](../../renderer/src/components/gameManager/useGameManagerMetadata.ts) - hook that owns metadata save/cancel state plus the fix-match search and metadata-application workflow for the Metadata tab.
- [`useGameManagerRefresh.ts`](../../renderer/src/components/gameManager/useGameManagerRefresh.ts) - hook that owns refresh dialog state, progress-event handling, refresh confirmation actions, match-fix flow, and boxart-fix flow for Game Manager maintenance operations.
- [`GameManagerLinksTab.tsx`](../../renderer/src/components/gameManager/GameManagerLinksTab.tsx) - container component for the Links tab layout, wiring link refresh results, manual link rows, icon-entry buttons, and save/cancel/delete actions.
- [`GameManagerModManagerTab.tsx`](../../renderer/src/components/gameManager/GameManagerModManagerTab.tsx) - container component for the Mod Manager tab layout, wiring the mod manager path field, browse/launch actions, and save/cancel actions.
- [`LinkIconPickerDialog.tsx`](../../renderer/src/components/gameManager/LinkIconPickerDialog.tsx) - dialog component for per-link custom icon changes, including browser search, SVG upload, and custom-icon removal.
- [`GameManagerRefreshConfirmDialog.tsx`](../../renderer/src/components/gameManager/GameManagerRefreshConfirmDialog.tsx) - confirmation dialog component for nuclear refresh, missing-image search, links refresh, and optimizer queue actions.
- [`GameManagerRefreshProgressDialog.tsx`](../../renderer/src/components/gameManager/GameManagerRefreshProgressDialog.tsx) - progress/status overlay component for metadata and links refresh runs, including cancellation and completion actions.
- [`GameManagerMaintenanceDialogs.tsx`](../../renderer/src/components/gameManager/GameManagerMaintenanceDialogs.tsx) - grouped maintenance dialogs for delete confirmation and remove-missing-game review flows.
- [`useGameManagerMaintenance.ts`](../../renderer/src/components/gameManager/useGameManagerMaintenance.ts) - hook that owns delete and remove-missing dialog state plus the related async maintenance handlers.
- [`MatchFixDialog.tsx`](../../renderer/src/components/MatchFixDialog.tsx) - manual match-repair flow launched from the Metadata tab.
- [`RefreshMetadataDialog.tsx`](../../renderer/src/components/RefreshMetadataDialog.tsx) - refresh-mode selection for metadata/images/links maintenance actions.
- [`BoxartFixDialog.tsx`](../../renderer/src/components/BoxartFixDialog.tsx) - missing-artwork repair workflow launched from the manager.
- [`RemoveDeletedGamesDialog.tsx`](../../renderer/src/components/RemoveDeletedGamesDialog.tsx) - review and cleanup flow for missing or deleted library entries.
- [`ImageContextMenu.tsx`](../../renderer/src/components/ImageContextMenu.tsx) - context menu actions for current artwork slots.
- [`GameLinks.tsx`](../../renderer/src/components/GameLinks.tsx) - link rendering helpers, icon inference, and search-query helpers reused by manager link editing flows.
- [`main/preload.ts`](../../main/preload.ts) - preload bridge for save, search, refresh, optimization, and preference APIs used by the manager.
