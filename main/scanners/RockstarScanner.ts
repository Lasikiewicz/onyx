import { BaseGameScanner } from './BaseGameScanner.js';
import { ScannedGameResult } from './ScannedGameResult.js';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

export class RockstarScanner extends BaseGameScanner {
  async scan(rockstarPath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[Rockstar] Starting scan with path: ${rockstarPath}`);
      const results: ScannedGameResult[] = [];

      if (!existsSync(rockstarPath)) {
        console.warn(`[Rockstar] Rockstar Games folder not found: ${rockstarPath}`);
        return results;
      }

      // Rockstar games are typically in subdirectories of the Rockstar Games folder
      // Each game has its own folder (e.g., Grand Theft Auto V, Red Dead Redemption 2)
      try {
        const entries = readdirSync(rockstarPath);
        console.log(`[Rockstar] Found ${entries.length} entries in Rockstar Games folder`);

        for (const entry of entries) {
          // Skip known non-game folders
          const dirName = entry.toLowerCase();
          if (dirName === 'launcher' ||
            dirName === 'social club' ||
            dirName === 'redistributables' ||
            dirName.startsWith('$')) {
            console.log(`[Rockstar] Skipping non-game folder: ${entry}`);
            continue;
          }

          const gamePath = join(rockstarPath, entry);

          try {
            const stats = statSync(gamePath);
            if (!stats.isDirectory()) {
              continue;
            }

            console.log(`[Rockstar] Scanning game folder: ${entry}`);

            // Look for .exe files in the game folder (deep scan)
            const exeFiles = this.findExecutables(gamePath, 0, 20);
            console.log(`[Rockstar] Found ${exeFiles.length} executables in ${entry}`);

            // Filter out helper executables and launchers
            const gameExes = exeFiles.filter(exe => {
              const fileName = exe.toLowerCase();
              const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
              return !fileNameOnly.includes('launcher') &&
                !fileNameOnly.includes('uninstall') &&
                !fileNameOnly.includes('unins') &&
                !fileNameOnly.includes('setup') &&
                !fileNameOnly.includes('installer') &&
                !fileNameOnly.includes('socialclub') &&
                !fileNameOnly.includes('social club') &&
                !fileNameOnly.includes('redistributables') &&
                !fileNameOnly.includes('redist') &&
                !fileNameOnly.includes('updater') &&
                !fileNameOnly.includes('gamelaunchhelper') &&
                !fileNameOnly.includes('bootstrapper') &&
                fileNameOnly !== 'crashreportclient.exe' &&
                fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
                fileNameOnly !== 'battlenet.exe' &&
                fileNameOnly !== 'battle.net.exe' &&
                fileNameOnly !== 'crashpad_handler.exe' &&
                fileNameOnly !== 'embark-crash-helper.exe' &&
                fileNameOnly !== 'blizzardbrowser.exe' &&
                fileNameOnly !== 'blizzarderror.exe';
            });

            console.log(`[Rockstar] Filtered to ${gameExes.length} game executables in ${entry}`);

            if (gameExes.length > 0) {
              // Prefer executables with the same name as the game folder
              let mainExe = gameExes[0];

              // Try to find an exe with the same name as the directory
              const matchingExe = gameExes.find(exe => {
                const exeName = exe.split(sep).pop()?.toLowerCase().replace('.exe', '') || '';
                const gameName = entry.toLowerCase();
                return exeName === gameName ||
                  exeName.includes(gameName.replace(/\s+/g, '')) ||
                  gameName.includes(exeName);
              });

              if (matchingExe) {
                mainExe = matchingExe;
              } else {
                // Prefer executables closer to root (fewer directory separators)
                const exeWithDepth = gameExes.map(exe => ({
                  exe,
                  depth: (exe.match(/[/\\]/g) || []).length
                }));
                exeWithDepth.sort((a, b) => a.depth - b.depth);
                mainExe = exeWithDepth[0].exe;
              }

              console.log(`[Rockstar] ✓ Found Rockstar game: ${entry} (${mainExe})`);

              results.push({
                uuid: `rockstar-${entry}-${Date.now()}`,
                source: 'rockstar' as const,
                originalName: entry,
                installPath: gamePath,
                exePath: mainExe,
                appId: undefined,
                title: entry,
                status: 'ambiguous' as const, // Rockstar games need metadata matching
                isDownloading: this.gameFilteringService.isLikelyDownloading(gamePath),
              });
            } else {
              console.log(`[Rockstar] No valid game executables found in ${entry}`);
            }
          } catch (err) {
            console.warn(`[Rockstar] Could not scan folder "${entry}":`, err);
            continue;
          }
        }
      } catch (err) {
        console.error('[Rockstar] Error scanning Rockstar Games directory:', err);
      }

      console.log(`[Rockstar] Total Rockstar games found: ${results.length}`);
      return results;
    } catch (error) {
      console.error('[Rockstar] Error scanning Rockstar Games:', error);
      return [];
    }
  }
}
