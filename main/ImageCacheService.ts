import { app } from 'electron';
import path from 'node:path';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';

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
    // Store images in userData/cache/images
    this.cacheDir = path.join(app.getPath('userData'), 'cache', 'images');
  }

  /**
   * Initialize the cache directory
   */
  private ensureInitialized(): void {
    if (this.initialized) return;
    
    try {
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true });
      }
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing image cache directory:', error);
      throw error;
    }
  }

  /**
   * Get a safe filename from a URL
   */
  private getFilenameFromUrl(url: string, gameId: string, imageType: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const ext = path.extname(pathname) || '.jpg';
      
      // Create a hash-like filename from the URL
      const urlHash = Buffer.from(url).toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 16);
      
      // Format: gameId-imageType-hash.ext
      return `${gameId}-${imageType}-${urlHash}${ext}`;
    } catch (error) {
      // Fallback if URL parsing fails
      const urlHash = Buffer.from(url).toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 16);
      return `${gameId}-${imageType}-${urlHash}.jpg`;
    }
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

    // Skip if already a local file path
    if (url.startsWith('file://') || url.startsWith('onyx-local:')) {
      return url;
    }

    try {
      this.ensureInitialized();

      const filename = this.getFilenameFromUrl(url, gameId, imageType);
      const localPath = path.join(this.cacheDir, filename);

      // Check if already cached
      if (existsSync(localPath)) {
        // Return local file URL (encode the path for the protocol handler)
        return `onyx-local://${encodeURIComponent(localPath)}`;
      }

      // Download the image
      console.log(`Downloading image: ${url} -> ${localPath}`);
      const imageData = await this.downloadImage(url);

      // Save to disk
      writeFileSync(localPath, imageData);
      console.log(`Cached image: ${localPath}`);

      // Return local file URL (encode the path for the protocol handler)
      return `onyx-local://${encodeURIComponent(localPath)}`;
    } catch (error) {
      console.error(`Error caching image ${url}:`, error);
      // Return original URL if caching fails
      return url;
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
   * Get the cache directory path
   */
  getCacheDir(): string {
    return this.cacheDir;
  }

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    try {
      if (existsSync(this.cacheDir)) {
        const { readdirSync, unlinkSync, rmdirSync } = await import('node:fs');
        const files = readdirSync(this.cacheDir);
        for (const file of files) {
          unlinkSync(path.join(this.cacheDir, file));
        }
        rmdirSync(this.cacheDir);
        this.initialized = false;
      }
    } catch (error) {
      console.error('Error clearing image cache:', error);
      throw error;
    }
  }
}
