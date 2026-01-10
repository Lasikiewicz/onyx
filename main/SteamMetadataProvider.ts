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

  constructor(steamService: SteamService | null) {
    this.steamService = steamService;
  }

  isAvailable(): boolean {
    return this.steamService !== null;
  }

  async search(title: string, steamAppId?: string): Promise<GameSearchResult[]> {
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

  async getDescription(id: string): Promise<import('./MetadataProvider.js').GameDescription | null> {
    // Extract Steam App ID
    const match = id.match(/^steam-(.+)$/);
    if (!match) {
      return null;
    }
    const steamAppId = match[1];

    try {
      // Use Steam Store API to get game details
      const storeApiUrl = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&l=english`;
      const response = await fetch(storeApiUrl);
      
      if (!response.ok) {
        console.warn(`[Steam] Store API request failed for app ${steamAppId}: ${response.status}`);
        return null;
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
      
      // Age rating (content descriptors)
      if (gameData.content_descriptors && gameData.content_descriptors.notes) {
        description.ageRating = gameData.content_descriptors.notes;
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

      return Object.keys(description).length > 0 ? description : null;
    } catch (error) {
      console.error(`[Steam] Error fetching description for app ${steamAppId}:`, error);
      return null;
    }
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
      // Steam CDN URLs - Correct mapping:
      // Box Art: library_600x900.jpg (vertical cover art)
      // Banner: library_hero.jpg or header.jpg (horizontal banner)
      // Logo: logo.png
      const boxArtUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_600x900.jpg`;
      const bannerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_hero.jpg`;
      const headerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/header.jpg`;
      const logoUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/logo.png`;

      // Verify images exist with timeout
      const timeoutMs = 5000;
      const fetchWithTimeout = async (url: string): Promise<Response | null> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
          const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          return null;
        }
      };

      // Check which images are available
      const [boxArtResponse, bannerResponse, headerResponse, logoResponse] = await Promise.all([
        fetchWithTimeout(boxArtUrl),
        fetchWithTimeout(bannerUrl),
        fetchWithTimeout(headerUrl),
        fetchWithTimeout(logoUrl),
      ]);

      const artwork: GameArtwork = {};

      // Box Art: library_600x900.jpg (vertical cover art)
      if (boxArtResponse?.ok) {
        artwork.boxArtUrl = boxArtUrl;
        artwork.boxArtResolution = { width: 600, height: 900 }; // Standard Steam library cover size
      }

      // Banner: library_hero.jpg (preferred) or header.jpg (fallback)
      if (bannerResponse?.ok) {
        artwork.bannerUrl = bannerUrl;
        artwork.heroUrl = bannerUrl;
        artwork.bannerResolution = { width: 1920, height: 620 }; // Standard Steam hero size
        artwork.heroResolution = { width: 1920, height: 620 };
      } else if (headerResponse?.ok) {
        // Fallback to header if hero is not available
        artwork.bannerUrl = headerUrl;
        artwork.bannerResolution = { width: 460, height: 215 }; // Standard Steam header size
      }

      // Logo: logo.png
      if (logoResponse?.ok) {
        artwork.logoUrl = logoUrl;
        // Steam logos vary in size, but typically around 231x87
        artwork.logoResolution = { width: 231, height: 87 };
      }

      // Return artwork if we have at least one image
      if (artwork.boxArtUrl || artwork.bannerUrl || artwork.logoUrl || artwork.heroUrl) {
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
