import { BaseGameScanner } from './BaseGameScanner.js';
import { ScannedGameResult } from './ScannedGameResult.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep, dirname } from 'node:path';

export class GogScanner extends BaseGameScanner {
  async scan(gogPath: string): Promise<ScannedGameResult[]> {
    try {
      const results: ScannedGameResult[] = [];

      // GOG games are in: {GOGPath}\Games
      // If path is already the Games folder, use it directly
      let gamesPath: string;
      if (gogPath.toLowerCase().endsWith('games')) {
        gamesPath = gogPath;
      } else {
        gamesPath = join(gogPath, 'Games');
      }

      if (!existsSync(gamesPath)) {
        // Try alternative location
        const altGamesPath = join(gogPath, 'Galaxy', 'Games');
        if (existsSync(altGamesPath)) {
          return this.scanGOGGamesFolder(altGamesPath);
        }
        console.warn(`GOG Games folder not found: ${gamesPath}`);
        return results;
      }

      return this.scanGOGGamesFolder(gamesPath);
    } catch (error) {
      console.error('Error scanning GOG:', error);
      return [];
    }
  }

  /**
   * Scan GOG games folder for executables
   * Recursively scans all subdirectories and creates a game entry for each folder containing a valid executable
   */
  private scanGOGGamesFolder(gamesPath: string): ScannedGameResult[] {
    const results: ScannedGameResult[] = [];

    try {
      console.log(`[GOG] Scanning games folder: ${gamesPath}`);

      // Find all executables recursively in the folder
      const allExeFiles = this.findExecutables(gamesPath, 0, 20);
      console.log(`[GOG] Found ${allExeFiles.length} total executables`);

      // Filter out helper executables
      const gameExes = allExeFiles.filter(exe => {
        const fileName = exe.toLowerCase();
        const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
        return !fileNameOnly.includes('gamelaunchhelper') &&
          !fileNameOnly.includes('bootstrapper') &&
          !fileNameOnly.includes('uninstall') &&
          !fileNameOnly.includes('setup') &&
          !fileNameOnly.includes('installer') &&
          fileNameOnly !== 'crashreportclient.exe' &&
          fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
          fileNameOnly !== 'battlenet.exe' &&
          fileNameOnly !== 'battle.net.exe' &&
          fileNameOnly !== 'cleanup.exe' &&
          fileNameOnly !== 'crashpad_handler.exe' &&
          fileNameOnly !== 'gamesessionmonitor.exe';
      });

      console.log(`[GOG] Filtered to ${gameExes.length} valid game executables`);

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

      console.log(`[GOG] Found ${gamesByFolder.size} unique game folders`);

      // Create a game entry for each folder
      for (const [gameDir, exePaths] of gamesByFolder.entries()) {
        try {
          // Only process directories within the games path
          const normalizedGamesPath = gamesPath.replace(/\\/g, sep).replace(/\/\//g, '/');
          if (!gameDir.startsWith(normalizedGamesPath) && gameDir !== normalizedGamesPath) {
            continue;
          }

          // Use the folder name as the default game title
          const folderName = gameDir.split(sep).pop() || 'Unknown';
          let gameTitle = folderName;

          // For common launcher/emulator subfolders (scummvm, dosbox, etc.), use parent folder name
          const commonEmulators = ['scummvm', 'dosbox', 'dosboxstaging', 'wine', 'proton'];
          if (commonEmulators.includes(folderName.toLowerCase())) {
            // Get parent folder name instead
            const parentFolder = gameDir.split(sep).slice(0, -1).pop();
            if (parentFolder && parentFolder.toLowerCase() !== 'games') {
              gameTitle = parentFolder;
              console.log(`[GOG] Using parent folder name for emulator subfolder: ${gameTitle}`);
            }
          }

          // Try to read GOG Galaxy .info file for game metadata
          let launchArgs: string | undefined;
          let primaryExePath: string | undefined;
          let infoData: any;
          let infoFile: string | undefined;
          let infoDir: string = gameDir;

          // Search up to the GOG games root for an .info file
          let searchPath = gameDir;
          // Reuse normalizedGamesPath from above

          while (searchPath.startsWith(normalizedGamesPath)) {
            try {
              const contents = readdirSync(searchPath);
              const found = contents.find(f => f.match(/^goggame-\d+\.info$/));
              if (found) {
                infoFile = found;
                infoDir = searchPath;
                break;
              }
            } catch (err) {
              // Ignore access errors
            }

            const parent = dirname(searchPath);
            if (parent === searchPath) break;
            searchPath = parent;
          }

          if (infoFile) {
            try {
              const infoPath = join(infoDir, infoFile);
              const infoContent = readFileSync(infoPath, 'utf-8');
              infoData = JSON.parse(infoContent);

              // Extract the game name from .info file if available
              if (infoData.name) {
                gameTitle = infoData.name;
              }

              // Find the primary game task
              const playTasks = infoData.playTasks || [];
              const primaryTask = playTasks.find((task: any) => task.isPrimary && task.category === 'game');

              if (primaryTask && primaryTask.path) {
                // Resolve the relative path to absolute, relative to where the .info file is
                const taskPath = primaryTask.path.replace(/\\/g, sep);
                const absolutePath = join(infoDir, taskPath);

                // Check if the resolved exe exists
                if (existsSync(absolutePath)) {
                  primaryExePath = absolutePath;
                }

                // Extract launch arguments
                if (primaryTask.arguments) {
                  launchArgs = primaryTask.arguments;
                  console.log(`[GOG] Found launch arguments for ${gameTitle}: ${launchArgs}`);
                }
              }
            } catch (err) {
              console.warn(`[GOG] Could not parse info file at ${infoDir}:`, err);
            }
          }

          // Select the best executable from this folder
          let mainExe = primaryExePath || exePaths[0];

          // If no primary exe from info, try to match by folder name
          if (!primaryExePath) {
            const matchingExe = exePaths.find(exe => {
              const exeName = exe.split(sep).pop()?.toLowerCase().replace('.exe', '') || '';
              return exeName === folderName.toLowerCase();
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
          }

          results.push({
            uuid: `gog-${gameDir}-${Date.now()}`,
            source: 'gog' as const,
            originalName: gameTitle,
            installPath: gameDir.replace(/\\/g, '/'),
            exePath: mainExe?.replace(/\\/g, '/'),
            launchArgs: launchArgs,
            appId: infoFile ? infoFile.replace(/\D+/g, '') : undefined,
            title: gameTitle,
            status: 'ambiguous' as const, // GOG games need metadata matching
            isDownloading: this.gameFilteringService.isLikelyDownloading(gameDir),
          });
        } catch (err) {
          console.warn(`[GOG] Could not process game folder "${gameDir}":`, err);
          continue;
        }
      }

      console.log(`[GOG] Found ${results.length} games total`);
    } catch (err) {
      console.error('[GOG] Error scanning GOG games folder:', err);
    }

    return results;
  }
}
