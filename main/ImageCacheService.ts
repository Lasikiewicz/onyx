import { app } from 'electron';
import path from 'node:path';
import { mkdirSync, existsSync, writeFileSync, readFileSync, statSync, promises as fsPromises } from 'node:fs';
import { promisify } from 'node:util';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import { homedir, tmpdir, cpus } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { optimizeInWorker } from './ImageOptimizerWorkerHost.js';
import { thinWebpFrames } from './thinWebpFrames.js';
import { debugOptimizationLog, isDebugOptimizationEnabled } from './debugOptimizationLog.js';

const runtimeRequire = createRequire(__filename);

/** Resolve path to ffmpeg binary (bundled or system). Fixes asar path for Electron. */
function getFfmpegPath(): { path: string; source: 'bundled' | 'system' } {
  try {
    const p = require('ffmpeg-static') as string;
    if (p && typeof p === 'string') {
      const fixed = p.replace(/app\.asar([/\\])/g, 'app.asar.unpacked$1');
      return { path: fixed, source: 'bundled' };
    }
  } catch {
    /* ffmpeg-static not installed */
  }
  return { path: 'ffmpeg', source: 'system' };
}

/** Max longest-side dimension by image type for cache (reduces size and load time). */
const MAX_DIMENSION_BY_TYPE: Record<string, number> = {
  boxart: 600,
  logo: 400,
  banner: 800,
  alternativeBanner: 800,
  hero: 800,
  icon: 128,
};
const DEFAULT_MAX_DIMENSION = 800;

/** Max fps for animated cache (drops frames to reduce size). */
const ANIMATED_MAX_FPS = 15;
/** Target fps for Sharp-based animated WebP frame thinning. */
const ANIMATED_TARGET_FPS = 15;
/** Quality for animated WebP when using Sharp (0–100, lossy). */
const WEBP_ANIMATED_QUALITY = 80;
/** Lower quality for banner/hero types: faster encode, smaller file. */
const WEBP_ANIMATED_QUALITY_BACKGROUND = 75;
/** Animated WebP often exceeds 16MP; allow larger inputs so we can downscale rather than keep originals. */
const ANIMATED_WEBP_LIMIT_INPUT_PIXELS = 8192 * 8192;
/** Skip very large files in optimizeExistingCache to avoid stalls/crashes on old assets. */
const OPTIMIZE_EXISTING_SKIP_OVER_BYTES = 15 * 1024 * 1024;
/** WebP needs a higher threshold because many animated sources are larger before optimization. */
const OPTIMIZE_EXISTING_WEBP_SKIP_OVER_BYTES = 80 * 1024 * 1024;

/** Target max size for forced oversized animated WebP re-encode in optimizeExistingCache. */
const FORCED_OVERSIZED_WEBP_TARGET_BYTES = 15 * 1024 * 1024;

/** Detect animated image format by magic bytes (URL extension can lie). */
function getAnimatedContentFormat(buffer: Buffer): '.gif' | '.webp' | '.webm' | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return '.gif'; // GIF87a / GIF89a
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    // RIFF....WEBP - only return .webp here when it is actually animated.
    // Static WebP should flow through the static optimizer path.
    let cursor = 12;
    while (cursor + 8 <= buffer.length) {
      const chunkType = buffer.toString('ascii', cursor, cursor + 4);
      const chunkSize = buffer.readUInt32LE(cursor + 4);
      const chunkDataStart = cursor + 8;

      // ANIM / ANMF chunks are definitive animation markers.
      if (chunkType === 'ANIM' || chunkType === 'ANMF') return '.webp';

      // VP8X feature flags: bit 1 indicates animation.
      if (chunkType === 'VP8X' && chunkDataStart < buffer.length) {
        const flags = buffer[chunkDataStart];
        if ((flags & 0x02) !== 0) return '.webp';
      }

      const paddedSize = chunkSize + (chunkSize % 2);
      cursor = chunkDataStart + paddedSize;
    }
  }
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return '.webm'; // EBML
  return null;
}
const JPEG_QUALITY = 85;
const WEBP_QUALITY = 85;
const PNG_COMPRESSION = 6;

let sharpConcurrencySet = false;
/** Get Sharp instance with concurrency limited once per process to avoid libvips thread explosion. */
async function getSharp(): Promise<typeof import('sharp')> {
  const sharp = (await import('sharp')).default;
  if (!sharpConcurrencySet) {
    sharp.concurrency(1);
    sharpConcurrencySet = true;
  }
  return sharp;
}

type OptimizationPerformanceProfile = 'low' | 'balanced' | 'high';
const PROFILE_LIMITS: Record<OptimizationPerformanceProfile, { reserveCores: number; maxImageWorkers: number }> = {
  low: { reserveCores: 4, maxImageWorkers: 1 },
  balanced: { reserveCores: 2, maxImageWorkers: 1 },
  high: { reserveCores: 1, maxImageWorkers: 2 },
};

export interface CachedImage {
  localPath: string;
  url: string;
}

type OptimizationFailureCategory = 'module-not-found' | 'timeout' | 'process-error' | 'exception' | 'no-result' | 'no-gain';

interface OptimizationStageAttempt {
  attempted: boolean;
  outBytes?: number;
  error?: string;
  durationMs?: number;
  startedAtMs?: number;
  finishedAtMs?: number;
  failureCategory?: OptimizationFailureCategory;
  args?: string[];
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  stderrTail?: string;
  outputExists?: boolean;
  timedOut?: boolean;
}

interface OptimizationAttemptSummary {
  inputBytes?: number;
  totalDurationMs?: number;
  contentFormat?: string | null;
  detectedContentFormat?: string | null;
  worker?: OptimizationStageAttempt;
  ffmpeg?: OptimizationStageAttempt;
  sharp?: OptimizationStageAttempt;
  selectedPath?: 'worker' | 'ffmpeg' | 'sharp' | 'original';
}

interface OptimizeImageResult {
  data: Buffer;
  ext: string;
  decisionReason: string;
  attemptSummary: OptimizationAttemptSummary;
}

interface FfmpegResizeResult {
  data: Buffer | null;
  attempt: OptimizationStageAttempt;
}

function classifyErrorMessage(error: unknown): OptimizationFailureCategory {
  const message = error instanceof Error ? error.message : String(error ?? 'unknown error');
  const normalized = message.toLowerCase();
  if (normalized.includes('cannot find module') || normalized.includes('module not found')) return 'module-not-found';
  if (normalized.includes('timeout') || normalized.includes('timed out')) return 'timeout';
  return 'exception';
}

/**
 * Service for downloading and caching images locally.
 *
 * Image storage: All images (downloaded and optimized) live in a single folder.
 * There is no separate "before import" or staging location — we download (or read
 * from disk), optimize in memory, then write to the cache dir. On Windows that is
 * typically C:\Users\<user>\AppData\Local\Onyx\images (or "Onyx Alpha" for alpha builds).
 */
export class ImageCacheService {
  private cacheDir: string;
  private initialized: boolean = false;

  constructor() {
    // Store images in a more accessible location with better permissions
    // On Windows, use AppData\Local instead of AppData\Roaming for better permissions
    // On Linux/Mac, use a cache directory in the home folder
    const appName = app.name || 'Onyx';
    if (process.platform === 'win32') {
      // Windows: Use AppData\Local\appName\images
      // This is typically C:\Users\<user>\AppData\Local\appName\images
      const localAppData = process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local');
      this.cacheDir = path.join(localAppData, appName, 'images');
    } else if (process.platform === 'darwin') {
      // macOS: Use ~/Library/Caches/appName/images
      this.cacheDir = path.join(homedir(), 'Library', 'Caches', appName, 'images');
    } else {
      // Linux: Use ~/.cache/appName/images
      this.cacheDir = path.join(homedir(), '.cache', appName, 'images');
    }
    console.log(`[ImageCache] Cache directory set to: ${this.cacheDir}`);
  }

