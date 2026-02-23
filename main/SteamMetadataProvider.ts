import { SteamService, SteamGame } from './SteamService.js';
import { MetadataProvider, GameSearchResult, GameArtwork, GameInstallInfo } from './MetadataProvider.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Steam Metadata Provider
 * Provides artwork from Steam CDN and install information
 */
export class SteamMetadataProvider implements MetadataProvider {
  readonly name = 'steam';
  private steamService: SteamService | null = null;

  // Rate limiting for Steam Store API
  private requestQueue: Array<{ execute: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private processingQueue = false;
  private lastRequestTime = 0;
  private activeRequests = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests to avoid rate limiting
  private readonly MAX_CONCURRENT_REQUESTS = 1; // Only one request at a time for Steam Store API

  constructor(steamService: SteamService | null) {
    this.steamService = steamService;
  }

  isAvailable(): boolean {
    return this.steamService !== null;
  }

  /**
   * Queue a request with rate limiting
   */
  private async queueRequest<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.requestQueue.push({ execute, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      // Wait if we have too many concurrent requests
      while (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Ensure minimum interval between requests (2 seconds to avoid rate limiting)
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }

      const request = this.requestQueue.shift();
      if (!request) break;

      this.lastRequestTime = Date.now();
      this.activeRequests++;

      request
        .execute()
        .then(result => {
          this.activeRequests--;
          request.resolve(result);
          this.processQueue();
        })
        .catch(error => {
          this.activeRequests--;
          request.reject(error);
          this.processQueue();
        });
    }

    this.processingQueue = false;
  }

  /**
   * Execute a request without retries on rate limits - just throw immediately
   * This allows the caller to move to the next source
   */
  private async retryRequest<T>(
    execute: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 2000
  ): Promise<T> {
    try {
      return await execute();
    } catch (error: any) {
      // Don't retry on rate limits (403) - just throw immediately so caller can try next source
      if (error?.status === 403) {
        console.warn(`[Steam] Rate limited (403), moving to next source`);
        throw error;
      }

      // For other errors, still throw immediately (no retries)
      throw error;
    }
  }

  async search(title: string, steamAppId?: string, linksOnly: boolean = false): Promise<GameSearchResult[]> {
    if (!this.steamService || !steamAppId) {
      return [];
    }

    try {
      // If we have a Steam App ID, return it as a search result
      return [{
        id: `steam-${steamAppId}`,
        title: title,
        source: this.name,
        externalId: steamAppId,
        steamAppId: steamAppId,
      }];
    } catch (error) {
      console.error('Steam search error:', error);
      return [];
    }
  }

  /**
   * Normalize game titles from other platforms to match Steam Store names
   * Handles trademark symbols, punctuation, and known naming differences
   */
  private normalizeGameTitleForSteamSearch(title: string): string {
    // Known title mappings from other platforms to Steam Store names
    const titleMappings: Record<string, string> = {
      // Call of Duty variants
      'Call of Duty: Black Ops 7': 'Call of Duty®: Black Ops 7',
      'Call of Duty Black Ops 7': 'Call of Duty®: Black Ops 7',

      // Tony Hawk's games
      "Tony Hawk's- Pro Skater- 3 + 4_1": "Tony Hawk's™ Pro Skater™ 1 + 2",
      "Tony Hawk's- Pro Skater- 3 + 4": "Tony Hawk's™ Pro Skater™ 1 + 2",
      "Tony Hawk's Pro Skater 3 + 4_1": "Tony Hawk's™ Pro Skater™ 1 + 2",
      "Tony Hawk's Pro Skater 3 + 4": "Tony Hawk's™ Pro Skater™ 1 + 2",

      // Other trademark symbols
      'Assassins Creed Mirage': "Assassin's Creed® Mirage",
      'Assassins Creed mirage': "Assassin's Creed® Mirage",

      'afop': 'Avatar: Frontiers of Pandora™',
      'Avatar Frontiers of Pandora': 'Avatar: Frontiers of Pandora™',
      'TheDarksideDetectivehsD4J': 'The Darkside Detective',
    };

    // Check for exact match first
    if (titleMappings[title]) {
      console.log(`[Steam searchGames] Using known title mapping: "${title}" → "${titleMappings[title]}"`);
      return titleMappings[title];
    }

    // Try case-insensitive matching
    const lowerTitle = title.toLowerCase();
    for (const [original, mapped] of Object.entries(titleMappings)) {
      if (original.toLowerCase() === lowerTitle) {
        console.log(`[Steam searchGames] Using known title mapping (case-insensitive): "${title}" → "${mapped}"`);
        return mapped;
      }
    }

    // Return original title if no mapping found
    return title;
  }

  /**
   * Search Steam Store by game title (for non-Steam games)
   * Uses the fast storesearch API which returns titles + IDs in a single call
   */
  async searchGames(title: string): Promise<GameSearchResult[]> {
    try {
      // Normalize title to match Steam Store naming conventions
      const normalizedTitle = this.normalizeGameTitleForSteamSearch(title);
      console.log(`[Steam searchGames] Searching Steam Store for "${normalizedTitle}" (original: "${title}")`);

      // Use the Steam Store Search API — returns titles + IDs in a single fast call
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(normalizedTitle)}&l=english&cc=US`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[Steam searchGames] Search returned status ${response.status}`);
        return [];
      }

