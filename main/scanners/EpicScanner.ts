import { BaseGameScanner } from './BaseGameScanner.js';
import { ScannedGameResult } from './ScannedGameResult.js';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export class EpicScanner extends BaseGameScanner {
  async scan(epicPath: string): Promise<ScannedGameResult[]> {
    try {
      const results: ScannedGameResult[] = [];

      // Epic Games stores manifests typically in ProgramData; also try under provided epicPath
      const defaultManifests = join(process.env.ProgramData || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests');
      const manifestsPath = existsSync(defaultManifests)
        ? defaultManifests
        : join(epicPath, 'Epic Games Launcher', 'Data', 'Manifests');

      if (existsSync(manifestsPath)) {
        // Try to read from manifests first (preferred method)
        const manifestFiles = readdirSync(manifestsPath).filter(f => f.endsWith('.item'));

        for (const manifestFile of manifestFiles) {
          try {
            const manifestPath = join(manifestsPath, manifestFile);
            const manifestContent = readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);

            // Epic manifest structure
            const appName = manifest.DisplayName || manifest.LaunchExecutable || 'Unknown';
            const installLocation = manifest.InstallLocation;
            const launchExecutable = manifest.LaunchExecutable;
            const catalogItemId = manifest.CatalogItemId;

            if (installLocation && existsSync(installLocation)) {
              // Find the executable
              let exePath: string | undefined;

              if (launchExecutable) {
                const fullExePath = join(installLocation, launchExecutable);
                if (existsSync(fullExePath)) {
                  exePath = fullExePath;
                }
              }

              // If no launch executable specified, search for common exe names
              if (!exePath) {
                const commonExes = [
                  join(installLocation, `${appName}.exe`),
                  join(installLocation, 'Binaries', 'Win64', `${appName}.exe`),
                  join(installLocation, 'Binaries', 'Win32', `${appName}.exe`),
                ];

                for (const exe of commonExes) {
                  if (existsSync(exe)) {
                    exePath = exe;
                    break;
                  }
                }
              }

              // Create a unique ID from catalog info or use manifest filename
              const appId = catalogItemId || manifestFile.replace('.item', '');

              results.push({
                uuid: `epic-${appId}-${Date.now()}`,
                source: 'epic' as const,
                originalName: appName,
                installPath: installLocation.replace(/\\/g, '/'),
                exePath: exePath?.replace(/\\/g, '/'),
                appId: appId,
                title: appName,
                status: 'ambiguous' as const, // Epic games need metadata matching
                isDownloading: this.gameFilteringService.isLikelyDownloading(installLocation),
              });
            }
          } catch (err) {
            console.error(`Error parsing Epic manifest ${manifestFile}:`, err);
            continue;
          }
        }
      }

      // Fallback: Scan Epic Games directory directly for game folders
      // This handles cases where manifests aren't available or games are installed directly
      if (!existsSync(epicPath)) {
        return results;
      }

      try {
        const entries = readdirSync(epicPath);

        for (const entry of entries) {
          // Skip the Epic Games Launcher folder and other non-game folders
          if (entry === 'Epic Games Launcher' || entry === 'UnrealEngine') {
            continue;
          }

          const gamePath = join(epicPath, entry);

          try {
            const stats = statSync(gamePath);
            if (!stats.isDirectory()) {
              continue;
            }

            // Check if we already found this game from manifests
            const alreadyFound = results.some(r => r.installPath === gamePath);
            if (alreadyFound) {
              continue;
            }

            // Look for executables in this game folder (deep scan)
            const exeFiles = this.findExecutables(gamePath, 0, 20);

            // Filter out helper executables
            const gameExes = exeFiles.filter(exe => {
              const fileName = exe.toLowerCase();
              const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
              return !fileNameOnly.includes('gamelaunchhelper') &&
                !fileNameOnly.includes('bootstrapper') &&
                !fileNameOnly.includes('uninstall') &&
                !fileNameOnly.includes('setup') &&
                !fileNameOnly.includes('installer') &&
                !fileNameOnly.includes('launcher') &&
                fileNameOnly !== 'crashreportclient.exe' &&
                fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
                fileNameOnly !== 'battlenet.exe' &&
                fileNameOnly !== 'battle.net.exe' &&
                fileNameOnly !== 'crashpad_handler.exe' &&
                fileNameOnly !== 'embark-crash-helper.exe' &&
                fileNameOnly !== 'blizzardbrowser.exe' &&
                fileNameOnly !== 'blizzarderror.exe' &&
                fileNameOnly !== 'gamesessionmonitor.exe';
            });

            if (gameExes.length > 0) {
              // Use the first executable found
              const mainExe = gameExes[0];

              results.push({
                uuid: `epic-${entry}-${Date.now()}`,
                source: 'epic' as const,
                originalName: entry,
                installPath: gamePath.replace(/\\/g, '/'),
                exePath: mainExe.replace(/\\/g, '/'),
                appId: undefined,
                title: entry,
                status: 'ambiguous' as const, // Epic games need metadata matching
                isDownloading: this.gameFilteringService.isLikelyDownloading(gamePath),
              });
            }
          } catch (err) {
            // Skip folders we can't access
            continue;
          }
        }
      } catch (err) {
        console.error('Error scanning Epic Games directory:', err);
      }

      return results;
    } catch (error) {
      console.error('Error scanning Epic Games:', error);
      return [];
    }
  }
}
