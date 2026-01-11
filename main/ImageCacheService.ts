import { app } from 'electron';
import path from 'node:path';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import { homedir } from 'node:os';

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
    if (process.platform === 'win32') {
      // Windows: Use AppData\Local\onyx-launcher\images
      // This is typically C:\Users\<user>\AppData\Local\onyx-launcher\images
      const localAppData = process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local');
      this.cacheDir = path.join(localAppData, 'onyx-launcher', 'images');
    } else if (process.platform === 'darwin') {
      // macOS: Use ~/Library/Caches/onyx-launcher/images
      this.cacheDir = path.join(homedir(), 'Library', 'Caches', 'onyx-launcher', 'images');
    } else {
      // Linux: Use ~/.cache/onyx-launcher/images
      this.cacheDir = path.join(homedir(), '.cache', 'onyx-launcher', 'images');
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
   * Cache an image from a URL
   * Returns the local file path if successful, or the original URL if caching fails
   */
  async cacheImage(url: string, gameId: string, imageType: 'boxart' | 'banner' | 'logo' | 'hero'): Promise<string> {
    if (!url || url.trim() === '') {
      return url;
    }

    // Handle onyx-local:// URLs - new simple format: onyx-local://{gameId}-{imageType}
    // Just verify the file exists in cache, if not return empty string to trigger re-download
    if (url.startsWith('onyx-local://')) {
      try {
        // Extract gameId and imageType from URL: onyx-local://{gameId}-{imageType}
        const urlPath = url.replace('onyx-local://', '').replace('onyx-local:///', '');
        const match = urlPath.match(/^([^-]+(?:-[^-]+)*?)-(boxart|banner|logo|hero)$/);
        
        if (match) {
          const gameIdFromUrl = match[1];
          const imageTypeFromUrl = match[2];
          
          // Check if file exists in cache
          this.ensureInitialized();
          const safeGameId = gameIdFromUrl.replace(/[<>:"/\\|?*]/g, '_');
          const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm'];
          
          for (const ext of extensions) {
            const filename = `${safeGameId}-${imageTypeFromUrl}${ext}`;
            const filePath = path.join(this.cacheDir, filename);
            if (existsSync(filePath)) {
              // File exists, return URL as-is
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
          const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm'];
          
          // Try to find the file with the provided gameId
          for (const ext of extensions) {
            const filename = `${safeGameId}-${imageType}${ext}`;
            const filePath = path.join(this.cacheDir, filename);
            if (existsSync(filePath)) {
              // File exists! Convert to new format URL
              const newUrl = `onyx-local://${gameId}-${imageType}`;
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

        // Use simple, predictable filename format: {gameId}-{imageType}.{ext}
        // Same format as HTTP/HTTPS URLs for consistency
        const ext = path.extname(filePath) || '.jpg';
        const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
        const filename = `${safeGameId}-${imageType}${ext}`;
        const localPath = path.join(this.cacheDir, filename);

        // Delete old images for this game and image type before caching new one
        // This ensures we don't have stale images with different extensions
        const { unlinkSync } = require('node:fs');
        const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm'];
        for (const oldExt of extensions) {
          const oldFilename = `${safeGameId}-${imageType}${oldExt}`;
          const oldPath = path.join(this.cacheDir, oldFilename);
          if (existsSync(oldPath) && oldPath !== localPath) {
            try {
              unlinkSync(oldPath);
              console.log(`[ImageCache] Deleted old image: ${oldFilename}`);
            } catch (deleteError) {
              console.warn(`[ImageCache] Failed to delete old image ${oldFilename}:`, deleteError);
            }
          }
        }

        // Check if already cached (after cleanup)
        if (existsSync(localPath)) {
          // Return simple URL format: onyx-local://{gameId}-{imageType}
          // Protocol handler will construct the path from this
          return `onyx-local://${safeGameId}-${imageType}`;
        }

        // Copy file to cache
        console.log(`[ImageCache] Copying local image: ${filePath} -> ${filename}`);
        const imageData = readFileSync(filePath);
        writeFileSync(localPath, imageData);
        console.log(`[ImageCache] Cached local image: ${filename}`);

        // Return simple URL format: onyx-local://{gameId}-{imageType}
        return `onyx-local://${safeGameId}-${imageType}`;
      }

      // Handle HTTP/HTTPS URLs by downloading
      // Use simple, predictable filename: {gameId}-{imageType}.{ext}
      const ext = path.extname(new URL(url).pathname) || '.jpg';
      const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
      const filename = `${safeGameId}-${imageType}${ext}`;
      const localPath = path.join(this.cacheDir, filename);

      // Delete old images for this game and image type before caching new one
      // This ensures we don't have stale images with different extensions
      const { unlinkSync } = require('node:fs');
      const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm'];
      for (const oldExt of extensions) {
        const oldFilename = `${safeGameId}-${imageType}${oldExt}`;
        const oldPath = path.join(this.cacheDir, oldFilename);
        if (existsSync(oldPath) && oldPath !== localPath) {
          try {
            unlinkSync(oldPath);
            console.log(`[ImageCache] Deleted old image: ${oldFilename}`);
          } catch (deleteError) {
            console.warn(`[ImageCache] Failed to delete old image ${oldFilename}:`, deleteError);
          }
        }
      }

      // Check if already cached (after cleanup)
      if (existsSync(localPath)) {
        // Return simple URL format: onyx-local://{gameId}-{imageType}
        // Protocol handler will construct the path from this
        return `onyx-local://${safeGameId}-${imageType}`;
      }

      // Download the image
      console.log(`[ImageCache] Downloading: ${url} -> ${filename}`);
      const imageData = await this.downloadImage(url);

      // Save to disk
      writeFileSync(localPath, imageData);
      console.log(`[ImageCache] Cached: ${filename}`);

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
   * Cache multiple images
   */
  async cacheImages(
    urls: { boxArtUrl?: string; bannerUrl?: string; logoUrl?: string; heroUrl?: string },
    gameId: string
  ): Promise<{ boxArtUrl?: string; bannerUrl?: string; logoUrl?: string; heroUrl?: string }> {
    const results: { boxArtUrl?: string; bannerUrl?: string; logoUrl?: string; heroUrl?: string } = {};

    const promises: Promise<void>[] = [];

    if (urls.boxArtUrl) {
      promises.push(
        this.cacheImage(urls.boxArtUrl, gameId, 'boxart').then((path) => {
          results.boxArtUrl = path;
        })
      );
    }

    if (urls.bannerUrl) {
      promises.push(
        this.cacheImage(urls.bannerUrl, gameId, 'banner').then((path) => {
          results.bannerUrl = path;
        })
      );
    }

    if (urls.logoUrl) {
      promises.push(
        this.cacheImage(urls.logoUrl, gameId, 'logo').then((path) => {
          results.logoUrl = path;
        })
      );
    }

    if (urls.heroUrl) {
      promises.push(
        this.cacheImage(urls.heroUrl, gameId, 'hero').then((path) => {
          results.heroUrl = path;
        })
      );
    }

    await Promise.all(promises);
    return results;
  }

  /**
   * Find a cached image file for a game and image type
   * Returns the onyx-local URL if found, null otherwise
   */
  async findCachedImage(gameId: string, imageType: 'boxart' | 'banner' | 'logo' | 'hero'): Promise<string | null> {
    try {
      this.ensureInitialized();
      const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
      const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm'];
      
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
   * Delete cached image for a specific game and image type
   */
  async deleteCachedImage(gameId: string, imageType: 'boxart' | 'banner' | 'logo' | 'hero'): Promise<void> {
    try {
      this.ensureInitialized();
      const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
      const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm'];
      
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
}
