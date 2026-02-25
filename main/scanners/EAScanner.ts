import { BaseGameScanner } from './BaseGameScanner.js';
import { ScannedGameResult } from './ScannedGameResult.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export class EAScanner extends BaseGameScanner {
  async scan(eaPath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[EA] Starting scan with path: ${eaPath}`);
      const results: ScannedGameResult[] = [];

      if (!existsSync(eaPath)) {
        console.warn(`[EA] Path does not exist: ${eaPath}`);
        return results;
      }

      // EA App games can be in multiple locations:
      // 1. {EAPath}\Games (common)
      // 2. Direct subdirectories of {EAPath}
      // 3. {EAPath}\Program Files\EA Games (older Origin)

      const possiblePaths = [
        join(eaPath, 'Games'),
        join(eaPath, 'Program Files', 'EA Games'),
        join(eaPath, 'Program Files (x86)', 'EA Games'),
        eaPath, // Scan the root path itself
      ];

      for (const gamesPath of possiblePaths) {
        if (existsSync(gamesPath)) {
          console.log(`[EA] Scanning: ${gamesPath}`);
          const scanned = await this.scanGenericGamesFolder(gamesPath, 'ea');
          results.push(...scanned);
        }
      }

      console.log(`[EA] Found ${results.length} games total`);
      return results;
    } catch (error) {
      console.error('[EA] Error scanning EA App:', error);
      return [];
    }
  }
}