  /**
   * Initialize the cache directory
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    try {
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true });
        console.log(`[ImageCache] Created cache directory: ${this.cacheDir}`);
      } else {
        console.log(`[ImageCache] Using existing cache directory: ${this.cacheDir}`);
      }

      // Verify we can write to the directory
      const testFile = path.join(this.cacheDir, '.test-write');
      try {
        writeFileSync(testFile, 'test');
        const { unlinkSync } = require('node:fs');
        unlinkSync(testFile);
        console.log(`[ImageCache] Cache directory is writable: ${this.cacheDir}`);
      } catch (writeError) {
        console.error(`[ImageCache] Cache directory is not writable: ${this.cacheDir}`, writeError);
        // Try fallback location
        const fallbackDir = path.join(app.getPath('userData'), 'cache', 'images');
        if (fallbackDir !== this.cacheDir) {
          console.log(`[ImageCache] Attempting to use fallback directory: ${fallbackDir}`);
          if (!existsSync(fallbackDir)) {
            mkdirSync(fallbackDir, { recursive: true });
          }
          this.cacheDir = fallbackDir;
        } else {
          throw new Error('Image cache directory is not writable and no fallback available');
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('[ImageCache] Error initializing image cache directory:', error);
      throw error;
    }
  }

  /**
   * Get a simple, predictable filename: {gameId}-{imageType}.{ext}
   * This method is no longer used - we generate filenames inline now
   */
  private getFilenameFromUrl(url: string, gameId: string, imageType: string): string {
    // Use simple, predictable filename: {gameId}-{imageType}.{ext}
    // This makes it easy to find files in the protocol handler
    const ext = path.extname(new URL(url).pathname) || '.jpg';
    // Sanitize gameId to be filesystem-safe
    const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
    return `${safeGameId}-${imageType}${ext}`;
  }

  /**
   * Download an image from a URL
   */
  private async downloadImage(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const request = client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Resize and compress animated WebP using Sharp (animated: true, pages: -1).
   * Optionally thins frames to target FPS. Returns resized buffer if smaller and multi-frame preserved, else null.
   */
  private async resizeAnimatedWebpWithSharp(
    imageData: Buffer,
    imageType: string
  ): Promise<Buffer | null> {
    try {
      const sharp = await getSharp();
      const maxDim = MAX_DIMENSION_BY_TYPE[imageType] ?? DEFAULT_MAX_DIMENSION;
      const quality =
        imageType === 'banner' || imageType === 'alternativeBanner' || imageType === 'hero'
          ? WEBP_ANIMATED_QUALITY_BACKGROUND
          : WEBP_ANIMATED_QUALITY;
      // Allow higher input pixel ceiling for animated WebP so oversized sources can still be downscaled.
      const limitInputPixels = ANIMATED_WEBP_LIMIT_INPUT_PIXELS;
      const out = await sharp(imageData, { animated: true, pages: -1, limitInputPixels })
        .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toBuffer();
      // Frame-thinning disabled: causes hang on large animated WebP (many frames).
      // const thinned = await thinWebpFrames(sharp as Parameters<typeof thinWebpFrames>[0], out, ANIMATED_TARGET_FPS, quality);
      // if (thinned != null && thinned.length < out.length) out = thinned;
      if (out.length >= imageData.length) return null;
      if (out.length < imageData.length * 0.15) return null;
      return out;
    } catch {
      return null;
    }
  }

  /**
   * Aggressive animated WebP recompression for oversized cache files.
   * Tries lower quality steps and returns the best output smaller than input.
   */
  private async aggressivelyRecompressOversizedWebp(
    imageData: Buffer,
    imageType: string,
    targetBytes: number
  ): Promise<Buffer | null> {
    try {
      const sharp = await getSharp();
      const maxDim = MAX_DIMENSION_BY_TYPE[imageType] ?? DEFAULT_MAX_DIMENSION;
      const dimensionSteps = [1, 0.85, 0.7, 0.55];
      const qualitySteps = [70, 55, 45, 35, 28, 22];
      let bestData: Buffer | null = null;

      for (const dimFactor of dimensionSteps) {
        const targetDim = Math.max(240, Math.floor(maxDim * dimFactor));
        for (const quality of qualitySteps) {
          try {
            const out = await sharp(imageData, { animated: true, pages: -1, limitInputPixels: false })
              .resize(targetDim, targetDim, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality, effort: 6 })
              .toBuffer();

            if (out.length < imageData.length && (bestData == null || out.length < bestData.length)) {
              bestData = out;
            }

            if (out.length <= targetBytes) {
              return out;
            }
          } catch {
            // Try next quality/dimension combination
          }
        }
      }

      return bestData;
    } catch {
      return null;
    }
  }

