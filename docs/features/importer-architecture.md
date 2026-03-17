# Importer Architecture

## What This Feature Does

Explains the full Add Games and scanning architecture as one system: source discovery, launcher/folder scanning, staged-game queue construction, staged editing, metadata/artwork enrichment, import execution, and final persistence into the library.

This is the system-level companion to the user-facing [Add Games](./add-games.md) and [Library Import and Startup Scan](./library-import-and-startup-scan.md) runbooks.

## Related Documentation

- [Add Games](./add-games.md)
- [Library Import and Startup Scan](./library-import-and-startup-scan.md)
- [Metadata Matching and Enrichment](./metadata-matching-and-enrichment.md)
- [Image Search and Selection](./image-search-and-selection.md)
- [Links and Link Management](./links-and-link-management.md)
- [Game Manager](./game-manager.md)
- [Settings and Preferences](./settings-and-preferences.md)

## User-Facing Surfaces

- The importer shell in [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx), which owns the staged queue, scan controls, import progress, and overall modal lifecycle.
- The renderer importer handoff/orchestration hook in [`useImporterWorkbench.ts`](../../renderer/src/hooks/useImporterWorkbench.ts), which centralizes API-gated importer opening, startup/background scan handoff, importer reset, and post-import tutorial follow-up.
- The shell modal-control bridge in [`useAppShellModalControls.ts`](../../renderer/src/hooks/useAppShellModalControls.ts), which packages importer modal props for settings, update-library, and Game Manager entry points before they reach the app shell.
- The startup scan review hook in [`useStartupScanReview.ts`](../../renderer/src/hooks/useStartupScanReview.ts), which owns the shell-side cancel/review actions that turn startup-found games into importer handoff requests.
- The staged-game editor in [`GamePropertiesPanel.tsx`](../../renderer/src/components/GamePropertiesPanel.tsx), which exposes Metadata, Images, Links, and Mod Manager editing before import.
- The extracted staged Links tab in [`GamePropertiesLinksTab.tsx`](../../renderer/src/components/gameProperties/GamePropertiesLinksTab.tsx), which now owns link-row editing and icon rendering for the importer workflow.
- The extracted staged Mod Manager tab in [`GamePropertiesModManagerTab.tsx`](../../renderer/src/components/gameProperties/GamePropertiesModManagerTab.tsx), which now owns importer-side mod-manager status and launch UI.
- The extracted staged metadata workflow hook in [`useGamePropertiesMetadata.ts`](../../renderer/src/components/gameProperties/useGamePropertiesMetadata.ts), which now owns importer-side undo, fix-match search, and match-apply behavior.
- Discovery entry points in [`MenuBar.tsx`](../../renderer/src/components/MenuBar.tsx), startup overlays, and found-games handoff UI such as [`FoundGamesModal.tsx`](../../renderer/src/components/FoundGamesModal.tsx).
- Main-process scan/import APIs exposed through [`main/preload.ts`](../../main/preload.ts) and fulfilled by IPC handlers and services under [`main/ipc/`](../../main/ipc) and [`main/ImportService.ts`](../../main/ImportService.ts).

## Settings and Toggles

- [Libraries](./settings/libraries.md) controls configured launcher/library roots and manual folders that feed scanning.
- [Scanning](./settings/scanning.md) affects startup/background scan behavior and importer-related discovery.
- [API Integrations](./settings/api-integrations.md) determines whether staged entries can be enriched with metadata and artwork providers.
- Link and display-related settings influence staged link editing and some default presentation choices but do not replace staged game data itself.

## Confirmed End-to-End Flows

1. Discovery begins from a manual Add Games action, startup scan handoff, or background/new-games flow.
2. When startup scans find games, [`useStartupScanReview.ts`](../../renderer/src/hooks/useStartupScanReview.ts) owns the shell-side review/cancel actions before the user routes those findings into the importer.
3. [`useImporterWorkbench.ts`](../../renderer/src/hooks/useImporterWorkbench.ts) validates renderer-side prerequisites, normalizes the handoff, and opens [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx) with either fresh-scan or pre-scanned context.
4. Main-process handlers route scan requests into [`ImportService.ts`](../../main/ImportService.ts), launcher-specific services, and related helpers to build scanned game candidates.
5. Renderer transforms discovered candidates into staged [`StagedGame`](../../renderer/src/types/importer.ts) records and stores them in the importer queue.
6. User edits staged entries through [`GamePropertiesPanel.tsx`](../../renderer/src/components/GamePropertiesPanel.tsx), which reuses metadata/image/link workflows that overlap with Game Manager concepts but target staged records instead of persisted library games.
7. On import, [`useImporterWorkbench.ts`](../../renderer/src/hooks/useImporterWorkbench.ts) persists the final library records, schedules background artwork enrichment for incomplete imports, reloads the library shell, and resets importer-only state before returning control to the shell.
8. Post-import follow-up may trigger tutorial/state refresh behavior and send the user back into the main shell or later into [`GameManager.tsx`](../../renderer/src/components/GameManager.tsx) for post-import maintenance.

## Discovery and Data Sources

