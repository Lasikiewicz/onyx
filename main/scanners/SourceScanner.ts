import type { ScannedGameResult } from '../ImportService.js';

export interface SourceScanner {
  scan(path: string): Promise<ScannedGameResult[]>;
}

