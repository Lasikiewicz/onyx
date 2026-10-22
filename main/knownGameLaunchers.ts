import { existsSync } from 'node:fs';
import path from 'node:path';
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

/** Windows install paths keep backslashes. Walk those with win32 so POSIX dirname does not stall. */
function pathApi(value: string): path.PlatformPath {
  return value.includes('\\') ? path.win32 : path;
}

const stripSurroundingQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const isNevernessToEverness = (game: GameLaunchCandidate): boolean => {
  const title = normalizeText(game.title);
  const exeName = normalizeText(pathApi(game.exePath || '').basename(stripSurroundingQuotes(game.exePath || '')));
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
  const api = pathApi(stripped);

  let current = api.extname(stripped).toLowerCase() === '.exe'
    ? api.dirname(api.normalize(stripped))
    : api.normalize(stripped);
  const root = api.parse(current).root;

  while (current && current !== root) {
    if (!directories.includes(current)) {
      directories.push(current);
    }
    const parent = api.dirname(current);
    if (parent === current) break;
    current = parent;
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
    const launcherPath = pathApi(directory).join(directory, rule.launcherExe);
    if (pathExists(launcherPath)) {
      return pathApi(launcherPath).normalize(launcherPath);
    }
  }

  return undefined;
}

