import { promises as fsp } from 'node:fs';
import { basename, join } from 'node:path';
import { findFirstExistingPath, getLinuxHeroicConfigRoots, pathExists } from './platformSupport.js';

/**
 * Heroic Games Launcher is the practical way an Epic or GOG library exists on Linux: there is no
 * native Epic Games Launcher and no native GOG Galaxy, so the store manifests Onyx reads on Windows
 * simply are not there. Heroic keeps its own install records as plain JSON, which is what this
 * service reads — no Heroic process or CLI is involved.
 *
 * Games are launched through Heroic's own URI handler rather than by spawning the game binary, so
 * Heroic still applies the per-game Wine/Proton prefix, environment and wrappers it was configured
 * with. Launching the binary directly would bypass all of that.
 */

export type HeroicRunner = 'legendary' | 'gog' | 'nile';

export interface HeroicGame {
  /** Heroic's own app identifier, used verbatim in the launch URI. */
  appName: string;
  title: string;
  installPath: string;
  /** Absolute path to the game executable when Heroic recorded one. */
  exePath?: string;
  runner: HeroicRunner;
  /** `heroic://launch/<runner>/<appName>` — handled by Heroic's registered protocol. */
  launchUri: string;
  /** Onyx source id this maps onto, so metadata matching behaves as it does on Windows. */
  source: 'epic' | 'gog' | 'amazon';
}

const RUNNER_SOURCES: Record<HeroicRunner, HeroicGame['source']> = {
  legendary: 'epic',
  gog: 'gog',
  nile: 'amazon',
};

async function readJsonFile(filePath: string): Promise<unknown | null> {
  try {
    const contents = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(contents);
  } catch {
    // Missing file (store never used) or a partial write while Heroic is running.
    return null;
  }
}

/** Resolve the Heroic config root in use, preferring the native install over the Flatpak sandbox. */
export async function findHeroicConfigRoot(): Promise<string | undefined> {
  return findFirstExistingPath(getLinuxHeroicConfigRoots());
}

async function resolveExecutable(installPath: string, recordedExecutable?: unknown): Promise<string | undefined> {
  if (typeof recordedExecutable !== 'string' || !recordedExecutable.trim()) {
    return undefined;
  }

  const candidate = join(installPath, recordedExecutable);
  return (await pathExists(candidate)) ? candidate : undefined;
}

function toHeroicGame(
  runner: HeroicRunner,
  appName: string,
  title: string,
  installPath: string,
  exePath: string | undefined,
): HeroicGame {
  return {
    appName,
    title,
    installPath,
    exePath,
    runner,
    launchUri: `heroic://launch/${runner}/${encodeURIComponent(appName)}`,
    source: RUNNER_SOURCES[runner],
  };
}

/**
 * Epic titles, from Legendary's install record. Shape is a map of appName -> install entry:
 * `{ "Fortnite": { "app_name": "...", "title": "...", "install_path": "...", "executable": "..." } }`
 */
async function readLegendaryGames(configRoot: string): Promise<HeroicGame[]> {
  const installedPath = join(configRoot, 'legendaryConfig', 'legendary', 'installed.json');
  const parsed = await readJsonFile(installedPath);
  if (!parsed || typeof parsed !== 'object') {
    return [];
  }

  const games: HeroicGame[] = [];

  for (const [key, entry] of Object.entries(parsed as Record<string, Record<string, unknown>>)) {
    if (!entry || typeof entry !== 'object') continue;

    // DLC shares its parent's install directory and would otherwise import as a duplicate game.
    if (entry.is_dlc === true) continue;

    const installPath = typeof entry.install_path === 'string' ? entry.install_path : '';
    if (!installPath || !(await pathExists(installPath))) continue;

    const appName = typeof entry.app_name === 'string' && entry.app_name ? entry.app_name : key;
    const title = typeof entry.title === 'string' && entry.title ? entry.title : basename(installPath);

    games.push(
      toHeroicGame('legendary', appName, title, installPath, await resolveExecutable(installPath, entry.executable)),
    );
  }

  return games;
}

/**
 * GOG's install record (`{ "installed": [ { "appName", "install_path", ... } ] }`) carries no title,
 * so titles are looked up in Heroic's library cache and fall back to the install folder name.
 */
async function readGogTitles(configRoot: string): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  const libraryPath = join(configRoot, 'store_cache', 'gog_library.json');
  const parsed = await readJsonFile(libraryPath);

  const games = (parsed as { games?: unknown } | null)?.games;
  if (!Array.isArray(games)) {
    return titles;
  }

  for (const game of games) {
    if (!game || typeof game !== 'object') continue;
    const entry = game as Record<string, unknown>;
    const appName = typeof entry.app_name === 'string' ? entry.app_name : undefined;
    const title = typeof entry.title === 'string' ? entry.title : undefined;
    if (appName && title) {
      titles.set(appName, title);
    }
  }

  return titles;
}

async function readGogGames(configRoot: string): Promise<HeroicGame[]> {
  const installedPath = join(configRoot, 'gog_store', 'installed.json');
  const parsed = await readJsonFile(installedPath);
  const installed = (parsed as { installed?: unknown } | null)?.installed;
  if (!Array.isArray(installed)) {
    return [];
  }

  const titles = await readGogTitles(configRoot);
  const games: HeroicGame[] = [];

  for (const record of installed) {
    if (!record || typeof record !== 'object') continue;
    const entry = record as Record<string, unknown>;

    const installPath = typeof entry.install_path === 'string' ? entry.install_path : '';
    const appName = typeof entry.appName === 'string' ? entry.appName : '';
    if (!installPath || !appName || !(await pathExists(installPath))) continue;

    games.push(
      toHeroicGame(
        'gog',
        appName,
        titles.get(appName) || basename(installPath),
        installPath,
        await resolveExecutable(installPath, entry.executable),
      ),
    );
  }

  return games;
}

/**
 * Every game Heroic reports as installed for the given runners. Returns an empty list when Heroic
 * is not installed, so callers can treat "no Heroic" and "no games" identically.
 *
 * `configRootOverride` is a test seam: it lets the record parsing be driven against a fixture tree
 * without depending on a real Heroic install in the home directory.
 */
export async function readHeroicInstalledGames(
  runners: HeroicRunner[] = ['legendary', 'gog'],
  configRootOverride?: string,
): Promise<HeroicGame[]> {
  const configRoot = configRootOverride ?? await findHeroicConfigRoot();
  if (!configRoot) {
    return [];
  }

  const games: HeroicGame[] = [];

  if (runners.includes('legendary')) {
    games.push(...(await readLegendaryGames(configRoot)));
  }
  if (runners.includes('gog')) {
    games.push(...(await readGogGames(configRoot)));
  }

  return games;
}
