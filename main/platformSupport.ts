import { constants as fsConstants, promises as fsp } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Single source of truth for the platform differences that game scanning, launcher detection and
 * launching care about. Services import from here instead of testing `process.platform` inline, so
 * adding a platform means editing the tables below rather than hunting for scattered checks.
 */

export const IS_WINDOWS = process.platform === 'win32';
export const IS_MAC = process.platform === 'darwin';
export const IS_LINUX = process.platform === 'linux';

/** Windows env vars that have a sensible default when the variable itself is missing. */
const WINDOWS_ENV_FALLBACKS: Record<string, string> = {
  PROGRAMFILES: 'C:\\Program Files',
  'PROGRAMFILES(X86)': 'C:\\Program Files (x86)',
  PROGRAMDATA: 'C:\\ProgramData',
};

function lookupEnvValue(name: string): string | undefined {
  const direct = process.env[name];
  if (direct) return direct;

  // Windows env lookups are case-insensitive in cmd but not in `process.env` for every casing
  // (`ProgramFiles(x86)` is the one that actually exists), so fall back to a scan.
  const upper = name.toUpperCase();
  for (const [key, value] of Object.entries(process.env)) {
    if (key.toUpperCase() === upper && value) {
      return value;
    }
  }

  return WINDOWS_ENV_FALLBACKS[upper];
}

/**
 * Resolve the variable syntaxes that can appear in a user-configured or defaulted source path:
 * `%VAR%` (Windows) plus `~` and `$VAR`/`${VAR}` (POSIX). Unknown variables are left untouched so
 * the caller's `pathExists` check fails cleanly instead of probing a half-expanded path.
 */
export function expandPathVariables(rawPath: string): string {
  if (!rawPath) return rawPath;

  let expanded = rawPath.replace(/%([^%]+)%/g, (whole, name: string) => lookupEnvValue(name) ?? whole);

  if (!IS_WINDOWS) {
    if (expanded === '~') {
      expanded = homedir();
    } else if (expanded.startsWith('~/')) {
      expanded = join(homedir(), expanded.slice(2));
    }

    expanded = expanded.replace(
      /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
      (whole, braced: string | undefined, bare: string | undefined) =>
        process.env[braced || bare || ''] ?? whole,
    );
  }

  return expanded;
}

function homePaths(...relativePaths: string[]): string[] {
  const home = homedir();
  return relativePaths.map((relativePath) => join(home, ...relativePath.split('/')));
}

/**
 * Steam roots on Linux, in preference order: native, the `.steam/root` symlink, the pre-2019
 * location, then the Flatpak and Snap sandboxes.
 */
export function getLinuxSteamRootCandidates(): string[] {
  return homePaths(
    '.steam/steam',
    '.steam/root',
    '.local/share/Steam',
    '.var/app/com.valvesoftware.Steam/.local/share/Steam',
    'snap/steam/common/.local/share/Steam',
  );
}

/** Heroic Games Launcher config roots (native and Flatpak). Heroic is how Epic and GOG libraries reach Linux. */
export function getLinuxHeroicConfigRoots(): string[] {
  return homePaths(
    '.config/heroic',
    '.var/app/com.heroicgameslauncher.hgl/config/heroic',
  );
}

/** Lutris data roots (native and Flatpak). */
export function getLinuxLutrisRoots(): string[] {
  return homePaths(
    '.local/share/lutris',
    '.var/app/net.lutris.Lutris/data/lutris',
  );
}

/** Bottles data roots (native and Flatpak). */
export function getLinuxBottlesRoots(): string[] {
  return homePaths(
    '.local/share/bottles',
    '.var/app/com.usebottles.bottles/data/bottles',
  );
}

/** itch.io app roots (the desktop app keeps installed games under `apps/`). */
export function getLinuxItchRoots(): string[] {
  return homePaths('.config/itch', '.var/app/io.itch.itch/config/itch');
}

/** Where GOG's native Linux installers drop games by default. */
export function getLinuxGogGameRoots(): string[] {
  return homePaths('GOG Games', 'Games/gog');
}

export async function pathExists(candidate: string): Promise<boolean> {
  try {
    await fsp.access(candidate);
    return true;
  } catch {
    return false;
  }
}

/** First path in `candidates` that exists, or undefined. */
export async function findFirstExistingPath(candidates: string[]): Promise<string | undefined> {
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Extensions that name a runnable game entry point. `.exe` stays in the Linux list because Steam
 * and Heroic libraries are full of Windows builds run through Proton/Wine.
 */
const WINDOWS_EXECUTABLE_EXTENSIONS = ['.exe'];
const POSIX_EXECUTABLE_EXTENSIONS = ['.exe', '.x86_64', '.x64', '.x86', '.appimage', '.sh'];

export function getGameExecutableExtensions(): string[] {
  return IS_WINDOWS ? WINDOWS_EXECUTABLE_EXTENSIONS : POSIX_EXECUTABLE_EXTENSIONS;
}

export interface GameExecutableCandidate {
  /** Lower-cased file name, extension included. */
  lowerName: string;
  /** Lower-cased file name with the recognised executable extension stripped. */
  baseName: string;
}

/**
 * Decide whether a directory entry could be a game's entry point, and hand back the name forms the
 * scanner's exclusion filters work on.
 *
 * Windows is purely extension-driven. On Linux native games just as often ship an extension-less
 * ELF binary, where the executable bit is the only signal — so that branch stats the file, but only
 * for names carrying no suffix at all, which keeps data files (`.pak`, `.dat`, `.so.1`) away from
 * the extra I/O.
 */
export async function describeGameExecutableCandidate(
  fullPath: string,
  entryName: string,
): Promise<GameExecutableCandidate | null> {
  const lowerName = entryName.toLowerCase();

  for (const extension of getGameExecutableExtensions()) {
    if (lowerName.endsWith(extension)) {
      return { lowerName, baseName: lowerName.slice(0, -extension.length) };
    }
  }

  if (!IS_WINDOWS && !lowerName.includes('.')) {
    try {
      await fsp.access(fullPath, fsConstants.X_OK);
      return { lowerName, baseName: lowerName };
    } catch {
      return null;
    }
  }

  return null;
}
