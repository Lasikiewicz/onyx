import type { ScannedGameResult } from '../ImportService.js';
import type { SteamGame } from '../SteamService.js';
import { SteamService } from '../SteamService.js';
import { SourceScanner } from './SourceScanner.js';

/**
 * Steam-specific scanning logic extracted from ImportService.
 */
export class SteamScanner implements SourceScanner {
  constructor(private readonly steamService: SteamService) {}

  async scan(steamPath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[SteamScanner] scan called with path: ${steamPath}`);
      this.steamService.setSteamPath(steamPath);
      const steamGames = await this.steamService.scanSteamGames();
      console.log(`[SteamScanner] scan found ${steamGames.length} games`);

      return steamGames.map((game: SteamGame) => {
        const categories: string[] = [];
        if (game.name.toLowerCase().includes('steamvr')) {
          categories.push('VR');
        }

        return {
          uuid: `steam-${game.appId}-${Date.now()}`,
          source: 'steam' as const,
          originalName: game.name,
          installPath: game.installDir.replace(/\\/g, '/'),
          exePath: undefined, // Steam games use steam:// protocol
          appId: game.appId,
          title: game.name,
          categories,
          status: 'ready' as const,
          isDownloading: false,
        };
      });
    } catch (error) {
      console.error('[SteamScanner] Error scanning Steam:', error);
      return [];
    }
  }
}