  /**
   * Aggressive FFmpeg recompression for oversized animated WebP.
   * Sweeps fps/scale/quality combinations and returns the best smaller output.
   */
  private async aggressivelyRecompressOversizedWebpWithFfmpeg(
    imageData: Buffer,
    imageType: string,
    targetBytes: number
  ): Promise<Buffer | null> {
    const base = `onyx-oversized-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tmpDir = tmpdir();
    const inp = path.join(tmpDir, `${base}-in.webp`);
    const outp = path.join(tmpDir, `${base}-out.webp`);
    try {
      await fsPromises.writeFile(inp, imageData);
      const { path: ffmpegPath } = getFfmpegPath();
      const maxDim = MAX_DIMENSION_BY_TYPE[imageType] ?? DEFAULT_MAX_DIMENSION;
      const dimensionSteps = [1, 0.8, 0.65];
      const fpsSteps = [12, 8, 6];
      const qualitySteps = [55, 40];
      const maxAttempts = 18;
      const attemptTimeoutMs = 20000;
      let bestData: Buffer | null = null;
      let attempts = 0;

      const runFfmpegAttempt = async (args: string[]): Promise<boolean> => {
        return await new Promise<boolean>((resolve) => {
          let settled = false;
          const child = spawn(ffmpegPath, args, {
            windowsHide: true,
            stdio: 'ignore',
          });

          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            try {
              child.kill();
            } catch {
              // ignore
            }
            resolve(false);
          }, attemptTimeoutMs);

          child.on('error', () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(false);
          });

          child.on('close', (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(code === 0);
          });
        });
      };

      for (const dimFactor of dimensionSteps) {
        const targetDim = Math.max(220, Math.floor(maxDim * dimFactor));
        for (const fps of fpsSteps) {
          for (const quality of qualitySteps) {
            if (attempts >= maxAttempts) {
              return bestData;
            }
            attempts++;
            const vf = `fps=${fps},scale=min(${targetDim},iw):-2:flags=lanczos`;
            const args = [
              '-y',
              '-i', inp,
              '-an',
              '-sn',
              '-vf', vf,
              '-c:v', 'libwebp_anim',
              '-quality', String(quality),
              '-compression_level', '6',
              '-loop', '0',
              outp,
            ];

            const ok = await runFfmpegAttempt(args);
            if (!ok || !existsSync(outp)) {
              continue;
            }

            const outData = await fsPromises.readFile(outp);
            if (outData.length < imageData.length && (bestData == null || outData.length < bestData.length)) {
              bestData = outData;
            }

            if (outData.length <= targetBytes) {
              return outData;
            }

            try {
              await fsPromises.unlink(outp);
            } catch {
              // ignore cleanup failure between attempts
            }
          }
        }
      }

      return bestData;
    } catch {
      return null;
    } finally {
      try {
        if (existsSync(inp)) await fsPromises.unlink(inp);
        if (existsSync(outp)) await fsPromises.unlink(outp);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Resize and compress animated image (GIF, WebM, WebP) with ffmpeg: scale to max dimension, cap framerate.
   * Returns resized buffer if smaller and ffmpeg succeeds, else null.
   * For animated WebP, FFmpeg support depends on build (decode may fail); caller falls back to Sharp when null.
   * GPU hwaccel was reverted: trying -hwaccel cuda/d3d11va/qsv caused app crashes on some systems.
   */
  private async resizeAnimatedWithFfmpeg(
    imageData: Buffer,
    sourceExt: string,
    imageType: string
  ): Promise<FfmpegResizeResult> {
    const startedAtMs = Date.now();
    const attempt: OptimizationStageAttempt = { attempted: true, startedAtMs };
    const ext = sourceExt.toLowerCase();
    const maxDim = MAX_DIMENSION_BY_TYPE[imageType] ?? DEFAULT_MAX_DIMENSION;
    const base = `onyx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tmpDir = tmpdir();
    const inp = path.join(tmpDir, `${base}-in${ext}`);
    const outp = path.join(tmpDir, `${base}-out${ext}`);
    try {
      await fsPromises.writeFile(inp, imageData);
      const { path: ffmpegPath } = getFfmpegPath();
      const scale = `scale=${maxDim}:-2:force_original_aspect_ratio=decrease`;
      const vf = `fps=${ANIMATED_MAX_FPS},${scale}`;
      const quality =
        imageType === 'banner' || imageType === 'alternativeBanner' || imageType === 'hero'
          ? WEBP_ANIMATED_QUALITY_BACKGROUND
          : WEBP_ANIMATED_QUALITY;
      const args =
        ext === '.webp'
          ? ['-y', '-i', inp, '-vf', vf, '-c:v', 'libwebp_anim', '-quality', String(quality), '-loop', '0', outp]
          : ['-y', '-i', inp, '-vf', vf, outp];
      attempt.args = [ffmpegPath, ...args];
      const result = spawnSync(ffmpegPath, args, {
        encoding: 'utf8',
        timeout: 60000,
        windowsHide: true,
      });
      attempt.finishedAtMs = Date.now();
      attempt.durationMs = attempt.finishedAtMs - startedAtMs;
      attempt.exitCode = result.status;
      attempt.signal = result.signal;
      attempt.timedOut = result.error != null && String((result.error as Error).message ?? '').toLowerCase().includes('timed out');
      if (typeof result.stderr === 'string' && result.stderr.length > 0) {
        attempt.stderrTail = result.stderr.slice(-1200);
      }
      attempt.outputExists = existsSync(outp);
      if (result.status !== 0 || !attempt.outputExists) {
        if (result.status !== 0 && result.stderr) {
          console.warn('[ImageCache] FFmpeg failed:', result.stderr.slice(-500));
        }
        attempt.error = result.status !== 0
          ? `ffmpeg-exit-${result.status}`
          : (attempt.timedOut ? 'ffmpeg-timeout' : 'no-output-file');
        attempt.failureCategory = attempt.timedOut ? 'timeout' : 'process-error';
        return { data: null, attempt };
      }
      const outData = await fsPromises.readFile(outp);
      attempt.outBytes = outData.length;
      if (outData.length >= imageData.length) {
        attempt.error = 'no-result';
        attempt.failureCategory = 'no-gain';
        return { data: null, attempt };
      }
      return { data: outData, attempt };
    } catch (error) {
      attempt.finishedAtMs = Date.now();
      attempt.durationMs = attempt.finishedAtMs - startedAtMs;
      attempt.error = error instanceof Error ? error.message : String(error);
      attempt.failureCategory = classifyErrorMessage(error);
      return { data: null, attempt };
    } finally {
      try {
        if (existsSync(inp)) await fsPromises.unlink(inp);
        if (existsSync(outp)) await fsPromises.unlink(outp);
      } catch { /* ignore */ }
    }
  }