- Renderer importer state: [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx), [`ImportSidebar.tsx`](../../renderer/src/components/importer/ImportSidebar.tsx), [`ImportHeader.tsx`](../../renderer/src/components/importer/ImportHeader.tsx)
- Renderer importer shell orchestration: [`useImporterWorkbench.ts`](../../renderer/src/hooks/useImporterWorkbench.ts)
- Startup-review handoff: [`useStartupScanReview.ts`](../../renderer/src/hooks/useStartupScanReview.ts)
- Staged types and queue data: [`importer.ts`](../../renderer/src/types/importer.ts), [`EditableGame.ts`](../../renderer/src/types/EditableGame.ts)
- Main-process discovery orchestration: [`ImportService.ts`](../../main/ImportService.ts), [`main/ipc/scanningHandlers.ts`](../../main/ipc/scanningHandlers.ts)
- Launcher/platform helpers: Steam/Xbox/app-config services and generic deep-scan helpers used by [`ImportService.ts`](../../main/ImportService.ts)
- Metadata/image/link enrichment: preload bridge plus services documented in [Metadata Matching and Enrichment](./metadata-matching-and-enrichment.md), [Image Search and Selection](./image-search-and-selection.md), and [Links and Link Management](./links-and-link-management.md)

## Data Model and Persistence

- Scanned candidates begin as launcher/folder scan results from [`ImportService.ts`](../../main/ImportService.ts) and related helpers.
- Renderer importer state stores editable staged entries as [`StagedGame`](../../renderer/src/types/importer.ts) records in memory.
- [`GamePropertiesPanel.tsx`](../../renderer/src/components/GamePropertiesPanel.tsx) works on staged/editable shapes through [`EditableGame.ts`](../../renderer/src/types/EditableGame.ts), then writes changes back into the staged queue.
- Final import persists library records through the normal game store/save pipeline rather than keeping a separate importer-owned store.
- Temporary scan progress, ignored-state, selected queue item, and staged-edit state remain renderer-local until import is confirmed.

## Failure Modes and Triage

### Symptom: Scans succeed but the importer queue is empty or incomplete

- Check scan result generation in [`ImportService.ts`](../../main/ImportService.ts) and IPC handoff in [`main/ipc/scanningHandlers.ts`](../../main/ipc/scanningHandlers.ts).
- Confirm renderer queue-building logic in [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx) is receiving the expected candidate set.
- Verify launcher/library settings in [settings/libraries.md](./settings/libraries.md) and [settings/scanning.md](./settings/scanning.md).

### Symptom: Switching staged games loses edits or shows the wrong record

- Check staged queue/edit synchronization in [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx).
- Check staged editable conversion/merge helpers in [`EditableGame.ts`](../../renderer/src/types/EditableGame.ts).
- Check the tab/editor logic inside [`GamePropertiesPanel.tsx`](../../renderer/src/components/GamePropertiesPanel.tsx).

### Symptom: Imported games are missing metadata, artwork, or links that were visible during staging

- Check the staged-to-library mapping during import in [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx).
- Confirm the final save path preserves the staged fields rather than regenerating partial records.
- Cross-check the relevant deeper runbooks for metadata, image, and link workflows.

## File Ownership Map

- [`ImportWorkbenchV2.tsx`](../../renderer/src/components/importer/ImportWorkbenchV2.tsx) - top-level importer workspace, queue state, scan controls, and import execution.
- [`useImporterWorkbench.ts`](../../renderer/src/hooks/useImporterWorkbench.ts) - shell-to-importer handoff, importer reset, and post-import follow-up orchestration.
- [`useStartupScanReview.ts`](../../renderer/src/hooks/useStartupScanReview.ts) - startup overlay review/cancel actions that feed the importer handoff path.
- [`GamePropertiesPanel.tsx`](../../renderer/src/components/GamePropertiesPanel.tsx) - staged-game editor for metadata, images, links, and mod manager fields before import.
- [`GamePropertiesLinksTab.tsx`](../../renderer/src/components/gameProperties/GamePropertiesLinksTab.tsx) - extracted staged Links tab UI for importer-side link editing.
- [`GamePropertiesModManagerTab.tsx`](../../renderer/src/components/gameProperties/GamePropertiesModManagerTab.tsx) - extracted staged Mod Manager tab UI for importer-side mod-manager status and launch actions.
- [`useGamePropertiesMetadata.ts`](../../renderer/src/components/gameProperties/useGamePropertiesMetadata.ts) - extracted staged metadata workflow for undo, fix-match search, and match application.
- [`ImportSidebar.tsx`](../../renderer/src/components/importer/ImportSidebar.tsx) - queue navigation, staged selection, and ignored filtering.
- [`ImportHeader.tsx`](../../renderer/src/components/importer/ImportHeader.tsx) - importer toolbar and scan/import actions.
- [`importer.ts`](../../renderer/src/types/importer.ts) - staged importer types such as `StagedGame` and importer progress/status shapes.
- [`EditableGame.ts`](../../renderer/src/types/EditableGame.ts) - editable conversion/merge helpers shared by staged editing flows.
- [`main/preload.ts`](../../main/preload.ts) - preload bridge for scan/import/pause/resume/metadata/image actions used by the importer.
- [`main/ipc/scanningHandlers.ts`](../../main/ipc/scanningHandlers.ts) - IPC boundary for scan and importer-oriented discovery requests.
- [`ImportService.ts`](../../main/ImportService.ts) - primary main-process scan orchestration and candidate discovery service.
