import { BaseGameScanner } from './BaseGameScanner.js';
import { ScannedGameResult } from './ScannedGameResult.js';
import { existsSync } from 'node:fs';

export class ItchScanner extends BaseGameScanner {
  async scan(itchPath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[itch.io] Starting scan with path: ${itchPath}`);
      const results: ScannedGameResult[] = [];

      if (!existsSync(itchPath)) {
        console.warn(`[itch.io] Path does not exist: ${itchPath}`);
        return results;
      }

      // itch.io games are typically in subdirectories
      console.log(`[itch.io] Scanning: ${itchPath}`);
      const scanned = await this.scanGenericGamesFolder(itchPath, 'itch');
      results.push(...scanned);

      console.log(`[itch.io] Found ${results.length} games total`);
      return results;
    } catch (error) {
      console.error('[itch.io] Error scanning itch.io:', error);
      return [];
    }
  }
}
