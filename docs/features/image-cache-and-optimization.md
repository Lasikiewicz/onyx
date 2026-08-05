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
5. [main.ts](../../main/main.ts) re-queues any games that still hold remote artwork URLs on startup so interrupted cache work is retried automatically on the next full launch.
6. Optimized assets are served back to renderer paths.

## Discovery and Data Sources

- Source data comes from persisted artwork URLs on game metadata records.
- Download, cache, transformation, and worker scheduling are split across cache and optimization services.
- Debug logging support exists for optimization troubleshooting.

## Data Model and Persistence

- Cached files are persisted on disk in app-managed cache directories.
- Optimized derivatives are separate from raw downloads and may vary by asset type.
- First-import optimization preserves UI-scale assets: covers are cached up to 1200px, logos/icons up to 800px/256px, and banners/heroes/screenshots up to 1920px on the longest side before compression.
- Queue state is runtime-only; cached artifacts persist across runs until invalidated or cleared.
- Animated artwork conversion runs ffmpeg via `runFfmpegCaptured` in [ImageCacheService.ts](../../main/ImageCacheService.ts) — an async `spawn` that captures stderr and enforces a timeout. It replaced a `spawnSync` that could block the main process (no paint, no IPC, no tray) for up to 60 seconds per animated asset.
- Artwork downloads are bounded: 64MB cap enforced against both `Content-Length` and the running byte total, and up to 5 redirects are followed (image CDNs routinely 301/302, and rejecting those silently lost available artwork).
- The `onyx-local://` handler reads cached files with `fs.promises.readFile`, trying each candidate extension and treating `ENOENT` as a miss. It previously did up to 8 `existsSync` calls plus a synchronous read *per image request*, so painting a 100-cover grid meant 100 blocking reads.
- Artwork URL updates from the optimization queue are batched, not flushed per game. [ImageOptimizationQueue.ts](../../main/ImageOptimizationQueue.ts) calls `gameStore.saveGame()` per optimized game but flushes only once, when the run drains; every `flush` rewrites the entire library file synchronously, so the previous per-game `flushPending()` cost one full-file write per game (measured: 11 writes for a 10-game import, now 1). [GameStore.ts](../../main/GameStore.ts) backs this with a debounce that is capped by `MAX_SAVE_DELAY` (10s) — without the cap a continuous stream of saves would reset the debounce indefinitely and never reach disk. Worst case on a hard crash mid-run is losing up to 10s of artwork URL updates; the optimized files themselves are already on disk, so a re-run recovers them.
- Games can temporarily persist remote artwork URLs until the importer/cache queue finishes; startup recovery now re-queues those games so a prior interrupted session does not leave new imports permanently uncached.
- Startup cache cleanup in [GameStore.ts](../../main/GameStore.ts) preserves valid `onyx-local://` artwork URLs even when they include cache-busting query strings, and now clears broken alternative banners, icons, and screenshot entries alongside box art/banner/logo/hero fields.
- The `onyx-local://` protocol handler that serves cached artwork to the renderer lives in [onyxLocalProtocol.ts](../../main/onyxLocalProtocol.ts) (extracted from `main.ts`); it resolves `{gameId}-{imageType}` lookups against the active cache directory, still decodes legacy URL/base64 path formats behind a traversal guard, and bounds its failed-URL tracking maps so long sessions cannot grow them without limit.

## Security Boundaries

- The `onyx-local` protocol serves files off disk to the renderer, so its containment check is the boundary between "cached artwork" and "any file the user can read". `isPathWithinRoots` in [onyxLocalProtocol.ts](../../main/onyxLocalProtocol.ts) is exported and directly tested in [onyxLocalProtocol.test.ts](../../main/onyxLocalProtocol.test.ts).
- That check is deliberately **segment-aware, not a string prefix**. A plain `startsWith(cacheDir)` accepts `…/cache-evil/payload.png` as being inside `…/cache`, because the string prefix matches even though the directories are siblings. A candidate must equal a root or continue it with a path separator.
- Both handlers apply it: the modern `protocol.handle` path and the legacy `registerFileProtocol` fallback, which decodes a caller-supplied base64 path and previously served it with no containment check at all.

## Failure Modes and Triage

### Symptom: Library images load slowly

- Verify cache directory is writable.
- Check queue backlog and worker host health.
- Confirm optimization is not disabled by settings.
- If newer games still point at remote artwork after a restart, confirm startup recovery re-queued them and that the app was not merely hidden to tray mid-queue.

### Symptom: Broken or blank optimized images

- Inspect source URL validity and cache file existence.
- Check worker errors and format conversion failures.
- Re-run optimize flow on affected games only.
- If the library record still points at deleted cached files, restart once to trigger startup cleanup of stale `onyx-local://` references before re-fetching artwork.

### Symptom: Newly imported images look blurry

- Confirm the metadata merge selected Steam 2x or SteamGridDB artwork instead of a lower-resolution general metadata provider asset.
- Check the optimization decision in the image queue; covers, banners, heroes, and screenshots should retain display-scale dimensions after first import.
- Clear or replace old cached artwork for affected games if they were imported before the higher-resolution cache ceilings were applied.

### Symptom: Old art remains after metadata refresh

- Confirm cache invalidation happened for the updated URL.
- Check whether the renderer is still resolving an older optimized asset path.

## File Ownership Map

- **Main process**
  - [ImageCacheService.ts](../../main/ImageCacheService.ts)
  - [onyxLocalProtocol.ts](../../main/onyxLocalProtocol.ts)
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