  /**
   * Optimize image for cache: resize to display-friendly max dimensions and compress.
   * Animated formats (gif, webm, webp) use FFmpeg where possible.
   * Animated WebP falls back to Sharp resize/re-encode when FFmpeg can't process it.
   */
  private async optimizeImage(
    imageData: Buffer,
    imageType: string,
    sourceExt: string,
    options?: { forceAnimatedWebp?: boolean }
  ): Promise<OptimizeImageResult> {
    const startedAtMs = Date.now();
    const attemptSummary: OptimizationAttemptSummary = {};
    const detectedContentFormat = getAnimatedContentFormat(imageData);
    const shouldForceAnimatedWebp = options?.forceAnimatedWebp === true && sourceExt.toLowerCase() === '.webp';
    const contentFormat = shouldForceAnimatedWebp ? '.webp' : detectedContentFormat;
    attemptSummary.inputBytes = imageData.length;
    attemptSummary.detectedContentFormat = detectedContentFormat;
    attemptSummary.contentFormat = contentFormat;
    if (isDebugOptimizationEnabled()) {
      debugOptimizationLog(`optimizeImage start imageType=${imageType} sourceExt=${sourceExt} bytes=${imageData.length} contentFormat=${contentFormat ?? 'null'} detected=${detectedContentFormat ?? 'null'} forceAnimatedWebp=${shouldForceAnimatedWebp}`);
    }
    if (contentFormat !== null) {
      if (contentFormat === '.webp') {
        if (isDebugOptimizationEnabled()) debugOptimizationLog('optimizeImage animated webp worker-fast path');
        let bestData: Buffer | null = null;
        let bestPath: 'worker' | 'ffmpeg' | 'sharp' | null = null;
        try {
          const workerStartedAtMs = Date.now();
          attemptSummary.worker = { attempted: true, startedAtMs: workerStartedAtMs };
          const { data, ext } = await optimizeInWorker(imageData, imageType, '.webp', 'animated-webp');
          attemptSummary.worker.outBytes = data.length;
          attemptSummary.worker.finishedAtMs = Date.now();
          attemptSummary.worker.durationMs = attemptSummary.worker.finishedAtMs - workerStartedAtMs;
          if (data.length < imageData.length) {
            bestData = data;
            bestPath = 'worker';
          }
          // If worker made a meaningful reduction, keep it; otherwise continue with ffmpeg/sharp fallback.
          if (data.length <= Math.floor(imageData.length * 0.95)) {
            attemptSummary.selectedPath = 'worker';
            return { data, ext, decisionReason: 'worker_smaller', attemptSummary };
          }
          if (isDebugOptimizationEnabled()) {
            debugOptimizationLog(`optimizeImage animated webp worker result not enough reduction outBytes=${data.length}, trying ffmpeg/sharp`);
          }
        } catch (webpErr) {
          const workerFinishedAtMs = Date.now();
          attemptSummary.worker = {
            attempted: true,
            error: (webpErr as Error).message,
            startedAtMs: attemptSummary.worker?.startedAtMs,
            finishedAtMs: workerFinishedAtMs,
            durationMs: attemptSummary.worker?.startedAtMs ? workerFinishedAtMs - attemptSummary.worker.startedAtMs : undefined,
            failureCategory: classifyErrorMessage(webpErr),
          };
          if (isDebugOptimizationEnabled()) {
            debugOptimizationLog(`optimizeImage animated webp worker failed, trying ffmpeg/sharp fallback: ${(webpErr as Error).message}`);
          }
        }

          const ffmpegResized = await this.resizeAnimatedWithFfmpeg(imageData, '.webp', imageType);
          attemptSummary.ffmpeg = ffmpegResized.attempt;
          if (ffmpegResized.data != null) {
            if (isDebugOptimizationEnabled()) {
              debugOptimizationLog(`optimizeImage animated webp ffmpeg fallback success outBytes=${ffmpegResized.data.length}`);
            }
            if (bestData == null || ffmpegResized.data.length < bestData.length) {
              bestData = ffmpegResized.data;
              bestPath = 'ffmpeg';
            }
          }

          const sharpStartedAtMs = Date.now();
          try {
            attemptSummary.sharp = { attempted: true, startedAtMs: sharpStartedAtMs };
            const sharpResized = await this.resizeAnimatedWebpWithSharp(imageData, imageType);
            attemptSummary.sharp.finishedAtMs = Date.now();
            attemptSummary.sharp.durationMs = attemptSummary.sharp.finishedAtMs - sharpStartedAtMs;
            if (sharpResized != null) {
              attemptSummary.sharp.outBytes = sharpResized.length;
              if (isDebugOptimizationEnabled()) {
                debugOptimizationLog(`optimizeImage animated webp sharp fallback success outBytes=${sharpResized.length}`);
              }
              if (bestData == null || sharpResized.length < bestData.length) {
                bestData = sharpResized;
                bestPath = 'sharp';
              }
            } else {
              attemptSummary.sharp.error = 'no-result';
              attemptSummary.sharp.failureCategory = 'no-result';
            }
          } catch (sharpError) {
            const sharpFinishedAtMs = Date.now();
            attemptSummary.sharp = {
              attempted: true,
              startedAtMs: sharpStartedAtMs,
              finishedAtMs: sharpFinishedAtMs,
              durationMs: sharpFinishedAtMs - sharpStartedAtMs,
              error: sharpError instanceof Error ? sharpError.message : String(sharpError),
              failureCategory: classifyErrorMessage(sharpError),
            };
          }

          if (bestData != null && bestData.length < imageData.length) {
            attemptSummary.selectedPath = bestPath ?? 'worker';
            attemptSummary.totalDurationMs = Date.now() - startedAtMs;
            return { data: bestData, ext: '.webp', decisionReason: `${attemptSummary.selectedPath}_smaller`, attemptSummary };
          }

          if (isDebugOptimizationEnabled()) {
            debugOptimizationLog('optimizeImage animated webp fallback original (no smaller ffmpeg/sharp result)');
          }
          attemptSummary.selectedPath = 'original';
          attemptSummary.totalDurationMs = Date.now() - startedAtMs;
          return { data: imageData, ext: '.webp', decisionReason: 'no-gain-keep-original', attemptSummary };
      }
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`optimizeImage ffmpeg contentFormat=${contentFormat}`);
      const ffmpegResized = await this.resizeAnimatedWithFfmpeg(imageData, contentFormat, imageType);
      attemptSummary.ffmpeg = ffmpegResized.attempt;
      attemptSummary.selectedPath = ffmpegResized.data && ffmpegResized.data.length < imageData.length ? 'ffmpeg' : 'original';
      attemptSummary.totalDurationMs = Date.now() - startedAtMs;
      return {
        data: ffmpegResized.data ?? imageData,
        ext: contentFormat,
        decisionReason: attemptSummary.selectedPath === 'ffmpeg' ? 'ffmpeg_smaller' : 'ffmpeg_no_gain_or_failed',
        attemptSummary,
      };
    }
    const ext = sourceExt.toLowerCase();
    if (ext === '.gif' || ext === '.webm') {
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`optimizeImage ffmpeg ext=${ext}`);
      const ffmpegResized = await this.resizeAnimatedWithFfmpeg(imageData, sourceExt, imageType);
      attemptSummary.ffmpeg = ffmpegResized.attempt;
      attemptSummary.selectedPath = ffmpegResized.data && ffmpegResized.data.length < imageData.length ? 'ffmpeg' : 'original';
      attemptSummary.totalDurationMs = Date.now() - startedAtMs;
      return {
        data: ffmpegResized.data ?? imageData,
        ext: sourceExt,
        decisionReason: attemptSummary.selectedPath === 'ffmpeg' ? 'ffmpeg_smaller' : 'ffmpeg_no_gain_or_failed',
        attemptSummary,
      };
    }
    try {
      if (isDebugOptimizationEnabled()) debugOptimizationLog('optimizeImage worker mode=static');
      const workerStartedAtMs = Date.now();
      attemptSummary.worker = { attempted: true, startedAtMs: workerStartedAtMs };
      const { data, ext: outExt } = await optimizeInWorker(imageData, imageType, sourceExt, 'static');
      attemptSummary.worker.outBytes = data.length;
      attemptSummary.worker.finishedAtMs = Date.now();
      attemptSummary.worker.durationMs = attemptSummary.worker.finishedAtMs - workerStartedAtMs;
      attemptSummary.selectedPath = data.length < imageData.length ? 'worker' : 'original';
      attemptSummary.totalDurationMs = Date.now() - startedAtMs;
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`optimizeImage worker done outBytes=${data.length} ext=${outExt}`);
      return {
        data,
        ext: outExt,
        decisionReason: attemptSummary.selectedPath === 'worker' ? 'worker_smaller' : 'worker_no_gain_keep_result',
        attemptSummary,
      };
    } catch (workerErr) {
      // Do not fall back to main-thread Sharp: it blocks the event loop and causes "app not responding"
      // when the user clicks. Store original so the app stays responsive.
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`optimizeImage worker failed, store original: ${(workerErr as Error).message}`);
      console.warn('[ImageCache] Worker unavailable or failed, storing original (no resize):', (workerErr as Error).message);
      const workerFinishedAtMs = Date.now();
      attemptSummary.worker = {
        attempted: true,
        error: (workerErr as Error).message,
        startedAtMs: attemptSummary.worker?.startedAtMs,
        finishedAtMs: workerFinishedAtMs,
        durationMs: attemptSummary.worker?.startedAtMs ? workerFinishedAtMs - attemptSummary.worker.startedAtMs : undefined,
        failureCategory: classifyErrorMessage(workerErr),
      };
      attemptSummary.selectedPath = 'original';
      attemptSummary.totalDurationMs = Date.now() - startedAtMs;
      return {
        data: imageData,
        ext: sourceExt.startsWith('.') ? sourceExt : `.${sourceExt}`,
        decisionReason: 'worker_failed_store_original',
        attemptSummary,
      };
    }
  }

  /**
   * Cache an image from a URL
   * Returns the local file path if successful, or the original URL if caching fails.
   * Optional onProgress is called with 'downloading' before fetch/read and 'optimizing' before optimize.
   */
  async cacheImage(
    url: string,
    gameId: string,
    imageType: 'boxart' | 'banner' | 'logo' | 'hero' | string,
    onProgress?: (
      phase: 'downloading' | 'optimizing' | 'done' | 'skipped',
      info?: {
        fileName?: string;
        originalBytes?: number;
        optimizedBytes?: number;
        decisionReason?: string;
        attemptSummary?: OptimizationAttemptSummary;
      }
    ) => void
  ): Promise<string> {
    try {
    if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage start gameId=${gameId} imageType=${imageType} url=${url.slice(0, 60)}...`);
    if (!url || url.trim() === '') {
      onProgress?.('skipped');
      return url;
    }

    // Handle onyx-local:// URLs - new simple format: onyx-local://{gameId}-{imageType}
    // Just verify the file exists in cache, if not return empty string to trigger re-download
    if (url.startsWith('onyx-local://')) {
      try {
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage onyx-local check gameId=${gameId} imageType=${imageType}`);
        // Extract gameId and imageType from URL: onyx-local://{gameId}-{imageType}
        const urlPath = url.replace(/^onyx-local:\/\/\/?/, '').replace(/\/+$/, '');
        const match = urlPath.match(/^([^-]+(?:-[^-]+)*?)-(boxart|banner|alternativeBanner|logo|hero|icon|screenshot-\d+)$/);

        if (match) {
          const gameIdFromUrl = match[1];
          const imageTypeFromUrl = match[2];

          // Check if file exists in cache
          this.ensureInitialized();
          const safeGameId = gameIdFromUrl.replace(/[<>:"/\\|?*]/g, '_');
          const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'];

          for (const ext of extensions) {
            const filename = `${safeGameId}-${imageTypeFromUrl}${ext}`;
            const filePath = path.join(this.cacheDir, filename);
            if (existsSync(filePath)) {
              onProgress?.('skipped', { fileName: filename });
              if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage onyx-local return gameId=${gameId} imageType=${imageType} found=true`);
              return url;
            }
          }

          if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage onyx-local return gameId=${gameId} imageType=${imageType} found=false`);
          console.warn(`[ImageCache] onyx-local file not found: ${safeGameId}-${imageTypeFromUrl}`);
          onProgress?.('skipped');
          return '';
        } else {
          // Old format URL - try to find the file and convert to new format
          console.warn(`[ImageCache] Old format URL detected: ${url.substring(0, 50)}...`);

          // Try to extract gameId from the URL or use the provided gameId
          // Old format might be encoded or have different structure
          this.ensureInitialized();
          const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
          const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'];

          // Try to find the file with the provided gameId
          for (const ext of extensions) {
            const filename = `${safeGameId}-${imageType}${ext}`;
            const filePath = path.join(this.cacheDir, filename);
            if (existsSync(filePath)) {
              const newUrl = `onyx-local://${gameId}-${imageType}`;
              onProgress?.('skipped', { fileName: filename });
              if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage onyx-local old-format return gameId=${gameId} found=true`);
              console.log(`[ImageCache] Converted old format URL to new format: ${newUrl}`);
              return newUrl;
            }
          }

          if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage onyx-local old-format return gameId=${gameId} found=false`);
          console.warn(`[ImageCache] Old format URL file not found for ${safeGameId}-${imageType}`);
          onProgress?.('skipped');
          return '';
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage onyx-local catch gameId=${gameId} imageType=${imageType} error=${errMsg}`);
        console.error(`[ImageCache] Error processing onyx-local URL: ${url}`, e);
        onProgress?.('skipped');
        return '';
      }
    }

    try {
      this.ensureInitialized();

      // Handle file:// URLs by copying the file to cache
      if (url.startsWith('file://')) {
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage file:// start gameId=${gameId} imageType=${imageType}`);
        // Extract the file path from file:// URL
        let filePath = url.replace('file://', '');
        // Remove leading slash on Windows (file:///C:/path -> C:/path)
        if (process.platform === 'win32' && filePath.startsWith('/')) {
          filePath = filePath.substring(1);
        }
        // Decode URL encoding
        filePath = decodeURIComponent(filePath);

        // Check if source file exists
        if (!existsSync(filePath)) {
          console.warn(`Source file does not exist: ${filePath}`);
          onProgress?.('skipped', { fileName: path.basename(filePath) });
          return '';
        }

        const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
        const rawData = await fsPromises.readFile(filePath);
        const sourceExt = path.extname(filePath) || '.jpg';
        const sourceResolved = path.resolve(filePath);
        const normalizeForCompare = (value: string) =>
          process.platform === 'win32' ? value.toLowerCase() : value;

        // Delete old images for this game and image type before caching new one
        const { unlinkSync } = require('node:fs');
        const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'];
        for (const oldExt of extensions) {
          const oldFilename = `${safeGameId}-${imageType}${oldExt}`;
          const oldPath = path.join(this.cacheDir, oldFilename);
          const oldResolved = path.resolve(oldPath);
          if (normalizeForCompare(oldResolved) === normalizeForCompare(sourceResolved)) {
            continue;
          }
          if (existsSync(oldPath)) {
            try {
              unlinkSync(oldPath);
              console.log(`[ImageCache] Deleted old image: ${oldFilename}`);
            } catch (deleteError) {
              console.warn(`[ImageCache] Failed to delete old image ${oldFilename}:`, deleteError);
            }
          }
        }

        onProgress?.('downloading');
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage file gameId=${gameId} imageType=${imageType} sourceExt=${sourceExt} bytes=${rawData.length}`);
        onProgress?.('optimizing', { originalBytes: rawData.length });
        const { data: optimizedData, ext: outExt, decisionReason, attemptSummary } = await this.optimizeImage(rawData, imageType, sourceExt);
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage file done gameId=${gameId} imageType=${imageType} outBytes=${optimizedData.length}`);
        const outFilename = `${safeGameId}-${imageType}${outExt}`;
        const outPath = path.join(this.cacheDir, outFilename);

        if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage file writeStart gameId=${gameId} imageType=${imageType} outBytes=${optimizedData.length}`);
        console.log(`[ImageCache] Caching local image: ${filePath} -> ${outFilename}`);
        await fsPromises.writeFile(outPath, optimizedData);
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage file writeDone gameId=${gameId} imageType=${imageType}`);
        console.log(`[ImageCache] Cached local image: ${outFilename}`);

        onProgress?.('done', {
          fileName: outFilename,
          originalBytes: rawData.length,
          optimizedBytes: optimizedData.length,
          decisionReason,
          attemptSummary,
        });

        // Return simple URL format: onyx-local://{gameId}-{imageType}
        return `onyx-local://${safeGameId}-${imageType}`;
      }

      // Handle HTTP/HTTPS URLs by downloading
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage download start gameId=${gameId} imageType=${imageType} url=${url.slice(0, 50)}...`);
      const sourceExt = path.extname(new URL(url).pathname) || '.jpg';
      const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');

      // If we already have a cached file for this game+type, skip download
      const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'];
      for (const ext of extensions) {
        const filename = `${safeGameId}-${imageType}${ext}`;
        if (existsSync(path.join(this.cacheDir, filename))) {
          onProgress?.('skipped', { fileName: filename });
          return `onyx-local://${safeGameId}-${imageType}`;
        }
      }

      // Delete any old images for this game and image type (different extension from a previous run)
      const { unlinkSync } = require('node:fs');
      for (const oldExt of extensions) {
        const oldFilename = `${safeGameId}-${imageType}${oldExt}`;
        const oldPath = path.join(this.cacheDir, oldFilename);
        if (existsSync(oldPath)) {
          try {
            unlinkSync(oldPath);
            console.log(`[ImageCache] Deleted old image: ${oldFilename}`);
          } catch (deleteError) {
            console.warn(`[ImageCache] Failed to delete old image ${oldFilename}:`, deleteError);
          }
        }
      }

      // Download the image
      console.log(`[ImageCache] Downloading: ${url}`);
      onProgress?.('downloading');
      const imageData = await this.downloadImage(url);

      // Optimize (resize + compress) for faster load and smaller cache
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage download gameId=${gameId} imageType=${imageType} sourceExt=${sourceExt} bytes=${imageData.length}`);
      onProgress?.('optimizing', { originalBytes: imageData.length });
      const { data: optimizedData, ext: outExt, decisionReason, attemptSummary } = await this.optimizeImage(imageData, imageType, sourceExt);
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage download done gameId=${gameId} imageType=${imageType} outBytes=${optimizedData.length}`);
      const filename = `${safeGameId}-${imageType}${outExt}`;
      const localPath = path.join(this.cacheDir, filename);

      if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage download writeStart gameId=${gameId} imageType=${imageType} outBytes=${optimizedData.length}`);
      await fsPromises.writeFile(localPath, optimizedData);
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage download writeDone gameId=${gameId} imageType=${imageType}`);
      console.log(`[ImageCache] Cached: ${filename}`);

      onProgress?.('done', {
        fileName: filename,
        originalBytes: imageData.length,
        optimizedBytes: optimizedData.length,
        decisionReason,
        attemptSummary,
      });

      // Return simple URL format: onyx-local://{gameId}-{imageType}
      return `onyx-local://${safeGameId}-${imageType}`;
    } catch (error) {
      console.error(`Error caching image ${url}:`, error);
      // Return empty string if caching fails - don't return original URL
      // This prevents broken onyx-local URLs from being saved
      onProgress?.('skipped');
      return '';
    }
    } catch (outerErr) {
      const errMsg = outerErr instanceof Error ? outerErr.message : String(outerErr);
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImage outer catch gameId=${gameId} imageType=${imageType} error=${errMsg}`);
      console.error(`[ImageCache] cacheImage outer error:`, outerErr);
      onProgress?.('skipped');
      return '';
    }
  }

  /**
   * Cache multiple images. When onImageProgress is provided, images are processed sequentially
   * and progress is reported per image (downloading, optimizing, done).
   */
  async cacheImages(
    urls: { boxArtUrl?: string; bannerUrl?: string; alternativeBannerUrl?: string; logoUrl?: string; heroUrl?: string; iconUrl?: string; screenshots?: string[] },
    gameId: string,
    onImageProgress?: (data: {
      index: number;
      total: number;
      imageType: string;
      phase: 'downloading' | 'optimizing' | 'done' | 'skipped';
      fileName?: string;
      originalBytes?: number;
      optimizedBytes?: number;
      decisionReason?: string;
      attemptSummary?: OptimizationAttemptSummary;
    }) => void,
    shouldCancel?: () => boolean,
    optimizationPerformance: OptimizationPerformanceProfile = 'balanced',
    options?: { fromImporterQueue?: boolean }
  ): Promise<{ boxArtUrl?: string; bannerUrl?: string; alternativeBannerUrl?: string; logoUrl?: string; heroUrl?: string; iconUrl?: string; screenshots?: string[] }> {
    const results: { boxArtUrl?: string; bannerUrl?: string; alternativeBannerUrl?: string; logoUrl?: string; heroUrl?: string; iconUrl?: string; screenshots?: string[] } = {};
    const entries: { type: string; resultKey: keyof typeof results; url: string }[] = [];
    if (urls.boxArtUrl) entries.push({ type: 'boxart', resultKey: 'boxArtUrl', url: urls.boxArtUrl });
    if (urls.bannerUrl) entries.push({ type: 'banner', resultKey: 'bannerUrl', url: urls.bannerUrl });
    if (urls.alternativeBannerUrl) entries.push({ type: 'alternativeBanner', resultKey: 'alternativeBannerUrl', url: urls.alternativeBannerUrl });
    if (urls.logoUrl) entries.push({ type: 'logo', resultKey: 'logoUrl', url: urls.logoUrl });
    if (urls.heroUrl) entries.push({ type: 'hero', resultKey: 'heroUrl', url: urls.heroUrl });
    if (urls.iconUrl) entries.push({ type: 'icon', resultKey: 'iconUrl', url: urls.iconUrl });
    if (urls.screenshots?.length) {
      results.screenshots = [];
      urls.screenshots.forEach((url, index) => {
        entries.push({ type: `screenshot-${index}`, resultKey: 'screenshots', url });
      });
    }

    const total = entries.length;
    if (total === 0) return results;
    if (shouldCancel?.()) return results;

    if (onImageProgress) {
      // Process multiple images in parallel when reporting progress.
      // Prioritize static formats first, then defer animated formats until the end
      // to keep queue throughput high and avoid animated files dominating early workers.
      const limits = PROFILE_LIMITS[optimizationPerformance] ?? PROFILE_LIMITS.balanced;
      const detectedCores = cpus().length;
      const cpuCount = detectedCores > 0 ? detectedCores : 2;
      const availableWorkers = Math.max(1, cpuCount - limits.reserveCores);
      // When used from importer queue, one image at a time per game to avoid Sharp saturation
      const maxConcurrent = options?.fromImporterQueue
        ? 1
        : Math.max(1, Math.min(limits.maxImageWorkers, availableWorkers));

      const staticEntries: typeof entries = [];
      const deferredEntries: typeof entries = [];
      for (const e of entries) {
        const lower = e.url.toLowerCase();
        const isKnownStatic = /\.(jpg|jpeg|png|ico|avif)(\?|#|$)/.test(lower);
        if (isKnownStatic) {
          staticEntries.push(e);
        } else {
          deferredEntries.push(e);
        }
      }

      let staticIndex = 0;
      let deferredIndex = 0;
      let completedCount = 0;

      const runBatch = async (batchEntries: typeof entries, getNext: () => (typeof entries)[number] | undefined) => {
        if (batchEntries.length === 0) return;
        const workerCount = Math.min(maxConcurrent, batchEntries.length);
        const workers: Promise<void>[] = [];

        const runWorker = async () => {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            if (shouldCancel?.()) return;

            const entry = getNext();
            if (!entry) {
              return;
            }
            if (shouldCancel?.()) return;

            const { type, resultKey, url } = entry;
            const index = ++completedCount;
            if (isDebugOptimizationEnabled()) debugOptimizationLog(`cacheImages entry gameId=${gameId} imageType=${type} index=${index}/${total} urlPrefix=${url.slice(0, 40)}...`);

            const path = await this.cacheImage(
              url,
              gameId,
              type as 'boxart' | 'banner' | 'logo' | 'hero',
              (phase, info) => {
                onImageProgress({
                  index,
                  total,
                  imageType: type,
                  phase,
                  fileName: info?.fileName,
                  originalBytes: info?.originalBytes,
                  optimizedBytes: info?.optimizedBytes,
                  decisionReason: info?.decisionReason,
                  attemptSummary: info?.attemptSummary,
                });
              }
            );

            if (shouldCancel?.()) return;

            if (resultKey === 'screenshots' && path && results.screenshots) {
              results.screenshots.push(path);
            } else if (resultKey !== 'screenshots' && path) {
              (results as Record<string, string>)[resultKey] = path;
            }
            // Yield so IPC can run during long batches
            await new Promise<void>((resolve) => setImmediate(resolve));
          }
        };

        for (let i = 0; i < workerCount; i++) {
          workers.push(runWorker());
        }

        await Promise.all(workers);
      };

      // Strict per-game barrier: complete all static work before any deferred/animated starts.
      await runBatch(staticEntries, () => (staticIndex < staticEntries.length ? staticEntries[staticIndex++] : undefined));
      await runBatch(deferredEntries, () => (deferredIndex < deferredEntries.length ? deferredEntries[deferredIndex++] : undefined));

      return results;
    }

    await Promise.all(entries.map(async ({ type, resultKey, url }) => {
      if (shouldCancel?.()) return;
      const path = await this.cacheImage(url, gameId, type as 'boxart' | 'banner' | 'logo' | 'hero');
      if (shouldCancel?.()) return;
      if (resultKey === 'screenshots' && path && results.screenshots) {
        results.screenshots.push(path);
      } else if (resultKey !== 'screenshots') {
        (results as Record<string, string>)[resultKey] = path;
      }
    }));
    return results;
  }

  /**
   * Find a cached image file for a game and image type
   * Returns the onyx-local URL if found, null otherwise
   */
  async findCachedImage(gameId: string, imageType: 'boxart' | 'banner' | 'logo' | 'hero' | string): Promise<string | null> {
    try {
      this.ensureInitialized();
      const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
      const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'];

      for (const ext of extensions) {
        const filename = `${safeGameId}-${imageType}${ext}`;
        const filePath = path.join(this.cacheDir, filename);
        if (existsSync(filePath)) {
          // Return the onyx-local URL format
          return `onyx-local://${safeGameId}-${imageType}`;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error finding cached image for ${gameId}-${imageType}:`, error);
      return null;
    }
  }

  /**
   * Get the cache directory path
   */
  getCacheDir(): string {
    return this.cacheDir;
  }

  /**
   * List cache files that would be processed by optimizeExistingCache (for unified progress UI).
   */
  listFilesToOptimize(options?: { webpOnly?: boolean }): { file: string; gameId: string; imageType: string }[] {
    this.ensureInitialized();
    const { readdirSync } = require('node:fs');
    const files = readdirSync(this.cacheDir) as string[];
    const extList = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'];
    const typeSuffix = '(boxart|banner|alternativeBanner|logo|hero|icon|screenshot-\\d+)';
    const re = new RegExp(`^(.+)-${typeSuffix}\\.(jpg|jpeg|png|gif|webp|webm|ico|avif)$`, 'i');
    const out: { file: string; gameId: string; imageType: string }[] = [];
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!extList.includes(ext)) continue;
      const match = file.match(re);
      if (!match) continue;
      const sourceExt = '.' + match[3].toLowerCase();
      if (options?.webpOnly && sourceExt !== '.webp') continue;
      out.push({ file, gameId: match[1], imageType: match[2] });
    }
    return out;
  }

  /**
   * Optimize all existing cached images (resize + compress).
   * Optionally reports progress via onProgress({ phase, current, total, fileName, status?, originalBytes?, optimizedBytes? }).
   * When options.webpOnly is true, only .webp files are processed.
   */
  async optimizeExistingCache(
    onProgress?: (data: { phase: string; current: number; total: number; fileName: string; status?: string; originalBytes?: number; optimizedBytes?: number }) => void,
    options?: { webpOnly?: boolean; forceProcessOverBytes?: number; forceAnimatedWebp?: boolean; optimizationPerformance?: OptimizationPerformanceProfile }
  ): Promise<{ optimized: number; skipped: number; failed: number }> {
    const result = { optimized: 0, skipped: 0, failed: 0 };
    try {
      this.ensureInitialized();
      const { readdirSync } = require('node:fs');
      const files = readdirSync(this.cacheDir) as string[];
      const extList = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'];
      const typeSuffix = '(boxart|banner|alternativeBanner|logo|hero|icon|screenshot-\\d+)';
      const re = new RegExp(`^(.+)-${typeSuffix}\\.(jpg|jpeg|png|gif|webp|webm|ico|avif)$`, 'i');

      let toProcess: { file: string; gameId: string; imageType: string; sourceExt: string }[] = [];
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!extList.includes(ext)) continue;
        const match = file.match(re);
        if (!match) {
          result.skipped++;
          continue;
        }
        const sourceExt = '.' + match[3].toLowerCase();
        toProcess.push({
          file,
          gameId: match[1],
          imageType: match[2],
          sourceExt,
        });
      }
      if (options?.webpOnly) {
        toProcess = toProcess.filter((p) => p.sourceExt === '.webp');
      }

      const total = toProcess.length;
      onProgress?.({ phase: 'scan', current: 0, total, fileName: '' });
      if (total === 0) {
        return result;
      }

      const limits = PROFILE_LIMITS[options?.optimizationPerformance ?? 'balanced'] ?? PROFILE_LIMITS.balanced;
      const detectedCores = cpus().length;
      const cpuCount = detectedCores > 0 ? detectedCores : 2;
      const availableWorkers = Math.max(1, cpuCount - limits.reserveCores);
      const maxConcurrent = Math.max(1, Math.min(limits.maxImageWorkers, availableWorkers));

      const groups = Array.from(
        toProcess.reduce((map, entry) => {
          const key = `${entry.gameId}:${entry.imageType}`;
          const bucket = map.get(key);
          if (bucket) {
            bucket.push(entry);
          } else {
            map.set(key, [entry]);
          }
          return map;
        }, new Map<string, typeof toProcess>())
      ).map(([, entries]) => entries);

      let nextGroupIndex = 0;
      let startedCount = 0;

      const runWorker = async () => {
        while (nextGroupIndex < groups.length) {
          const group = groups[nextGroupIndex++];
          for (const entry of group) {
            const { file, gameId, imageType, sourceExt } = entry;
            const current = ++startedCount;
            onProgress?.({ phase: 'optimize', current, total, fileName: file, status: 'processing' });
            const filePath = path.join(this.cacheDir, file);
            try {
              const stat = statSync(filePath);
              const skipThreshold = sourceExt === '.webp'
                ? OPTIMIZE_EXISTING_WEBP_SKIP_OVER_BYTES
                : OPTIMIZE_EXISTING_SKIP_OVER_BYTES;
              const forceProcessOverBytes = options?.forceProcessOverBytes ?? 0;
              const shouldForceProcess = sourceExt === '.webp' && forceProcessOverBytes > 0 && stat.size > forceProcessOverBytes;
              const shouldForceAnimatedWebp = sourceExt === '.webp' && options?.forceAnimatedWebp === true;
              if (stat.size > skipThreshold && !shouldForceProcess) {
                result.skipped++;
                onProgress?.({ phase: 'optimize', current, total, fileName: file, status: 'skipped (too large)' });
                continue;
              }
              const rawData = await fsPromises.readFile(filePath);
              let { data: optimizedData, ext: outExt } = await this.optimizeImage(rawData, imageType, sourceExt, {
                forceAnimatedWebp: shouldForceAnimatedWebp,
              });

              if ((shouldForceProcess || shouldForceAnimatedWebp) && sourceExt === '.webp') {
                const forceTargetBytes = Math.max(1, options?.forceProcessOverBytes ?? FORCED_OVERSIZED_WEBP_TARGET_BYTES);
                const needsAggressivePass = optimizedData.length >= rawData.length || optimizedData.length > forceTargetBytes;
                if (needsAggressivePass) {
                  const aggressiveSharp = await this.aggressivelyRecompressOversizedWebp(rawData, imageType, forceTargetBytes);
                  const aggressiveFfmpeg = await this.aggressivelyRecompressOversizedWebpWithFfmpeg(rawData, imageType, forceTargetBytes);

                  const aggressiveCandidates = [aggressiveSharp, aggressiveFfmpeg]
                    .filter((candidate): candidate is Buffer => candidate != null)
                    .sort((a, b) => a.length - b.length);

                  const bestAggressive = aggressiveCandidates[0];
                  if (bestAggressive != null && bestAggressive.length < optimizedData.length) {
                    optimizedData = bestAggressive;
                    outExt = '.webp';
                  }
                }
              }

              const noSizeGain = optimizedData.length >= rawData.length;
              const sameExt = outExt.toLowerCase() === sourceExt.toLowerCase();
              if (shouldForceProcess && sourceExt === '.webp' && optimizedData.length >= rawData.length) {
                if (shouldForceAnimatedWebp) {
                  result.optimized++;
                  onProgress?.({
                    phase: 'optimize',
                    current,
                    total,
                    fileName: file,
                    status: 'ok',
                    originalBytes: rawData.length,
                    optimizedBytes: optimizedData.length,
                  });
                  continue;
                }
                result.failed++;
                onProgress?.({
                  phase: 'optimize',
                  current,
                  total,
                  fileName: file,
                  status: 'fail (cannot reduce oversized webp)',
                  originalBytes: rawData.length,
                  optimizedBytes: optimizedData.length,
                });
                continue;
              }
              if (noSizeGain && sameExt) {
                if (shouldForceAnimatedWebp) {
                  result.optimized++;
                  onProgress?.({
                    phase: 'optimize',
                    current,
                    total,
                    fileName: file,
                    status: 'ok',
                    originalBytes: rawData.length,
                    optimizedBytes: optimizedData.length,
                  });
                  continue;
                }
                result.skipped++;
                onProgress?.({
                  phase: 'optimize',
                  current,
                  total,
                  fileName: file,
                  status: 'skipped (no gain)',
                  originalBytes: rawData.length,
                  optimizedBytes: optimizedData.length,
                });
                continue;
              }
              const outFilename = `${gameId}-${imageType}${outExt}`;
              const outPath = path.join(this.cacheDir, outFilename);

              if (outPath !== filePath) {
                if (existsSync(outPath)) await fsPromises.unlink(outPath);
                await fsPromises.unlink(filePath);
              }
              await fsPromises.writeFile(outPath, optimizedData);
              result.optimized++;
              onProgress?.({ phase: 'optimize', current, total, fileName: file, status: 'ok', originalBytes: rawData.length, optimizedBytes: optimizedData.length });
            } catch (err) {
              console.warn(`[ImageCache] Optimize failed for ${file}:`, (err as Error).message);
              if (sourceExt === '.webp' && options?.forceAnimatedWebp === true) {
                try {
                  const rawData = await fsPromises.readFile(filePath);
                  result.optimized++;
                  onProgress?.({
                    phase: 'optimize',
                    current,
                    total,
                    fileName: file,
                    status: 'ok',
                    originalBytes: rawData.length,
                    optimizedBytes: rawData.length,
                  });
                  continue;
                } catch {
                  // fall through to failed when source file cannot be read
                }
              }
              result.failed++;
              onProgress?.({ phase: 'optimize', current, total, fileName: file, status: 'fail' });
            }
          }
        }
      };

      const workerCount = Math.min(maxConcurrent, groups.length);
      await Promise.all(
        Array.from({ length: workerCount }, () => runWorker())
      );

      if (result.optimized > 0 || result.failed > 0) {
        console.log(`[ImageCache] Optimize existing: ${result.optimized} optimized, ${result.skipped} skipped, ${result.failed} failed`);
      }
      return result;
    } catch (error) {
      console.error('[ImageCache] Error optimizing existing cache:', error);
      throw error;
    }
  }

  /**
   * Delete cached image for a specific game and image type
   */
  async deleteCachedImage(gameId: string, imageType: 'boxart' | 'banner' | 'logo' | 'hero' | string): Promise<void> {
    try {
      this.ensureInitialized();
      const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
      const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'];

      for (const ext of extensions) {
        const filename = `${safeGameId}-${imageType}${ext}`;
        const filePath = path.join(this.cacheDir, filename);
        if (existsSync(filePath)) {
          const { unlinkSync } = require('node:fs');
          unlinkSync(filePath);
          console.log(`[ImageCache] Deleted cached image: ${filename}`);
        }
      }
    } catch (error) {
      console.error(`Error deleting cached image for ${gameId}-${imageType}:`, error);
      // Don't throw - deletion is best effort
    }
  }

  /**
   * Delete ALL cached images for a game (all image types)
   * Used when a game is deleted from the library
   */
  async deleteAllGameImages(gameId: string): Promise<void> {
    try {
      this.ensureInitialized();
      const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
      const { readdirSync, unlinkSync } = require('node:fs');
      const files = readdirSync(this.cacheDir) as string[];
      const prefix = `${safeGameId}-`;
      let deletedCount = 0;

      for (const file of files) {
        if (file.startsWith(prefix)) {
          try {
            unlinkSync(path.join(this.cacheDir, file));
            deletedCount++;
          } catch (e) {
            // Best effort
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`[ImageCache] Deleted ${deletedCount} cached images for game: ${gameId}`);
      }
    } catch (error) {
      console.error(`Error deleting all cached images for ${gameId}:`, error);
      // Don't throw - deletion is best effort
    }
  }

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    try {
      if (existsSync(this.cacheDir)) {
        const { readdirSync, unlinkSync } = require('node:fs');
        const files = readdirSync(this.cacheDir);
        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm'].includes(ext)) {
            unlinkSync(path.join(this.cacheDir, file));
          }
        }
        this.initialized = false;
      }
    } catch (error) {
      console.error('Error clearing image cache:', error);
      throw error;
    }
  }

  /**
   * Check if FFmpeg is available (bundled or on PATH). Used for Settings UI.
   */
  static getFfmpegStatus(): { available: boolean; source: 'bundled' | 'system' | null } {
    try {
      const { path: ffmpegPath, source } = getFfmpegPath();
      const result = spawnSync(ffmpegPath, ['-version'], { encoding: 'utf8', timeout: 5000, windowsHide: true });
      return { available: result.status === 0, source };
    } catch {
      return { available: false, source: null };
    }
  }

  /** Full FFmpeg diagnostics for optimization debug report exports. */
  static getFfmpegDiagnostics(): { path: string; available: boolean; source: 'bundled' | 'system' | null } {
    try {
      const { path: ffmpegPath, source } = getFfmpegPath();
      const result = spawnSync(ffmpegPath, ['-version'], { encoding: 'utf8', timeout: 5000, windowsHide: true });
      return { path: ffmpegPath, available: result.status === 0, source };
    } catch {
      return { path: 'ffmpeg', available: false, source: null };
    }
  }

  static getSharpDiagnostics(): {
    appPath: string;
    unpackedAppPath: string;
    unpackedNodeModulesPath: string;
    sharpResolvedPath: string | null;
    sharpLoadable: boolean;
    sharpLoadError: string | null;
    dependencyChecks: Array<{ moduleId: string; resolvedPath: string | null; loadable: boolean; error: string | null }>;
    unpackedPresence: {
      sharp: boolean;
      semver: boolean;
      detectLibc: boolean;
      img: boolean;
    };
  } {
    const appPath = app.getAppPath();
    const unpackedAppPath = appPath.replace(/app\.asar([/\\]?)/g, 'app.asar.unpacked$1');
    const unpackedNodeModulesPath = path.join(unpackedAppPath, 'node_modules');
    const platformSharpPackage = process.platform === 'win32'
      ? `@img/sharp-win32-${process.arch}`
      : process.platform === 'darwin'
        ? `@img/sharp-darwin-${process.arch}`
        : `@img/sharp-${process.platform}-${process.arch}`;

    const modulesToCheck = ['sharp', 'semver/functions/coerce', 'detect-libc', platformSharpPackage];
    const dependencyChecks = modulesToCheck.map((moduleId) => {
      try {
        const resolvedPath = runtimeRequire.resolve(moduleId);
        try {
          runtimeRequire(moduleId);
          return { moduleId, resolvedPath, loadable: true, error: null };
        } catch (loadError) {
          return {
            moduleId,
            resolvedPath,
            loadable: false,
            error: loadError instanceof Error ? loadError.message : String(loadError),
          };
        }
      } catch (resolveError) {
        return {
          moduleId,
          resolvedPath: null,
          loadable: false,
          error: resolveError instanceof Error ? resolveError.message : String(resolveError),
        };
      }
    });

    let sharpResolvedPath: string | null = null;
    let sharpLoadable = false;
    let sharpLoadError: string | null = null;
    try {
      sharpResolvedPath = runtimeRequire.resolve('sharp');
      runtimeRequire('sharp');
      sharpLoadable = true;
    } catch (error) {
      sharpLoadable = false;
      sharpLoadError = error instanceof Error ? error.message : String(error);
    }

    return {
      appPath,
      unpackedAppPath,
      unpackedNodeModulesPath,
      sharpResolvedPath,
      sharpLoadable,
      sharpLoadError,
      dependencyChecks,
      unpackedPresence: {
        sharp: existsSync(path.join(unpackedNodeModulesPath, 'sharp')),
        semver: existsSync(path.join(unpackedNodeModulesPath, 'semver')) || existsSync(path.join(unpackedNodeModulesPath, 'sharp', 'node_modules', 'semver')),
        detectLibc: existsSync(path.join(unpackedNodeModulesPath, 'detect-libc')),
        img: existsSync(path.join(unpackedNodeModulesPath, '@img')),
      },
    };
  }
}
