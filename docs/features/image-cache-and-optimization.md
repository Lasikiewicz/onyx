# Image Cache and Optimization Pipeline

## What This Feature Does

Caches image assets and optimizes them (including worker-based processing) for faster load and lower memory/disk overhead.

## User-Facing Surfaces

- Game library and details panels that display cached artwork.
- Metadata refresh flows that trigger new image downloads and optimization.
- Any maintenance/debug flows that inspect cache behavior.

## Settings and Toggles

- Animation settings affect whether animated optimized assets are used in the UI.
- Advanced maintenance actions can expose cache folders for inspection.

## Confirmed End-to-End Flows

1. Game metadata references image URLs.
2. Cache service fetches/stores canonical files.
3. Optimization controller/queue schedules transformation work.
4. Worker host executes image optimization in worker context.
5. Optimized assets are served back to renderer paths.

## Discovery and Data Sources

- Source data comes from persisted artwork URLs on game metadata records.
- Download, cache, transformation, and worker scheduling are split across cache and optimization services.
- Debug logging support exists for optimization troubleshooting.

## Data Model and Persistence

- Cached files are persisted on disk in app-managed cache directories.
- Optimized derivatives are separate from raw downloads and may vary by asset type.
- Queue state is runtime-only; cached artifacts persist across runs until invalidated or cleared.

## Failure Modes and Triage

### Symptom: Library images load slowly

- Verify cache directory is writable.
- Check queue backlog and worker host health.
- Confirm optimization is not disabled by settings.

### Symptom: Broken or blank optimized images

- Inspect source URL validity and cache file existence.
- Check worker errors and format conversion failures.
- Re-run optimize flow on affected games only.

### Symptom: Old art remains after metadata refresh

- Confirm cache invalidation happened for the updated URL.
- Check whether the renderer is still resolving an older optimized asset path.

## File Ownership Map

- Main process
  - `main/ImageCacheService.ts`
  - `main/ImageOptimizationController.ts`
  - `main/ImageOptimizationQueue.ts`
  - `main/ImageOptimizerWorkerHost.ts`
  - `main/ImageOptimizerWorker.worker.ts`
  - `main/thinWebpFrames.ts`
  - `main/debugOptimizationLog.ts`
- Renderer
  - `renderer/src/components/RefreshMetadataDialog.tsx`
  - `renderer/src/components/GameDetailsPanel.tsx`
  - `renderer/src/App.tsx`
