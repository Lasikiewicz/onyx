import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface EaInstalledGame {
  /** Registry subkey name, e.g. "Battlefield 6" */
  name: string;
  /** Value of "Install Dir", with any trailing separator stripped */
  installDir: string;
}

/**
 * EA App / Origin write one subkey per installed game under these roots, each carrying an
 * "Install Dir" value. This is the only authoritative source for games installed outside the
 * default library folder — path guessing never finds those.
 *
 * Both the 32-bit and native views are read: every machine we've seen writes to WOW6432Node,
 * but the native hive is mirrored on some and costs one extra query to cover.
 */
const EA_GAME_REGISTRY_KEYS = [
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\EA Games',
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\EA Games',
];

/**
 * Parse the output of `reg query <key> /s /v "Install Dir"`, which looks like:
 *
 *   HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\EA Games\Battlefield 6
 *       Install Dir    REG_SZ    C:\Program Files\EA Games\Battlefield 6\
 *
 * Exported for tests — the parsing, not the spawn, is where this can go wrong.
 */
export function parseEaGameRegistryOutput(stdout: string): EaInstalledGame[] {
  const games: EaInstalledGame[] = [];
  let currentName = '';

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line) continue;

    if (/^HKEY_/i.test(line)) {
      // Subkey name is the last path segment; the root key itself has no game under it
      currentName = line.split('\\').pop()?.trim() || '';
      continue;
    }

    const match = line.match(/^\s+Install Dir\s+REG_[^\s]+\s+(.+)$/i);
    if (!match || !currentName) continue;

    const installDir = match[1].trim().replace(/[\\/]+$/, '');
    if (installDir) {
      games.push({ name: currentName, installDir });
    }
  }

  return games;
}

/**
 * Enumerate every game EA App / Origin has registered as installed.
 * Returns an empty list off Windows, or when EA has never been installed.
 */
export async function readEaInstalledGames(): Promise<EaInstalledGame[]> {
  if (process.platform !== 'win32') {
    return [];
  }

  const byInstallDir = new Map<string, EaInstalledGame>();

  for (const key of EA_GAME_REGISTRY_KEYS) {
    try {
      // Args array (no shell) removes any command-injection surface
      const { stdout } = await execFileAsync('reg', ['query', key, '/s', '/v', 'Install Dir'], {
        encoding: 'utf-8',
      });

      for (const game of parseEaGameRegistryOutput(stdout)) {
        const dedupeKey = game.installDir.toLowerCase();
        if (!byInstallDir.has(dedupeKey)) {
          byInstallDir.set(dedupeKey, game);
        }
      }
    } catch {
      // Key doesn't exist (EA not installed) or access denied — try the next view
    }
  }

  return Array.from(byInstallDir.values());
}
