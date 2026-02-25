import { BaseGameScanner } from './BaseGameScanner.js';
import { ScannedGameResult } from './ScannedGameResult.js';
import { SteamService, SteamGame } from '../SteamService.js';

export class SteamScanner extends BaseGameScanner {
  constructor(private steamService: SteamService) {
    super();
  }

  async scan(path: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[SteamScanner] scan called with path: ${path}`);
      this.steamService.setSteamPath(path);
      const steamGames = this.steamService.scanSteamGames();
      console.log(`[SteamScanner] found ${steamGames.length} games`);

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
          status: 'ready' as const, // Steam games with AppID are ready
          isDownloading: false, // Steam Service already filters for installed games
        };
      });
    } catch (error) {
      console.error('Error scanning Steam:', error);
      return [];
    }
  }
}
