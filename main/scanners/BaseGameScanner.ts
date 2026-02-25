import { GameScanner, ScannedGameResult } from './GameScanner.js';
import { GameFilteringService } from '../GameFilteringService.js';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, sep, dirname } from 'node:path';

export abstract class BaseGameScanner implements GameScanner {
  protected gameFilteringService: GameFilteringService;

  constructor(gameFilteringService?: GameFilteringService) {
    this.gameFilteringService = gameFilteringService || new GameFilteringService();
  }

  abstract scan(path: string): Promise<ScannedGameResult[]>;

  /**
   * Find executable files in a directory (recursive, deep scan with high max depth)
   */
  protected findExecutables(dirPath: string, depth: number = 0, maxDepth: number = 20): string[] {
    const executables: string[] = [];

    if (depth > maxDepth) return executables;

    const excludeNames = [
      'gamelaunchhelper.exe',
      'bootstrapper.exe',
      'crashreportclient.exe',
      'battlenet.overlay.runtime.exe',
      'battlenet.exe',
      'battle.net.exe',
      'crashpad_handler.exe',
      'embark-crash-helper.exe',
      'blizzardbrowser.exe',
      'blizzarderror.exe',
      'gamesessionmonitor.exe',
      'unins000.exe',
      'autorun.exe',
      'vc_redist.x64.exe',
      'gamelaunchhelper',
      'bootstrapper',
      'crashreportclient',
      'battlenet.overlay.runtime',
      'crashpad_handler',
      'embark-crash-helper',
      'blizzardbrowser',
      'blizzarderror',
      'gamesessionmonitor',
      'unins000',
      'autorun',
      'vc_redist.x64',
    ];

    try {
      const entries = readdirSync(dirPath);

      for (const entry of entries) {
        const fullPath = join(dirPath, entry);

        try {
          const stats = statSync(fullPath);

          if (stats.isFile() && entry.toLowerCase().endsWith('.exe')) {
            const lowerName = entry.toLowerCase();
            const baseName = lowerName.replace('.exe', '');

            // Check exact matches first
            if (excludeNames.includes(lowerName) || excludeNames.includes(baseName)) {
              continue;
            }

            // Check patterns - be aggressive about filtering non-game executables
            // Optimized local import approach
            if (!lowerName.includes('installer') &&
              !lowerName.includes('setup') &&
              !lowerName.includes('uninstall') &&
              !lowerName.includes('unins') &&
              !lowerName.includes('autorun') &&
              !lowerName.includes('vc_redist') &&
              !lowerName.includes('vcredist') &&
              !lowerName.includes('launcher') &&
              !lowerName.includes('updater') &&
              !lowerName.includes('update') &&
              !lowerName.includes('patcher') &&
              !lowerName.includes('repair') &&
              !lowerName.includes('config') &&
              !lowerName.includes('settings') &&
              !lowerName.includes('benchmark') &&
              !lowerName.includes('diagnostic') &&
              !lowerName.includes('reporter') &&
              !lowerName.includes('monitor') &&
              !lowerName.includes('helper') &&
              !lowerName.includes('service') &&
              !lowerName.includes('daemon') &&
              !lowerName.includes('agent') &&
              !lowerName.includes('overlay') &&
              !lowerName.includes('gamelaunchhelper') &&
              !lowerName.includes('bootstrapper') &&
              !lowerName.includes('crashreport') &&
              !lowerName.includes('crash_report') &&
              !lowerName.includes('crashhandler') &&
              !lowerName.includes('crash_handler') &&
              !lowerName.includes('errorhandler') &&
              !lowerName.includes('battlenet.overlay.runtime') &&
              !lowerName.includes('crashpad') &&
              !lowerName.includes('embark-crash') &&
              !lowerName.includes('blizzardbrowser') &&
              !lowerName.includes('blizzarderror') &&
              !lowerName.includes('gamesessionmonitor') &&
              !lowerName.includes('uplay') &&
              !lowerName.includes('ubisoft') &&
              !lowerName.includes('eadesktop') &&
              !lowerName.includes('origin') &&
              !lowerName.includes('epicgames') &&
              !lowerName.includes('steam') &&
              !lowerName.includes('activation') &&
              !lowerName.includes('redist') &&
              !lowerName.includes('directx') &&
              !lowerName.includes('prereq') &&
              !lowerName.includes('_redist') &&
              !baseName.startsWith('ue4') &&
              !baseName.startsWith('ue5') &&
              !baseName.endsWith('server') &&
              !baseName.endsWith('editor')) {
              executables.push(fullPath);
            }
          } else if (stats.isDirectory() && depth < maxDepth) {
            // Skip folders that definitely don't contain primary game executables
            const dirName = entry.toLowerCase();
            if (dirName.includes('wingdk') ||
              dirName === 'update' ||
              dirName === 'updater' ||
              dirName === 'setup' ||
              dirName === 'install' ||
              dirName === 'installer' ||
              dirName === 'redist' ||
              dirName === 'redistributables' ||
              dirName === 'directx' ||
              dirName === 'dotnet' ||
              dirName === '_commonredist' ||
              dirName === 'support' ||
              dirName === 'engine' ||
              dirName === 'binaries' || // Some games use Binaries, but often primary exe is at root
              dirName === 'tools' ||
              dirName === 'benchmark' ||
              dirName === 'extras' ||
              dirName === 'bonus' ||
              dirName === 'soundtrack' ||
              dirName === 'artbook' ||
              dirName === 'manuals' ||
              dirName === 'patch' ||
              dirName === 'patches') {
              continue;
            }
            // Recursively search subdirectories
            const subExes = this.findExecutables(fullPath, depth + 1, maxDepth);
            executables.push(...subExes);
          }
        } catch (err) {
          // Skip entries we can't access
          continue;
        }
      }
    } catch (err) {
      // Skip directories we can't access
    }

    return executables;
  }

