# Image Cache and Optimization Pipeline

## What This Feature Does

Caches image assets and optimizes them (including worker-based processing) for faster load and lower memory/disk overhead.

## Related Documentation

- [Image search and selection](./image-search-and-selection.md) — selected URLs are consumed by cache/optimization.
- [Game Details Panel](./main-view/components/game-details-panel.md), [App.tsx](../../renderer/src/App.tsx) — display cached/optimized artwork.
- [Settings and preferences](./settings-and-preferences.md) — [Animations](./settings/animations.md) affect animated asset usage; [Advanced](./settings/advanced.md) for cache-related options.

## User-Facing Surfaces

- Game library and details panels that display cached artwork.
- Metadata refresh flows that trigger new image downloads and optimization.
- Any maintenance/debug flows that inspect cache behavior.

## Settings and Toggles

- Animation settings affect whether animated optimized assets are used in the UI.
- Advanced maintenance actions can expose cache folders for inspection.

## Confirmed End-to-End Flows

1. Game metadata references image URLs.
2. [ImageCacheService.ts](../../main/ImageCacheService.ts) fetches/stores canonical files.
3. [ImageOptimizationController.ts](../../main/ImageOptimizationController.ts) / [ImageOptimizationQueue.ts](../../main/ImageOptimizationQueue.ts) schedule transformation work.
4. [ImageOptimizerWorkerHost.ts](../../main/ImageOptimizerWorkerHost.ts) executes image optimization in worker context ([ImageOptimizerWorker.worker.ts](../../main/ImageOptimizerWorker.worker.ts)).
5. Optimized assets are served back to renderer paths.

## Discovery and Data Sources

- Source data comes from persisted artwork URLs on game metadata records.
- Download, cache, transformation, and worker scheduling are split across cache and optimization services.
- Debug logging support exists for optimization troubleshooting.

## Data Model and Persistence

- Cached files are persisted on disk in app-managed cache directories.
- Optimized derivatives are separate from raw downloads and may vary by asset type.
- Queue state is runtime-only; cached artifacts persist across runs until invalidated or cleared.
- Startup cache cleanup in [GameStore.ts](../../main/GameStore.ts) preserves valid `onyx-local://` artwork URLs even when they include cache-busting query strings, and now clears broken alternative banners, icons, and screenshot entries alongside box art/banner/logo/hero fields.

## Failure Modes and Triage

### Symptom: Library images load slowly

- Verify cache directory is writable.
- Check queue backlog and worker host health.
- Confirm optimization is not disabled by settings.

### Symptom: Broken or blank optimized images

- Inspect source URL validity and cache file existence.
- Check worker errors and format conversion failures.
- Re-run optimize flow on affected games only.
- If the library record still points at deleted cached files, restart once to trigger startup cleanup of stale `onyx-local://` references before re-fetching artwork.

### Symptom: Old art remains after metadata refresh

- Confirm cache invalidation happened for the updated URL.
- Check whether the renderer is still resolving an older optimized asset path.

## File Ownership Map

- **Main process**
  - [ImageCacheService.ts](../../main/ImageCacheService.ts)
  - [ImageOptimizationController.ts](../../main/ImageOptimizationController.ts)
  - [ImageOptimizationQueue.ts](../../main/ImageOptimizationQueue.ts)
  - [ImageOptimizerWorkerHost.ts](../../main/ImageOptimizerWorkerHost.ts)
  - [ImageOptimizerWorker.worker.ts](../../main/ImageOptimizerWorker.worker.ts)
  - [thinWebpFrames.ts](../../main/thinWebpFrames.ts)
  - [debugOptimizationLog.ts](../../main/debugOptimizationLog.ts)
- **Renderer**
  - [RefreshMetadataDialog.tsx](../../renderer/src/components/RefreshMetadataDialog.tsx)
  - [GameDetailsPanel.tsx](../../renderer/src/components/GameDetailsPanel.tsx)
  - [App.tsx](../../renderer/src/App.tsx)