      const data = await response.json() as any;
      const items = data?.items;

      if (!items || !Array.isArray(items) || items.length === 0) {
        console.log(`[Steam searchGames] No results found for "${title}"`);
        return [];
      }

      // Limit to first 10 results (more than enough for matching)
      const limitedItems = items.slice(0, 10);
      console.log(`[Steam searchGames] Found ${limitedItems.length} matches for "${title}"`);

      const results: GameSearchResult[] = limitedItems
        .filter((item: any) => item.id && item.name)
        .map((item: any) => ({
          id: `steam-${item.id}`,
          title: item.name,
          source: this.name,
          externalId: String(item.id),
          steamAppId: String(item.id),
        }));

      return results;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.warn(`[Steam searchGames] Search timed out for "${title}"`);
      } else {
        console.warn(`[Steam searchGames] Error searching for "${title}":`, error);
      }
      return [];
    }
  }

  async getDescription(id: string, linksOnly: boolean = false): Promise<import('./MetadataProvider.js').GameDescription | null> {
    // Extract Steam App ID
    const match = id.match(/^steam-(.+)$/);
    if (!match) {
      return null;
    }
    const steamAppId = match[1];

    // Use rate-limited queue with retry logic
    return this.queueRequest(async () => {
      return this.retryRequest(async () => {
        // Use Steam Store API to get game details
        // Add proper headers to avoid 403 errors (Steam requires User-Agent)
        const storeApiUrl = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&l=english`;
        const response = await fetch(storeApiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://store.steampowered.com/',
          },
        });

        if (!response.ok) {
          // Create an error object that includes status for retry logic
          const error: any = new Error(`Steam Store API returned ${response.status}`);
          error.status = response.status;
          throw error;
        }

        const data = await response.json() as Record<string, any>;
        const appData = data[steamAppId];

        if (!appData || !appData.success || !appData.data) {
          console.warn(`[Steam] No data returned from Store API for app ${steamAppId}`);
          return null;
        }

        const gameData = appData.data;

        // Extract text metadata from Steam Store API
        const description: import('./MetadataProvider.js').GameDescription = {};

        // Title
        if (gameData.name) {
          description.title = gameData.name;
        }

        description.source = this.name;

        // Description/Summary
        if (gameData.short_description) {
          description.description = gameData.short_description;
        }
        if (gameData.detailed_description) {
          description.summary = gameData.detailed_description;
        }

        // Release date
        if (gameData.release_date) {
          if (gameData.release_date.date) {
            // Parse date string (format: "DD MMM, YYYY" or "Coming soon")
            try {
              const dateStr = gameData.release_date.date;
              if (dateStr !== 'Coming soon' && dateStr !== 'TBA') {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                  description.releaseDate = date.toISOString().split('T')[0];
                }
              }
            } catch (err) {
              console.warn(`[Steam] Could not parse release date: ${gameData.release_date.date}`);
            }
          }
        }

        // Genres
        if (gameData.genres && Array.isArray(gameData.genres)) {
          description.genres = gameData.genres.map((g: any) => g.description).filter(Boolean);
        }

        // Developers
        if (gameData.developers && Array.isArray(gameData.developers)) {
          description.developers = gameData.developers.filter(Boolean);
        }

        // Publishers
        if (gameData.publishers && Array.isArray(gameData.publishers)) {
          description.publishers = gameData.publishers.filter(Boolean);
        }

        // Categories (tags)
        if (gameData.categories && Array.isArray(gameData.categories)) {
          description.categories = gameData.categories.map((c: any) => c.description).filter(Boolean);
        }

        // Age rating - only use PEGI ratings
        // Check if content_descriptors.notes contains PEGI, otherwise use required_age
        if (gameData.content_descriptors && gameData.content_descriptors.notes) {
          const notes = gameData.content_descriptors.notes.toLowerCase();
          // Only use if it's a PEGI rating
          if (notes.includes('pegi')) {
            description.ageRating = gameData.content_descriptors.notes;
          } else if (gameData.required_age) {
            description.ageRating = `PEGI ${gameData.required_age}`;
          }
        } else if (gameData.required_age) {
          description.ageRating = `PEGI ${gameData.required_age}`;
        }

        // Rating (metacritic score if available)
        if (gameData.metacritic && gameData.metacritic.score) {
          description.rating = gameData.metacritic.score;
        }

        // Platforms
        if (gameData.platforms) {
          const platforms: string[] = [];
          if (gameData.platforms.windows) platforms.push('Windows');
          if (gameData.platforms.mac) platforms.push('macOS');
          if (gameData.platforms.linux) platforms.push('Linux');
          if (platforms.length > 0) {
            description.platforms = platforms;
          }
        }

        // Links
        const links: Array<{ name: string; url: string }> = [];
        // Add Steam Store link
        links.push({ name: 'Steam Store', url: `https://store.steampowered.com/app/${steamAppId}/` });
        // Add official website if available
        if (gameData.website) {
          links.push({ name: 'Official Website', url: gameData.website });
        }
        description.links = links;

        // Auto-categorize as VR if "VR" or "Virtual Reality" is mentioned
        const vrKeywords = ['vr', 'virtual reality'];
        const isVR = (description.categories || []).some(c => vrKeywords.includes(c.toLowerCase())) ||
          (description.genres || []).some(g => vrKeywords.includes(g.toLowerCase())) ||
          (description.description || '').toLowerCase().includes('virtual reality') ||
          (description.summary || '').toLowerCase().includes('virtual reality');

        if (isVR && !description.categories?.some(c => c === 'VR')) {
          description.categories = [...(description.categories || []), 'VR'];
        }

        return Object.keys(description).length > 0 ? description : null;
      }, 3, 2000); // 3 retries with 2s base delay
    }).catch((error) => {
      console.error(`[Steam] Error fetching description for app ${steamAppId}:`, error);
      return null;
    });
  }

  async getArtwork(id: string, steamAppId?: string): Promise<GameArtwork | null> {
    if (!steamAppId) {
      // Extract Steam App ID from provider ID
      const match = id.match(/^steam-(.+)$/);
      if (!match) {
        return null;
      }
      steamAppId = match[1];
    }

    try {
      // Steam CDN URLs - Official images (highest priority):
      // Box Art: library_600x900.jpg or library_600x900_2x.jpg (vertical cover art)
      // Banner: library_hero.jpg or header.jpg (horizontal banner)
      // Logo: logo.png
      // Icon: {appId}_icon.jpg (game icon, typically 32x32 or 64x64)
      const boxArtUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_600x900.jpg`;
      const boxArtUrl2x = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_600x900_2x.jpg`;
      const bannerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_hero.jpg`;
      const headerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/header.jpg`;
      const logoUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/logo.png`;
      const iconUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/${steamAppId}_icon.jpg`;

      // Verify images exist with timeout (HEAD first; GET fallback for icon/header when HEAD fails in packaged apps)
      const timeoutMs = 5000;
      const fetchWithTimeout = async (url: string, method: 'HEAD' | 'GET' = 'HEAD'): Promise<Response | null> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, { method, signal: controller.signal });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          return null;
        }
      };
      const isImageResponse = (r: Response | null): boolean =>
        !!r?.ok && (r.headers.get('content-type') ?? '').toLowerCase().startsWith('image/');

      // Check which images are available (prioritize official Steam CDN images)
      const [boxArtResponse, boxArt2xResponse, bannerResponse, headerResponse, logoResponse, iconResponse] = await Promise.all([
        fetchWithTimeout(boxArtUrl),
        fetchWithTimeout(boxArtUrl2x),
        fetchWithTimeout(bannerUrl),
        fetchWithTimeout(headerUrl),
        fetchWithTimeout(logoUrl),
        fetchWithTimeout(iconUrl),
      ]);

      const artwork: GameArtwork = {};

      // Box Art: library_600x900.jpg or library_600x900_2x.jpg (official Steam box art)
      if (boxArtResponse?.ok) {
        artwork.boxArtUrl = boxArtUrl;
        artwork.boxArtResolution = { width: 600, height: 900 }; // Standard Steam library cover size
      } else if (boxArt2xResponse?.ok) {
        artwork.boxArtUrl = boxArtUrl2x;
        artwork.boxArtResolution = { width: 1200, height: 1800 }; // 2x resolution Steam library cover
      }

      // Banner: library_hero.jpg (preferred) or header.jpg (fallback) - official Steam banners
      if (bannerResponse?.ok) {
        artwork.bannerUrl = bannerUrl;
        artwork.heroUrl = bannerUrl;
        artwork.bannerResolution = { width: 1920, height: 620 }; // Standard Steam hero size
        artwork.heroResolution = { width: 1920, height: 620 };
        // When we have the hero, use header as alternative banner if it exists (different aspect ratio)
        // NOTE: Deliberately NOT using header.jpg as alternative banner because it always has the
        // game title text burned into the image. Alternative banners should be clean/text-free
        // backgrounds. SteamGridDB horizontal grids are a better source for this.
      } else if (headerResponse?.ok) {
        // Fallback to header if hero is not available
        artwork.bannerUrl = headerUrl;
        artwork.bannerResolution = { width: 460, height: 215 }; // Standard Steam header size
      }

      // Logo: Try multiple variations (official Steam logos)
      const logoEnglishUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/logo_english.png`;
      const libraryLogoUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_logo.png`;

      // Check logos in parallel (if main logo failed or we want to be thorough)
      let foundLogoUrl: string | undefined;

      if (logoResponse?.ok) {
        foundLogoUrl = logoUrl;
      } else {
        // Try fallbacks
        const [logoEnglishRes, libraryLogoRes] = await Promise.all([
          fetchWithTimeout(logoEnglishUrl),
          fetchWithTimeout(libraryLogoUrl)
        ]);

        if (logoEnglishRes?.ok) {
          foundLogoUrl = logoEnglishUrl;
        } else if (libraryLogoRes?.ok) {
          foundLogoUrl = libraryLogoUrl;
        }
      }

      if (foundLogoUrl) {
        artwork.logoUrl = foundLogoUrl;
        // Steam logos vary in size, but typically around 231x87 or larger for library assets
        artwork.logoResolution = { width: 231, height: 87 };
      }

      // Icon: only set when we get a valid response. Use GET fallback when HEAD fails (e.g. in packaged app).
      if (iconResponse?.ok) {
        artwork.iconUrl = iconUrl;
        artwork.iconResolution = { width: 64, height: 64 };
      } else {
        const communityIconUrl = `https://media.steampowered.com/steamcommunity/public/images/apps/${steamAppId}/${steamAppId}_icon.jpg`;
        const communityRes = await fetchWithTimeout(communityIconUrl);
        if (communityRes?.ok) {
          artwork.iconUrl = communityIconUrl;
          artwork.iconResolution = { width: 64, height: 64 };
        } else {
          const iconGet = await fetchWithTimeout(iconUrl, 'GET');
          if (isImageResponse(iconGet)) {
            artwork.iconUrl = iconUrl;
            artwork.iconResolution = { width: 64, height: 64 };
          }
        }
      }

      // Return artwork if we have at least one image
      if (artwork.boxArtUrl || artwork.bannerUrl || artwork.logoUrl || artwork.heroUrl || artwork.iconUrl) {
        return artwork;
      }

      return null;
    } catch (error) {
      console.error('Steam getArtwork error:', error);
      return null;
    }
  }

  async getInstallInfo(id: string): Promise<GameInstallInfo | null> {
    if (!this.steamService) {
      return null;
    }

    try {
      // Extract Steam App ID
      const match = id.match(/^steam-(.+)$/);
      if (!match) {
        return null;
      }
      const steamAppId = match[1];

      // Scan Steam games to find install info
      const steamGames = this.steamService.scanSteamGames();
      const game = steamGames.find(g => g.appId === steamAppId);

      if (!game) {
        return null;
      }

      // Try to find the executable
      const installDir = join(game.libraryPath, 'steamapps', 'common', game.installDir);
      let executablePath: string | undefined;

      if (existsSync(installDir)) {
        // Look for common executable names
        const commonExeNames = [
          `${game.installDir}.exe`,
          `${game.name}.exe`,
          'game.exe',
          'Game.exe',
        ];

        for (const exeName of commonExeNames) {
          const exePath = join(installDir, exeName);
          if (existsSync(exePath)) {
            executablePath = exePath;
            break;
          }
        }
      }

      return {
        installPath: installDir,
        executablePath: executablePath,
        platform: 'steam',
      };
    } catch (error) {
      console.error('Steam getInstallInfo error:', error);
      return null;
    }
  }
}
