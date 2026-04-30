import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, normalize, parse } from 'node:path';
import type { Game } from './GameStore.js';

type GameLaunchCandidate = Pick<Game, 'title' | 'exePath' | 'installationDirectory' | 'source' | 'platform'>;

interface KnownLauncherRule {
  title: string;
  launcherExe: string;
  defaultInstallDirs: string[];
  matches: (game: GameLaunchCandidate) => boolean;
}

interface ResolveKnownLauncherOptions {
  pathExists?: (path: string) => boolean;
}

const normalizeText = (value: string | undefined): string =>
  (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const stripSurroundingQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const isNevernessToEverness = (game: GameLaunchCandidate): boolean => {
  const title = normalizeText(game.title);
  const exeName = normalizeText(basename(stripSurroundingQuotes(game.exePath || '')));
  const installPath = normalizeText(game.installationDirectory);
  const exePath = normalizeText(game.exePath);
  const source = normalizeText(game.source);
  const platform = normalizeText(game.platform);

  return (
    title === 'neverness to everness' ||
    exeName === 'ntegloballauncher exe' ||
    installPath.includes('neverness to everness') ||
    exePath.includes('neverness to everness') ||
    (source === 'hardcoded' && platform === 'hardcoded' && title.includes('neverness'))
  );
};

const KNOWN_LAUNCHERS: KnownLauncherRule[] = [
  {
    title: 'Neverness To Everness',
    launcherExe: 'NTEGlobalLauncher.exe',
    defaultInstallDirs: ['C:\\Program Files\\Neverness To Everness'],
    matches: isNevernessToEverness,
  },
];

const addDirectoryAndParents = (directories: string[], rawPath: string | undefined): void => {
  if (!rawPath) return;

  const stripped = stripSurroundingQuotes(rawPath);
  if (!stripped) return;

  let current = extname(stripped).toLowerCase() === '.exe'
    ? dirname(normalize(stripped))
    : normalize(stripped);
  const root = parse(current).root;

  while (current && current !== root) {
    if (!directories.includes(current)) {
      directories.push(current);
    }
    current = dirname(current);
  }
};

export function resolveKnownGameLauncherExecutable(
  game: GameLaunchCandidate,
  options: ResolveKnownLauncherOptions = {},
): string | undefined {
  const pathExists = options.pathExists ?? existsSync;
  const rule = KNOWN_LAUNCHERS.find((candidate) => candidate.matches(game));

  if (!rule) {
    return undefined;
  }

  const directories: string[] = [];
  addDirectoryAndParents(directories, game.installationDirectory);
  addDirectoryAndParents(directories, game.exePath);

  for (const defaultInstallDir of rule.defaultInstallDirs) {
    addDirectoryAndParents(directories, defaultInstallDir);
  }

  for (const directory of directories) {
    const launcherPath = join(directory, rule.launcherExe);
    if (pathExists(launcherPath)) {
      return normalize(launcherPath);
    }
  }

  return undefined;
}

