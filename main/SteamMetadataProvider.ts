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
    // Steam CDN doesn't provide descriptions via API
    // Return null to indicate this provider doesn't support descriptions
    return null;
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
      // Steam CDN URLs
      const boxArtUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/header.jpg`;
      const bannerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_600x900.jpg`;
      const heroUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_hero.jpg`;
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
      const [boxArtResponse, bannerResponse, heroResponse, logoResponse] = await Promise.all([
        fetchWithTimeout(boxArtUrl),
        fetchWithTimeout(bannerUrl),
        fetchWithTimeout(heroUrl),
        fetchWithTimeout(logoUrl),
      ]);

      const artwork: GameArtwork = {};

      if (boxArtResponse?.ok) {
        artwork.boxArtUrl = boxArtUrl;
        artwork.boxArtResolution = { width: 460, height: 215 }; // Standard Steam header size
      }

      if (bannerResponse?.ok) {
        artwork.bannerUrl = bannerUrl;
        artwork.bannerResolution = { width: 600, height: 900 }; // Standard Steam library size
      }

      if (heroResponse?.ok) {
        artwork.heroUrl = heroUrl;
        artwork.heroResolution = { width: 1920, height: 620 }; // Standard Steam hero size
      }

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
