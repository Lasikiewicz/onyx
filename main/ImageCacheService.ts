import { app } from 'electron';
import path from 'node:path';
import { mkdirSync, existsSync, writeFileSync, readFileSync, promises as fsPromises } from 'node:fs';
import { promisify } from 'node:util';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import { homedir, tmpdir, cpus } from 'node:os';
import { spawnSync } from 'node:child_process';

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
/** Quality for animated WebP when using Sharp (0–100, lossy). */
const WEBP_ANIMATED_QUALITY = 80;

/** Detect animated image format by magic bytes (URL extension can lie). */
function getAnimatedContentFormat(buffer: Buffer): '.gif' | '.webp' | '.webm' | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return '.gif'; // GIF87a / GIF89a
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return '.webp'; // RIFF....WEBP
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return '.webm'; // EBML
  return null;
}
const JPEG_QUALITY = 85;
const WEBP_QUALITY = 85;
const PNG_COMPRESSION = 6;

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

/**
 * Service for downloading and caching images locally
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
   * Returns resized buffer if smaller and multi-frame preserved, else null.
   */
  private async resizeAnimatedWebpWithSharp(
    imageData: Buffer,
    _imageType: string
  ): Promise<Buffer | null> {
    try {
      const sharp = (await import('sharp')).default;
      const out = await sharp(imageData, { animated: true, pages: -1, limitInputPixels: false })
        .webp({ quality: WEBP_ANIMATED_QUALITY, effort: 6 })
        .toBuffer();
      if (out.length >= imageData.length) return null;
      if (out.length < imageData.length * 0.15) return null;
      return out;
    } catch {
      return null;
    }
  }

  /**
   * Resize and compress animated image (GIF, WebM) with ffmpeg: scale to max dimension, cap framerate.
   * Returns resized buffer if smaller and ffmpeg succeeds, else null.
   * Animated WebP is skipped: FFmpeg cannot decode ANIM/ANMF chunks yet, so we keep originals.
   */
  private async resizeAnimatedWithFfmpeg(
    imageData: Buffer,
    sourceExt: string,
    imageType: string
  ): Promise<Buffer | null> {
    const ext = sourceExt.toLowerCase();
    if (ext === '.webp') {
      return null;
    }
    const maxDim = MAX_DIMENSION_BY_TYPE[imageType] ?? DEFAULT_MAX_DIMENSION;
    const base = `onyx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tmpDir = tmpdir();
    const inp = path.join(tmpDir, `${base}-in${ext}`);
    const outp = path.join(tmpDir, `${base}-out${ext}`);
    try {
      await fsPromises.writeFile(inp, imageData);
      const { path: ffmpegPath } = getFfmpegPath();
      const scale = `scale=min(${maxDim},iw):-2`;
      const vf = `fps=${ANIMATED_MAX_FPS},${scale}`;
      const args = ['-y', '-i', inp, '-vf', vf, outp];
      const result = spawnSync(ffmpegPath, args, {
        encoding: 'utf8',
        timeout: 60000,
        windowsHide: true,
      });
      if (result.status !== 0 || !existsSync(outp)) {
        if (result.status !== 0 && result.stderr) {
          console.warn('[ImageCache] FFmpeg failed:', result.stderr.slice(-500));
        }
        return null;
      }
      const outData = await fsPromises.readFile(outp);
      if (outData.length >= imageData.length) return null;
      return outData;
    } catch {
      return null;
    } finally {
      try {
        if (existsSync(inp)) await fsPromises.unlink(inp);
        if (existsSync(outp)) await fsPromises.unlink(outp);
      } catch { /* ignore */ }
    }
  }

  /**
   * Optimize image for cache: resize to display-friendly max dimensions and compress.
   * Animated formats (gif, webm, webp) are never passed to sharp; content is detected by magic bytes
   * so URLs with wrong extension (e.g. .jpg that returns WebP) don't get stripped.
   */
  private async optimizeImage(
    imageData: Buffer,
    imageType: string,
    sourceExt: string
  ): Promise<{ data: Buffer; ext: string }> {
    const contentFormat = getAnimatedContentFormat(imageData);
    if (contentFormat !== null) {
      if (contentFormat === '.webp') {
        const resized = await this.resizeAnimatedWebpWithSharp(imageData, imageType);
        return { data: resized ?? imageData, ext: '.webp' };
      }
      const resized = await this.resizeAnimatedWithFfmpeg(imageData, contentFormat, imageType);
      return { data: resized ?? imageData, ext: contentFormat };
    }
    const ext = sourceExt.toLowerCase();
    if (ext === '.webp') {
      const resized = await this.resizeAnimatedWebpWithSharp(imageData, imageType);
      return { data: resized ?? imageData, ext: '.webp' };
    }
    if (ext === '.gif' || ext === '.webm') {
      const resized = await this.resizeAnimatedWithFfmpeg(imageData, sourceExt, imageType);
      return { data: resized ?? imageData, ext: sourceExt };
    }
    try {
      const sharp = (await import('sharp')).default;
      const maxDim = MAX_DIMENSION_BY_TYPE[imageType] ?? DEFAULT_MAX_DIMENSION;
      let pipeline = sharp(imageData)
        .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
      if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
        return { data: await pipeline.toBuffer(), ext: '.jpg' };
      }
      if (ext === '.png') {
        pipeline = pipeline.png({ compressionLevel: PNG_COMPRESSION });
        return { data: await pipeline.toBuffer(), ext: '.png' };
      }
      if (ext === '.avif') {
        pipeline = pipeline.avif({ quality: Math.round(WEBP_QUALITY * 0.9) });
        return { data: await pipeline.toBuffer(), ext: '.avif' };
      }
      if (ext === '.ico') {
        return { data: imageData, ext: sourceExt };
      }
      return { data: imageData, ext: sourceExt };
    } catch (err) {
      console.warn('[ImageCache] Optimize failed, storing original:', (err as Error).message);
      return { data: imageData, ext: sourceExt };
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
      info?: { fileName?: string; originalBytes?: number; optimizedBytes?: number }
    ) => void
  ): Promise<string> {
    if (!url || url.trim() === '') {
      return url;
    }

    // Handle onyx-local:// URLs - new simple format: onyx-local://{gameId}-{imageType}
    // Just verify the file exists in cache, if not return empty string to trigger re-download
    if (url.startsWith('onyx-local://')) {
      try {
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
              // File exists - emit skipped and return URL
              onProgress?.('skipped', { fileName: filename });
              return url;
            }
          }

          // File doesn't exist - return empty string to trigger re-download
          console.warn(`[ImageCache] onyx-local file not found: ${safeGameId}-${imageTypeFromUrl}`);
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
              // File exists! Convert to new format URL
              const newUrl = `onyx-local://${gameId}-${imageType}`;
              onProgress?.('skipped', { fileName: filename });
              console.log(`[ImageCache] Converted old format URL to new format: ${newUrl}`);
              return newUrl;
            }
          }

          // File not found - return empty to trigger re-download
          console.warn(`[ImageCache] Old format URL file not found for ${safeGameId}-${imageType}`);
          return '';
        }
      } catch (e) {
        console.error(`[ImageCache] Error processing onyx-local URL: ${url}`, e);
        return '';
      }
    }

    try {
      this.ensureInitialized();

      // Handle file:// URLs by copying the file to cache
      if (url.startsWith('file://')) {
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
          return url;
        }

        const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');

        // Delete old images for this game and image type before caching new one
        const { unlinkSync } = require('node:fs');
        const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'];
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

        onProgress?.('downloading');
        const rawData = await fsPromises.readFile(filePath);
        const sourceExt = path.extname(filePath) || '.jpg';
        onProgress?.('optimizing', { originalBytes: rawData.length });
        const { data: optimizedData, ext: outExt } = await this.optimizeImage(rawData, imageType, sourceExt);
        const outFilename = `${safeGameId}-${imageType}${outExt}`;
        const outPath = path.join(this.cacheDir, outFilename);

        console.log(`[ImageCache] Caching local image: ${filePath} -> ${outFilename}`);
        await fsPromises.writeFile(outPath, optimizedData);
        console.log(`[ImageCache] Cached local image: ${outFilename}`);

        onProgress?.('done', {
          fileName: outFilename,
          originalBytes: rawData.length,
          optimizedBytes: optimizedData.length,
        });

        // Return simple URL format: onyx-local://{gameId}-{imageType}
        return `onyx-local://${safeGameId}-${imageType}`;
      }

      // Handle HTTP/HTTPS URLs by downloading
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
      onProgress?.('optimizing', { originalBytes: imageData.length });
      const { data: optimizedData, ext: outExt } = await this.optimizeImage(imageData, imageType, sourceExt);
      const filename = `${safeGameId}-${imageType}${outExt}`;
      const localPath = path.join(this.cacheDir, filename);

      await fsPromises.writeFile(localPath, optimizedData);
      console.log(`[ImageCache] Cached: ${filename}`);

      onProgress?.('done', {
        fileName: filename,
        originalBytes: imageData.length,
        optimizedBytes: optimizedData.length,
      });

      // Return simple URL format: onyx-local://{gameId}-{imageType}
      return `onyx-local://${safeGameId}-${imageType}`;
    } catch (error) {
      console.error(`Error caching image ${url}:`, error);
      // Return empty string if caching fails - don't return original URL
      // This prevents broken onyx-local URLs from being saved
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
    }) => void,
    shouldCancel?: () => boolean,
    optimizationPerformance: OptimizationPerformanceProfile = 'balanced'
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
      const cpuCount = cpus().length || 2;
      const availableWorkers = Math.max(1, cpuCount - limits.reserveCores);
      const maxConcurrent = Math.max(1, Math.min(limits.maxImageWorkers, availableWorkers));

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
                });
              }
            );

            if (shouldCancel?.()) return;

            if (resultKey === 'screenshots' && path && results.screenshots) {
              results.screenshots.push(path);
            } else if (resultKey !== 'screenshots' && path) {
              (results as Record<string, string>)[resultKey] = path;
            }
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
    options?: { webpOnly?: boolean; optimizationPerformance?: OptimizationPerformanceProfile }
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
        toProcess.push({
          file,
          gameId: match[1],
          imageType: match[2],
          sourceExt: '.' + match[3].toLowerCase(),
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
      const cpuCount = cpus().length || 2;
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
              const rawData = await fsPromises.readFile(filePath);
              const { data: optimizedData, ext: outExt } = await this.optimizeImage(rawData, imageType, sourceExt);
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
}
