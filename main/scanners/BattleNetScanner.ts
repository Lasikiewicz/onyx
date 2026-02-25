import { BaseGameScanner } from './BaseGameScanner.js';
import { ScannedGameResult } from './ScannedGameResult.js';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';

export class BattleNetScanner extends BaseGameScanner {
  async scan(battlePath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[Battle.net] Starting scan with path: ${battlePath}`);
      const results: ScannedGameResult[] = [];

      if (!battlePath || !existsSync(battlePath)) {
        console.warn(`[Battle.net] Configured path does not exist or is empty: "${battlePath}". Will still attempt registry scan.`);
      } else {
        // 1. Check if the provided path is actually a game folder itself (common Blizzard structure)
        if (existsSync(join(battlePath, '.build.info'))) {
          console.log(`[Battle.net] Provided path looks like a Blizzard game folder: ${battlePath}`);
          const scanned = await this.scanGenericGamesFolder(battlePath, 'battle', false);
          results.push(...scanned);
        } else {
          // 2. Battle.net games are typically ONLY in the Games subdirectory
          // Don't scan the root path to avoid picking up the launcher itself
          const gamesPath = join(battlePath, 'Games');

          if (existsSync(gamesPath)) {
            console.log(`[Battle.net] Scanning games directory: ${gamesPath}`);
            const scanned = await this.scanGenericGamesFolder(gamesPath, 'battle');
            results.push(...scanned);
          } else {
            console.log(`[Battle.net] Games directory not found at: ${gamesPath}`);
          }

          // 3. Improved check: If the path provided is the Battle.net launcher folder, check the parent
          // Many users point to "C:\\Program Files (x86)\\Battle.net" but games are in "C:\\Program Files (x86)"
          const isLauncherDir = existsSync(join(battlePath, 'Battle.net.exe')) ||
            battlePath.toLowerCase().endsWith('battle.net') ||
            battlePath.toLowerCase().endsWith('battlenet');

          if (isLauncherDir) {
            const parentDir = dirname(battlePath);
            if (existsSync(parentDir) && parentDir !== battlePath) {
              console.log(`[Battle.net] Detected launcher directory, also scanning parent: ${parentDir}`);
              try {
                const parentEntries = readdirSync(parentDir, { withFileTypes: true });
                for (const entry of parentEntries) {
                  if (entry.isDirectory()) {
                    const dirName = entry.name.toLowerCase();
                    // Skip the launcher itself and other system folders
                    if (dirName === 'battle.net' || dirName === 'battlenet' || dirName === 'blizzard' || dirName === 'common') continue;

                    const potentialGamePath = join(parentDir, entry.name);
                    // Check if it's a Blizzard game (has .build.info)
                    if (existsSync(join(potentialGamePath, '.build.info'))) {
                      // Avoid duplicate if already found
                      if (results.some(r => r.installPath === potentialGamePath)) continue;

                      console.log(`[Battle.net] Found Blizzard game via .build.info in parent: ${entry.name}`);
                      const scanned = await this.scanGenericGamesFolder(potentialGamePath, 'battle', false);
                      results.push(...scanned);
                    }
                  }
                }
              } catch (err) {
                console.warn(`[Battle.net] Could not scan parent directory ${parentDir}:`, err);
              }
            }
          }

          // 4. Additional check for subdirectories (existing logic)
          const entries = readdirSync(battlePath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const dirName = entry.name.toLowerCase();

              // Skip already handled and irrelevant folders
              if (dirName === 'battle.net' ||
                dirName === 'battlenet' ||
                dirName === 'launcher' ||
                dirName === 'blizzard' ||
                dirName === 'system' ||
                dirName === 'cache' ||
                dirName === 'logs' ||
                dirName === 'temp' ||
                dirName === 'games') {
                continue;
              }

              const potentialGamePath = join(battlePath, entry.name);
              // Avoid duplicate
              if (results.some(r => r.installPath === potentialGamePath)) continue;

              const scanned = await this.scanGenericGamesFolder(potentialGamePath, 'battle', false);
              results.push(...scanned);
            }
          }
        } // End of inner else
      } // End of outer else

      // 5. Query Windows Registry for ANY Blizzard games installed anywhere
      if (typeof process !== 'undefined' && process.platform === 'win32') {
        try {
          console.log(`[Battle.net] Checking registry for installed games...`);
          const keysToSearch = [
            'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
            'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
          ];

          for (const baseKey of keysToSearch) {
            try {
              // Get all keys where Publisher is Blizzard Entertainment or Battle.net
              // Use -EncodedCommand to avoid $_ being consumed by cmd.exe shell
              const psScript = `Get-ItemProperty '${baseKey}\\*' -ErrorAction SilentlyContinue | Where-Object { $_.Publisher -match 'Blizzard' -or $_.Publisher -match 'Battle.net' -or $_.UninstallString -match 'Blizzard Uninstaller' } | Select-Object DisplayName, InstallLocation | ConvertTo-Json -Compress`;
              const encodedCmd = Buffer.from(psScript, 'utf16le').toString('base64');
              const output = execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encodedCmd}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();

              if (output) {
                const gamesArr = output.startsWith('[') ? JSON.parse(output) : [JSON.parse(output)];
                for (const game of gamesArr) {
                  if (game.DisplayName && game.InstallLocation) {
                    const name = game.DisplayName;
                    const path = game.InstallLocation;

                    // Skip the launcher itself
                    if (name === 'Battle.net' || path.toLowerCase().includes('battle.net')) continue;

                    if (!results.some(r => r.installPath === path) && existsSync(path)) {
                      console.log(`[Battle.net] Found game via registry: ${name} at ${path}`);
                      const scanned = await this.scanGenericGamesFolder(path, 'battle', false);
                      results.push(...scanned);
                    }
                  }
                }
              }
            } catch (e) {
              // Ignore if registry read fails
            }
          }
        } catch (err) {
          console.warn(`[Battle.net] Registry scan failed:`, err);
        }
      }

      console.log(`[Battle.net] Found ${results.length} games total`);
      return results;
    } catch (error) {
      console.error('[Battle.net] Error scanning Battle.net:', error);
      return [];
    }
  }
}
