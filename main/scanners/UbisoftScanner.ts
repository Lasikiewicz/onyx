import { BaseGameScanner } from './BaseGameScanner.js';
import { ScannedGameResult } from './ScannedGameResult.js';
import { existsSync } from 'node:fs';
import { join, sep, dirname } from 'node:path';

export class UbisoftScanner extends BaseGameScanner {
  async scan(ubisoftPath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[Ubisoft] Starting scan with path: ${ubisoftPath}`);
      const results: ScannedGameResult[] = [];

      // Ubisoft games are in: {UbisoftPath}\games (lowercase)
      // If path is already the games folder, use it directly
      let gamesPath: string;
      if (ubisoftPath.toLowerCase().endsWith('games')) {
        gamesPath = ubisoftPath;
      } else {
        gamesPath = join(ubisoftPath, 'games');
      }

      console.log(`[Ubisoft] Checking games folder: ${gamesPath}`);

      if (!existsSync(gamesPath)) {
        console.warn(`[Ubisoft] Games folder not found: ${gamesPath}`);
        // Try alternative path structure (some installations might be different)
        const altPath = join(ubisoftPath, 'Games');
        if (existsSync(altPath)) {
          console.log(`[Ubisoft] Found games in alternative path: ${altPath}`);
          gamesPath = altPath;
        } else {
          return results;
        }
      }

      console.log(`[Ubisoft] Scanning games folder: ${gamesPath}`);
      const scannedGames = this.scanUbisoftGamesFolder(gamesPath);
      console.log(`[Ubisoft] Found ${scannedGames.length} games`);
      return scannedGames;
    } catch (error) {
      console.error('[Ubisoft] Error scanning Ubisoft:', error);
      return [];
    }
  }

  /**
   * Scan Ubisoft games folder for executables
   * Recursively scans all subdirectories and creates a game entry for each folder containing a valid executable
   */
  private scanUbisoftGamesFolder(gamesPath: string): ScannedGameResult[] {
    const results: ScannedGameResult[] = [];

    try {
      console.log(`[Ubisoft] Scanning games folder: ${gamesPath}`);

      // Find all executables recursively in the folder
      const allExeFiles = this.findExecutables(gamesPath, 0, 20);
      console.log(`[Ubisoft] Found ${allExeFiles.length} total executables`);

      // Filter out helper executables
      const gameExes = allExeFiles.filter(exe => {
        const fileName = exe.toLowerCase();
        const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
        return !fileNameOnly.includes('gamelaunchhelper') &&
          !fileNameOnly.includes('bootstrapper') &&
          !fileNameOnly.includes('uninstall') &&
          !fileNameOnly.includes('setup') &&
          !fileNameOnly.includes('installer') &&
          !fileNameOnly.includes('uplay') &&
          !fileNameOnly.includes('ubisoft') &&
          fileNameOnly !== 'crashreportclient.exe' &&
          fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
          fileNameOnly !== 'battlenet.exe' &&
          fileNameOnly !== 'battle.net.exe' &&
          fileNameOnly !== 'cleanup.exe' &&
          fileNameOnly !== 'crashpad_handler.exe' &&
          fileNameOnly !== 'gamesessionmonitor.exe';
      });

      console.log(`[Ubisoft] Filtered to ${gameExes.length} valid game executables`);

      if (gameExes.length === 0) {
        return results;
      }

      // Group executables by their containing directory
      const gamesByFolder = new Map<string, string[]>();

      for (const exePath of gameExes) {
        const exeDir = dirname(exePath);
        const normalizedDir = exeDir.replace(/\\/g, sep).replace(/\/\//g, '/');

        if (!gamesByFolder.has(normalizedDir)) {
          gamesByFolder.set(normalizedDir, []);
        }
        gamesByFolder.get(normalizedDir)!.push(exePath);
      }

      console.log(`[Ubisoft] Found ${gamesByFolder.size} unique game folders`);

      // Create a game entry for each folder
      for (const [gameDir, exePaths] of gamesByFolder.entries()) {
        try {
          // Only process directories within the games path
          const normalizedGamesPath = gamesPath.replace(/\\/g, sep).replace(/\/\//g, '/');
          if (!gameDir.startsWith(normalizedGamesPath) && gameDir !== normalizedGamesPath) {
            continue;
          }

          // Use the folder name as the game title
          let folderName = gameDir.split(sep).pop() || 'Unknown';

          // Detect Ubisoft download/staging structure
          if (gameDir.toLowerCase().includes('uplay_download')) {
            const parts = gameDir.split(/[/\\]/);
            const downloadIdx = parts.findIndex(p => p.toLowerCase() === 'uplay_download');
            if (downloadIdx > 0) {
              // The parent of 'uplay_download' is usually the actual game name
              folderName = parts[downloadIdx - 1];
              console.log(`[Ubisoft] Detected download folder, using real game name from parent: ${folderName}`);
            }
          }

          // Select the best executable from this folder
          let mainExe = exePaths[0];

          // Prefer executables with the same name as the directory (or the parent directory we just found)
          const matchingExe = exePaths.find(exe => {
            const exeName = exe.split(sep).pop()?.toLowerCase().replace('.exe', '') || '';
            const normalizedFolder = folderName.toLowerCase();
            return exeName === normalizedFolder || normalizedFolder.includes(exeName);
          });

          if (matchingExe) {
            mainExe = matchingExe;
          } else {
            // Prefer executables closer to the folder root
            const sortedByDepth = exePaths.sort((a, b) => {
              const depthA = a.substring(gameDir.length).split(sep).length;
              const depthB = b.substring(gameDir.length).split(sep).length;
              return depthA - depthB;
            });
            mainExe = sortedByDepth[0];
          }

          console.log(`[Ubisoft] Adding game: ${folderName} with exe: ${mainExe}`);

          results.push({
            uuid: `ubisoft-${gameDir}-${Date.now()}`,
            source: 'ubisoft' as const,
            originalName: folderName,
            installPath: gameDir,
            exePath: mainExe,
            appId: undefined,
            title: folderName,
            status: 'ambiguous' as const, // Ubisoft games need metadata matching
            isDownloading: this.gameFilteringService.isLikelyDownloading(gameDir),
          });
        } catch (err) {
          console.warn(`[Ubisoft] Could not process game folder "${gameDir}":`, err);
          continue;
        }
      }

      console.log(`[Ubisoft] Found ${results.length} games total`);
    } catch (err) {
      console.error('[Ubisoft] Error scanning Ubisoft games folder:', err);
    }

    return results;
  }
}
