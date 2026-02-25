import { BaseGameScanner } from './BaseGameScanner.js';
import { ScannedGameResult } from './ScannedGameResult.js';
import { XboxService, XboxGame } from '../XboxService.js';
import { sep } from 'node:path';

export class XboxScanner extends BaseGameScanner {
  constructor(private xboxService: XboxService) {
    super();
  }

  async scan(path: string): Promise<ScannedGameResult[]> {
    try {
      const xboxGames = this.xboxService.scanGames(path);

      return xboxGames.map((game: XboxGame) => {
        // XboxService returns installPath as the full exe path for both UWP and PC games
        // Extract the folder path for installPath, keep exe path separate
        const exePath = game.type === 'pc' ? game.installPath : undefined;
        let installPath = game.installPath;
        if (game.installPath) {
          const pathParts = game.installPath.split(/[/\\]/);
          if (pathParts.length > 1) {
            pathParts.pop(); // Remove the exe filename when present
            installPath = pathParts.join(sep);
          }
        }

        return {
          uuid: `${game.id}-${Date.now()}`,
          source: 'xbox' as const,
          originalName: game.name,
          installPath: installPath.replace(/\\/g, '/'),
          exePath: exePath?.replace(/\\/g, '/'),
          appId: game.appId,
          packageFamilyName: game.packageFamilyName,
          appUserModelId: game.appUserModelId,
          launchUri: game.launchUri,
          xboxKind: game.type,
          title: game.name,
          status: 'ambiguous' as const, // Xbox games need metadata matching
          isDownloading: this.gameFilteringService.isLikelyDownloading(installPath),
        };
      });
    } catch (error) {
      console.error('Error scanning Xbox:', error);
      return [];
    }
  }
}
