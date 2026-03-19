import type { ScannedGameResult } from '../ImportService.js';
import type { XboxGame } from '../XboxService.js';
import { XboxService } from '../XboxService.js';
import { GameFilteringService } from '../GameFilteringService.js';
import { SourceScanner } from './SourceScanner.js';
import { sep } from 'node:path';

/**
 * Xbox-specific scanning logic extracted from ImportService.
 */
export class XboxScanner implements SourceScanner {
  constructor(
    private readonly xboxService: XboxService,
    private readonly gameFilteringService: GameFilteringService,
  ) {}

  async scan(xboxPath: string): Promise<ScannedGameResult[]> {
    try {
      const xboxGames = this.xboxService.scanGames(xboxPath);

      return xboxGames.map((game: XboxGame) => {
        // XboxService returns installPath as the full exe path for both UWP and PC games
        // Extract the folder path for installPath, keep exe path separate.
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
          status: 'ambiguous' as const,
          isDownloading: this.gameFilteringService.isLikelyDownloading(installPath),
        };
      });
    } catch (error) {
      console.error('[XboxScanner] Error scanning Xbox:', error);
      return [];
    }
  }
}

