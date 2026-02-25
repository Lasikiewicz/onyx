import { ScannedGameResult } from './ScannedGameResult.js';

export { ScannedGameResult };

export interface GameScanner {
  scan(path: string): Promise<ScannedGameResult[]>;
}
