import type { Game } from './GameStore.js';
import type { ScanReport } from './ImportService.js';

/**
 * Decide which library games are missing from disk.
 *
 * A game is only reported when the check that would find it actually completed:
 * - A cancelled scan reports nothing, because its results are incomplete.
 * - A Steam game is only checked against the scan when the Steam source finished with status
 *   `ok`. If Steam errored, was skipped (disabled or its library drive is offline) or never
 *   ran, every Steam game would look removed, so none are flagged.
 * - Other games are checked by path. A game with no path to check is kept.
 */
export async function findMissingGames(
  library: Game[],
  report: ScanReport,
  pathExists: (path: string) => Promise<boolean>,
): Promise<Game[]> {
  if (report.cancelled) return [];

  const steamScanOk = report.sourceStatus.steam === 'ok';
  const scannedSteamIds = new Set<string>();
  if (steamScanOk) {
    for (const result of report.results) {
      if (result.source === 'steam' && result.appId) {
        scannedSteamIds.add(`steam-${result.appId}`);
      }
    }
  }

  const missing: Game[] = [];
  for (const game of library) {
    if (game.source === 'steam') {
      if (steamScanOk && !scannedSteamIds.has(game.id)) missing.push(game);
      continue;
    }

    // Skip games without exe paths (like some Steam games that launch via protocol)
    if (!game.exePath || game.exePath.trim() === '') continue;

    if (!(await pathExists(game.exePath))) {
      missing.push(game);
    }
  }

  return missing;
}
