# Add Games

## What This Feature Does

Provides the staged import-review workspace for bringing newly discovered or manually added games into the library. The Add Games flow lets users scan launchers and folders, inspect staged entries, edit metadata/artwork/links before import, ignore unwanted items, and then commit the reviewed set into the persistent library.

## Related Documentation

- [Importer Architecture](./importer-architecture.md) - system-level map of scanning, staged editing, and final import persistence.
- [Library import and startup scan](./library-import-and-startup-scan.md) - launcher scanning, startup scan behavior, and main-process import orchestration that feed the Add Games queue.
- [Metadata matching and enrichment](./metadata-matching-and-enrichment.md) - metadata search, match fixes, and provider enrichment used while reviewing staged games.
- [Image search and selection](./image-search-and-selection.md) - artwork search, quick image fetch, and local image selection used by the staged game editor.
- [Links and link management](./links-and-link-management.md) - link editing and icon handling used before staged games are imported.
- [Game Manager](./game-manager.md) - post-import per-game maintenance flow that reuses several of the same editing concepts after a title is in the library.
- [Settings and preferences](./settings-and-preferences.md) - scanning, library, and provider settings that shape what Add Games can find and enrich.

## User-Facing Surfaces

- The `Add Games` entry point in [`MenuBar.tsx`](../../renderer/src/components/MenuBar.tsx), which opens the importer flow from the main app menu.
- The importer shell in [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx), which manages staged queue state, scanning, import progress, and close/confirm behavior.
- The staged game editor in [`GamePropertiesPanel.tsx`](../../renderer/src/components/GamePropertiesPanel.tsx), which provides per-game Metadata, Images, Links, and Mod Manager tabs before import.
- The queue/source navigation in [`ImportSidebar.tsx`](../../renderer/src/components/importer/ImportSidebar.tsx) and action toolbar in [`ImportHeader.tsx`](../../renderer/src/components/importer/ImportHeader.tsx).
- The found-games bridge modal in [`FoundGamesModal.tsx`](../../renderer/src/components/FoundGamesModal.tsx), which lets users jump from newly detected titles straight into Add Games review.

## Settings and Toggles

- [Libraries](./settings/libraries.md) and [Scanning](./settings/scanning.md) settings determine which launchers/folders are scanned and whether the importer can be pre-populated from startup/manual scans.
- [API Integrations](./settings/api-integrations.md) controls provider availability for metadata and artwork enrichment inside the staged editor.
- Background scanning is paused while the importer is open via preload-exposed pause/resume hooks so scan noise does not interfere with the active review flow.
- Staged editor behavior depends on the same artwork/link/provider capabilities documented in the related feature docs above.

## Confirmed End-to-End Flows

1. User opens Add Games from the menu or from a found-games/startup-scan handoff, which opens [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx).
2. The importer scans configured sources or accepts pre-scanned games, building a staged `queue` of [`StagedGame`](../../renderer/src/types/importer.ts) records.
3. User selects staged entries in the sidebar and edits them through [`GamePropertiesPanel.tsx`](../../renderer/src/components/GamePropertiesPanel.tsx), including metadata fixes, artwork fetch/browse, link changes, categories, and launch fields.
4. Ignored entries stay out of the ready/import view, while ready entries remain in the queue until the user starts import.
5. Import commits the reviewed staged games through the main-process import pipeline and persists them into the library, after which the importer closes or refreshes surrounding UI state.

## Discovery and Data Sources

- Discovery starts with scan/manual-add sources orchestrated by the renderer importer shell and main-process import services documented in [library-import-and-startup-scan.md](./library-import-and-startup-scan.md).
- Staged game metadata lives on [`StagedGame`](../../renderer/src/types/importer.ts) records, which are progressively enriched as scans finish and as the user edits fields.
- The staged editor reuses metadata/image/link provider APIs through the preload bridge in [`main/preload.ts`](../../main/preload.ts), including shared `fetchGameImages` and metadata search flows.
- Menu and modal handoff sources include [`MenuBar.tsx`](../../renderer/src/components/MenuBar.tsx) and [`FoundGamesModal.tsx`](../../renderer/src/components/FoundGamesModal.tsx).

## Data Model and Persistence

- Pre-import state is held in renderer memory as a queue of [`StagedGame`](../../renderer/src/types/importer.ts) records inside [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx).
- [`GamePropertiesPanel.tsx`](../../renderer/src/components/GamePropertiesPanel.tsx) edits staged entries through shared editable-field helpers in [`EditableGame.ts`](../../renderer/src/types/EditableGame.ts) before flushing changes back to the parent queue.
- Imported results are transformed into persisted [`Game`](../../renderer/src/types/game.ts) records through the import pipeline and saved into the main-process game store.
- Temporary UI state such as selected queue item, ignored filter, scan progress, import progress, and unsaved staged edits remains renderer-only until import is confirmed.

## Failure Modes and Triage

- If Add Games opens but the queue is empty after a scan, inspect the scan/import pipeline documented in [library-import-and-startup-scan.md](./library-import-and-startup-scan.md) and verify launcher/library settings first.
- If staged edits are not reflected after switching between queued games, inspect [`GamePropertiesPanel.tsx`](../../renderer/src/components/GamePropertiesPanel.tsx) and the staged-edit merge helpers in [`EditableGame.ts`](../../renderer/src/types/EditableGame.ts).
- If metadata or image enrichment fails inside Add Games, check provider availability and then follow the deeper triage steps in [metadata-matching-and-enrichment.md](./metadata-matching-and-enrichment.md) and [image-search-and-selection.md](./image-search-and-selection.md).
- If import completes but games are missing or malformed in the library, inspect the import handoff from [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx) into the main-process store/import services.

## File Ownership Map

- [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx) - top-level Add Games shell for staged queue state, scanning, import progress, and modal lifecycle.
- [`GamePropertiesPanel.tsx`](../../renderer/src/components/GamePropertiesPanel.tsx) - per-staged-game editor covering metadata, images, links, and mod-manager fields before import.
- [`ImportSidebar.tsx`](../../renderer/src/components/importer/ImportSidebar.tsx) - queue navigation, source tabs, and ignored/visible game filtering for staged entries.
- [`ImportHeader.tsx`](../../renderer/src/components/importer/ImportHeader.tsx) - top toolbar for scan-folder, add-file, and scan-all actions.
- [`ImportGameForm.tsx`](../../renderer/src/components/importer/ImportGameForm.tsx) - form-oriented staged import helpers used by the importer surface.
- [`FoundGamesModal.tsx`](../../renderer/src/components/FoundGamesModal.tsx) - bridge modal that passes newly detected games into Add Games review.
- [`importer.ts`](../../renderer/src/types/importer.ts) - staged importer types such as `StagedGame`, `ImportStatus`, and `ImportSource`.
- [`EditableGame.ts`](../../renderer/src/types/EditableGame.ts) - shared editable field conversion and merge helpers used when staged edits are saved.
- [`main/preload.ts`](../../main/preload.ts) - preload bridge for scan, import, metadata, image, and background-scan pause/resume APIs used by Add Games.