  /**
   * Generic method to scan a games folder for any launcher
   * Recursively scans all subdirectories and creates a game entry for each folder containing a valid executable
   */
  protected async scanGenericGamesFolder(gamesPath: string, source: string, isLibraryRoot: boolean = true): Promise<ScannedGameResult[]> {
    const results: ScannedGameResult[] = [];

    try {
      console.log(`[${source}] Scanning games folder: ${gamesPath}`);

      // Find all executables recursively in the folder
      const allExeFiles = this.findExecutables(gamesPath, 0, 20);
      console.log(`[${source}] Found ${allExeFiles.length} total executables`);

      // Filter out helper executables
      const gameExes = allExeFiles.filter(exe => {
        const fileName = exe.toLowerCase();
        const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
        return !fileNameOnly.includes('gamelaunchhelper') &&
          !fileNameOnly.includes('bootstrapper') &&
          !fileNameOnly.includes('uninstall') &&
          !fileNameOnly.includes('unins') &&
          !fileNameOnly.includes('setup') &&
          !fileNameOnly.includes('installer') &&
          !fileNameOnly.includes('launcher') &&
          !fileNameOnly.includes('updater') &&
          !fileNameOnly.includes('redist') &&
          !fileNameOnly.includes('directx') &&
          fileNameOnly !== 'crashreportclient.exe' &&
          fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
          fileNameOnly !== 'battlenet.exe' &&
          fileNameOnly !== 'battle.net.exe' &&
          fileNameOnly !== 'cleanup.exe' &&
          fileNameOnly !== 'crashpad_handler.exe' &&
          fileNameOnly !== 'gamesessionmonitor.exe';
      });

      console.log(`[${source}] Filtered to ${gameExes.length} valid game executables`);

      if (gameExes.length === 0) {
        return results;
      }

      // Group executables by their containing directory
      const gamesByFolder = new Map<string, string[]>();

      for (const exePath of gameExes) {
        let gameDir: string;

        if (isLibraryRoot) {
          const relativePath = exePath.substring(gamesPath.length);
          const parts = relativePath.split(/[/\\]/).filter(Boolean);
          if (parts.length > 0) {
            gameDir = join(gamesPath, parts[0]);
          } else {
            gameDir = gamesPath;
          }
        } else {
          gameDir = gamesPath;
        }

        const normalizedDir = gameDir.replace(/\\/g, sep).replace(/\/\//g, '/');

        // Skip known non-game directories
        const dirName = normalizedDir.split(sep).pop()?.toLowerCase() || '';
        if (dirName === 'launcher' ||
          dirName === 'redistributables' ||
          dirName === 'support' ||
          dirName === 'tools' ||
          dirName.startsWith('$')) {
          continue;
        }

        if (!gamesByFolder.has(normalizedDir)) {
          gamesByFolder.set(normalizedDir, []);
        }
        gamesByFolder.get(normalizedDir)!.push(exePath);
      }

      console.log(`[${source}] Found ${gamesByFolder.size} unique game folders`);

      // Sort folders by depth (shallowest first) to detect parent/child relationships
      const sortedFolders = Array.from(gamesByFolder.entries()).sort((a, b) => {
        const depthA = a[0].split('/').length;
        const depthB = b[0].split('/').length;
        return depthA - depthB; // Shallowest first
      });

      // Track which folders we've added to avoid duplicates
      const addedFolders = new Set<string>();

      // Create a game entry for each folder
      for (const [gameDir, exePaths] of sortedFolders) {
        try {
          // Only process directories within the games path
          const normalizedGamesPath = gamesPath.replace(/\\/g, '/');
          const normalizedGameDir = gameDir.replace(/\\/g, '/');
          if (!normalizedGameDir.startsWith(normalizedGamesPath) && normalizedGameDir !== normalizedGamesPath) {
            continue;
          }

          // Check if this folder is a subfolder of an already added folder
          // If so, skip it to avoid duplicates (e.g., Battlefield 6\SP when Battlefield 6 already exists)
          const normalizedGameDirLower = normalizedGameDir.toLowerCase();
          let isSubfolder = false;
          for (const addedFolder of addedFolders) {
            const normalizedAddedFolder = addedFolder.toLowerCase();
            // Check if gameDir is a subfolder of addedFolder
            if (normalizedGameDirLower.startsWith(normalizedAddedFolder + '/') ||
              normalizedGameDirLower.startsWith(normalizedAddedFolder + '\\')) {
              console.log(`[${source}] Skipping subfolder game: ${gameDir} (parent folder already added: ${addedFolder})`);
              isSubfolder = true;
              break;
            }
          }

          if (isSubfolder) {
            continue;
          }

          // Use the folder name as the game title
          const folderName = gameDir.split(/[/\\]/).pop() || 'Unknown';

          // Select the best executable from this folder
          let mainExe = exePaths[0];

          // Prefer executables with the same name as the directory
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

          // Filter using shared game filtering service
          const exeFileName = mainExe.split(/[/\\]/).pop() || '';
          if (this.gameFilteringService.isLikelyNonGame({
            name: folderName,
            folderPath: gameDir,
            exeName: exeFileName,
            source: source as any,
          })) {
            console.log(`[${source}] Filtering out non-game: ${folderName}`);
            continue; // Skip this one
          }

          results.push({
            uuid: `${source}-${gameDir}-${Date.now()}`,
            source: source,
            originalName: folderName,
            installPath: gameDir,
            exePath: mainExe,
            appId: undefined,
            title: folderName,
            status: 'ambiguous' as const,
            isDownloading: this.gameFilteringService.isLikelyDownloading(gameDir),
          });
          addedFolders.add(normalizedGameDir);
          console.log(`[${source}] ✓ Added game: ${folderName} from ${gameDir}${this.gameFilteringService.isLikelyDownloading(gameDir) ? ' (Downloading)' : ''}`);
        } catch (err) {
          console.warn(`[${source}] Could not process game folder "${gameDir}":`, err);
          continue;
        }
      }

      console.log(`[${source}] Found ${results.length} games total`);
    } catch (err) {
      console.error(`[${source}] Error scanning games folder:`, err);
    }

    return results;
  }
}
