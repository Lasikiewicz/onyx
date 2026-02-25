import { BaseGameScanner } from './BaseGameScanner.js';
import { ScannedGameResult } from './ScannedGameResult.js';
import { GameFilteringService } from '../GameFilteringService.js';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

export class ManualScanner extends BaseGameScanner {
  constructor(
    private autoCategory?: string[],
    private folderName?: string,
    gameFilteringService?: GameFilteringService
  ) {
    super(gameFilteringService);
  }

  async scan(rootPath: string): Promise<ScannedGameResult[]> {
    const results: ScannedGameResult[] = [];

    try {
      if (!existsSync(rootPath)) {
        console.warn(`[ImportService] Manual folder does not exist: ${rootPath}`);
        return [];
      }

      console.log(`[ImportService] Scanning manual root ${rootPath} (subfolders = game names)...`);

      const entries = readdirSync(rootPath);

      for (const entry of entries) {
        const gameDir = join(rootPath, entry);
        try {
          const stats = statSync(gameDir);
          if (!stats.isDirectory()) {
            continue;
          }

          const title = entry;

          // Find executables within the game folder (allow deeper nests, but reuse global filters)
          const exeCandidates = this.findExecutables(gameDir, 0, 20);

          // Choose best executable: prefer filename matching folder name, otherwise closest to root
          let mainExe: string | undefined;
          if (exeCandidates.length > 0) {
            const normalizedTitle = title.toLowerCase();
            const exactMatch = exeCandidates.find(p => {
              const exeName = p.split(/[/\\]/).pop()?.toLowerCase().replace('.exe', '') || '';
              return exeName === normalizedTitle;
            });

            if (exactMatch) {
              mainExe = exactMatch;
            } else {
              // Pick the exe with the shortest relative path (closest to root)
              mainExe = exeCandidates.sort((a, b) => {
                const relA = a.substring(gameDir.length).split(sep).length;
                const relB = b.substring(gameDir.length).split(sep).length;
                return relA - relB;
              })[0];
            }
          }

          // Try to detect GOG metadata for manual folders
          let launchArgs: string | undefined;
          let appId: string | undefined;
          let finalTitle = title;
          let finalExe = mainExe;

          try {
            const dirContents = readdirSync(gameDir);
            const infoFile = dirContents.find(f => f.match(/^goggame-(\d+)\.info$/));
            if (infoFile) {
              const infoPath = join(gameDir, infoFile);
              const infoContent = readFileSync(infoPath, 'utf-8');
              const infoData = JSON.parse(infoContent);

              if (infoData.name) finalTitle = infoData.name;
              appId = infoFile.replace(/\D+/g, '');

              const playTasks = infoData.playTasks || [];
              const primaryTask = playTasks.find((task: any) => task.isPrimary && task.category === 'game');
              if (primaryTask) {
                if (primaryTask.path) {
                  const taskPath = primaryTask.path.replace(/\\/g, sep);
                  const absolutePath = join(gameDir, taskPath);
                  if (existsSync(absolutePath)) {
                    finalExe = absolutePath;
                  }
                }
                if (primaryTask.arguments) {
                  launchArgs = primaryTask.arguments;
                  console.log(`[Manual-GOG] Detected launch arguments for ${finalTitle}: ${launchArgs}`);
                }
              }
            }
          } catch (err) {
            // Ignore metadata detection errors
          }

          results.push({
            uuid: `manual-${gameDir}-${Date.now()}`,
            source: this.folderName || 'Manual Folder',
            originalName: title,
            installPath: gameDir.replace(/\\/g, '/'),
            exePath: finalExe?.replace(/\\/g, '/'),
            launchArgs: launchArgs,
            appId: appId,
            title: finalTitle,
            categories: this.autoCategory,
            status: 'ambiguous' as const,
          });
        } catch (err) {
          console.warn(`[Manual] Could not process manual subfolder "${gameDir}":`, err);
          continue;
        }
      }
    } catch (error) {
      console.error('[Manual] Error scanning manual root:', error);
    }

    return results;
  }
}
