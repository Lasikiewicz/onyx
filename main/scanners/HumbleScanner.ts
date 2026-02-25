import { BaseGameScanner } from './BaseGameScanner.js';
import { ScannedGameResult } from './ScannedGameResult.js';
import { existsSync } from 'node:fs';

export class HumbleScanner extends BaseGameScanner {
  async scan(humblePath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[Humble] Starting scan with path: ${humblePath}`);
      const results: ScannedGameResult[] = [];

      if (!existsSync(humblePath)) {
        console.warn(`[Humble] Path does not exist: ${humblePath}`);
        return results;
      }

      // Humble games are typically in subdirectories
      console.log(`[Humble] Scanning: ${humblePath}`);
      const scanned = await this.scanGenericGamesFolder(humblePath, 'humble');
      results.push(...scanned);

      console.log(`[Humble] Found ${results.length} games total`);
      return results;
    } catch (error) {
      console.error('[Humble] Error scanning Humble:', error);
      return [];
    }
  }
}
