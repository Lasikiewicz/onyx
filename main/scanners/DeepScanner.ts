import { BaseGameScanner } from './BaseGameScanner.js';
import { ScannedGameResult } from './ScannedGameResult.js';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';

export class DeepScanner extends BaseGameScanner {
  async scan(folderPath: string): Promise<ScannedGameResult[]> {
    const results: ScannedGameResult[] = [];

    try {
      if (!existsSync(folderPath)) {
        console.error(`[DeepScanner] Folder does not exist: ${folderPath}`);
        return [];
      }

      console.log(`[DeepScanner] Scanning folder "${folderPath}" recursively for games...`);

      // Find all executables recursively in the folder
      const allExeFiles = this.findExecutables(folderPath, 0, 20);
      console.log(`[DeepScanner] Found ${allExeFiles.length} total executables in "${folderPath}"`);

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
          !fileNameOnly.includes('install') &&
          !fileNameOnly.includes('cleanup') &&
          !fileNameOnly.includes('crashhandler') &&
          !fileNameOnly.includes('redist') &&
          !fileNameOnly.includes('directx') &&
          !fileNameOnly.includes('updater') &&
          !fileNameOnly.includes('launcher') &&
          fileNameOnly !== 'crashreportclient.exe' &&
          fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
          fileNameOnly !== 'battlenet.exe' &&
          fileNameOnly !== 'battle.net.exe' &&
          fileNameOnly !== 'cleanup.exe' &&
          fileNameOnly !== 'crashpad_handler.exe' &&
          fileNameOnly !== 'gamesessionmonitor.exe';
      });

      console.log(`[DeepScanner] Filtered to ${gameExes.length} valid game executables`);

      if (gameExes.length === 0) {
        console.log(`[DeepScanner] No valid game executables found in "${folderPath}"`);
        return results;
      }

      // Group executables by their containing directory
      // This way, if a folder has multiple executables, we create one game entry
      // But if there are multiple folders each with their own executable, we create multiple games
      const gamesByFolder = new Map<string, string[]>();

      // Normalize the base folder path for comparison (use forward slashes consistently)
      const normalizedBasePath = folderPath.replace(/\\/g, '/').toLowerCase();

      for (const exePath of gameExes) {
        const exeDir = dirname(exePath);
        // Normalize the directory path (use forward slashes for consistency)
        const normalizedDir = exeDir.replace(/\\/g, '/');

        // Only include directories that are within the scanned folder
        const normalizedExeDir = normalizedDir.toLowerCase();
        if (!normalizedExeDir.startsWith(normalizedBasePath) && normalizedExeDir !== normalizedBasePath) {
          console.log(`[DeepScanner] Skipping executable outside scanned folder: ${exePath} (dir: ${exeDir})`);
          continue;
        }

        if (!gamesByFolder.has(normalizedDir)) {
          gamesByFolder.set(normalizedDir, []);
        }
        gamesByFolder.get(normalizedDir)!.push(exePath);
      }

      console.log(`[DeepScanner] Found ${gamesByFolder.size} unique game folders`);

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
          // Check if this folder is a subfolder of an already added folder
          // If so, skip it to avoid duplicates (e.g., Battlefield 6\SP when Battlefield 6 already exists)
          const normalizedGameDir = gameDir.toLowerCase();
          let isSubfolder = false;
          for (const addedFolder of addedFolders) {
            const normalizedAddedFolder = addedFolder.toLowerCase();
            // Check if gameDir is a subfolder of addedFolder
            if (normalizedGameDir.startsWith(normalizedAddedFolder + '/') ||
              normalizedGameDir.startsWith(normalizedAddedFolder + '\\')) {
              console.log(`[DeepScanner] Skipping subfolder game: ${gameDir} (parent folder already added: ${addedFolder})`);
              isSubfolder = true;
              break;
            }
          }

          if (isSubfolder) {
            continue;
          }

          // Use the folder name as the game title
          const folderName = gameDir.split(/[/\\]/).pop() || 'Unknown';

          console.log(`[DeepScanner] Processing game folder: ${folderName} (${gameDir}) with ${exePaths.length} executable(s)`);

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
            // If no exact match, prefer executables closer to the folder root (fewer path separators)
            const sortedByDepth = exePaths.sort((a, b) => {
              // Count separators relative to the game directory
              const depthA = a.substring(gameDir.length).split(sep).length;
              const depthB = b.substring(gameDir.length).split(sep).length;
              return depthA - depthB; // Prefer shallower (closer to folder root)
            });
            mainExe = sortedByDepth[0];
            console.log(`[DeepScanner] Selected executable (closest to root): ${mainExe}`);
          }

          // Filter using shared game filtering service
          const exeFileName = mainExe.split(/[/\\]/).pop() || '';
          if (this.gameFilteringService.isLikelyNonGame({
            name: folderName,
            folderPath: gameDir,
            exeName: exeFileName,
            source: 'manual',
          })) {
            console.log(`[DeepScanner] Filtering out non-game from manual folder: ${folderName}`);
            continue; // Skip this one
          }

          // Only create game if the directory is within or equal to the scanned folder
          // This prevents creating games for parent directories
          const normalizedFolderPath = folderPath.replace(/\\/g, '/');
          const normalizedGameDirForCheck = gameDir.replace(/\\/g, '/');
          if (normalizedGameDirForCheck.startsWith(normalizedFolderPath) || normalizedGameDirForCheck === normalizedFolderPath) {
            const gameResult = {
              uuid: `manual_folder-${gameDir}-${Date.now()}`,
              source: 'Manual Folder',
              originalName: folderName,
              installPath: gameDir,
              exePath: mainExe,
              appId: undefined,
              title: folderName,
              status: 'ambiguous' as const, // Manual folder scans need metadata matching
            };

            // Special logging for John Wick Hex
            if (folderName.toLowerCase().includes('john wick')) {
              console.log(`[DeepScanner] ✓ Added John Wick Hex: installPath="${gameDir}", exePath="${mainExe}"`);
            }

            results.push(gameResult);
            addedFolders.add(gameDir);
            console.log(`[DeepScanner] ✓ Added game: ${folderName} from ${gameDir}`);
          } else {
            console.log(`[DeepScanner] Skipping game folder outside scanned path: ${gameDir} (scanned: ${folderPath})`);
          }
        } catch (err) {
          console.warn(`[DeepScanner] Could not process game folder "${gameDir}":`, err);
          continue;
        }
      }

      console.log(`[DeepScanner] Scanned folder "${folderPath}" and found ${results.length} games`);
      return results;
    } catch (error) {
      console.error(`[DeepScanner] Error scanning folder "${folderPath}":`, error);
      return [];
    }
  }
}
