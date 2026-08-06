/**
 * The library sources Onyx offers, and where each one installs games by default.
 *
 * The two platforms expose a genuinely different set of sources rather than the same set with
 * different paths: Xbox Game Pass, EA App, Ubisoft Connect, Battle.net, Humble and Rockstar have no
 * Linux client at all, while Epic and GOG reach Linux through Heroic and Lutris/Bottles manage
 * everything else. Listing a source with no client would only give the user a row that can never
 * find anything.
 *
 * Paths may contain variables (`%LOCALAPPDATA%` on Windows, `~` on Linux); the main process expands
 * them when it scans, so they are stored and displayed exactly as written here.
 */

export interface LibrarySourceDefinition {
  id: string;
  name: string;
  defaultPaths: string[];
  placeholder: string;
}

export type HostPlatform = NodeJS.Platform;

const WINDOWS_SOURCES: LibrarySourceDefinition[] = [
  {
    id: 'steam',
    name: 'Steam',
    defaultPaths: ['C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam'],
    placeholder: 'C:\\Program Files (x86)\\Steam',
  },
  {
    id: 'epic',
    name: 'Epic Games',
    defaultPaths: ['C:\\Program Files\\Epic Games', 'C:\\Program Files (x86)\\Epic Games'],
    placeholder: 'C:\\Program Files\\Epic Games',
  },
  {
    id: 'ea',
    name: 'EA App / Origin',
    defaultPaths: [
      'C:\\Program Files\\EA Games',
      'C:\\Program Files (x86)\\EA Games',
      'C:\\Program Files\\Electronic Arts',
    ],
    placeholder: 'C:\\Program Files\\EA Games',
  },
  {
    id: 'gog',
    name: 'GOG Galaxy',
    defaultPaths: ['C:\\Program Files (x86)\\GOG Galaxy', 'C:\\Program Files\\GOG Galaxy'],
    placeholder: 'C:\\Program Files (x86)\\GOG Galaxy',
  },
  {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    defaultPaths: [
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher',
      'C:\\Program Files\\Ubisoft\\Ubisoft Game Launcher',
    ],
    placeholder: 'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher',
  },
  {
    id: 'battle',
    name: 'Battle.net',
    defaultPaths: ['C:\\Program Files (x86)\\Battle.net', 'C:\\Program Files\\Battle.net'],
    placeholder: 'C:\\Program Files (x86)\\Battle.net',
  },
  {
    id: 'xbox',
    name: 'Xbox Game Pass',
    defaultPaths: ['C:\\XboxGames', 'C:\\Program Files\\WindowsApps'],
    placeholder: 'C:\\XboxGames',
  },
  {
    id: 'humble',
    name: 'Humble',
    defaultPaths: [
      'C:\\Program Files\\Humble App',
      'C:\\Program Files (x86)\\Humble App',
      '%LOCALAPPDATA%\\Humble App',
    ],
    placeholder: 'C:\\Program Files\\Humble App',
  },
  {
    id: 'itch',
    name: 'itch.io',
    defaultPaths: ['%LOCALAPPDATA%\\itch', 'C:\\Program Files\\itch', 'C:\\Program Files (x86)\\itch'],
    placeholder: '%LOCALAPPDATA%\\itch',
  },
  {
    id: 'rockstar',
    name: 'Rockstar Games',
    defaultPaths: [
      'C:\\Program Files\\Rockstar Games',
      'C:\\Program Files (x86)\\Rockstar Games',
      '%USERPROFILE%\\Documents\\Rockstar Games',
    ],
    placeholder: 'C:\\Program Files\\Rockstar Games',
  },
];

const LINUX_SOURCES: LibrarySourceDefinition[] = [
  {
    id: 'steam',
    name: 'Steam',
    // Native, the legacy layout, then the Flatpak and Snap sandboxes.
    defaultPaths: [
      '~/.steam/steam',
      '~/.local/share/Steam',
      '~/.var/app/com.valvesoftware.Steam/.local/share/Steam',
      '~/snap/steam/common/.local/share/Steam',
    ],
    placeholder: '~/.steam/steam',
  },
  {
    id: 'epic',
    name: 'Epic Games (Heroic)',
    // Heroic's config root: the scan reads its install records, it does not walk this folder.
    defaultPaths: ['~/.config/heroic', '~/.var/app/com.heroicgameslauncher.hgl/config/heroic'],
    placeholder: '~/.config/heroic',
  },
  {
    id: 'gog',
    name: 'GOG (Heroic)',
    // Heroic first; falls back to walking the folder GOG's native installers use.
    defaultPaths: ['~/.config/heroic', '~/GOG Games'],
    placeholder: '~/.config/heroic',
  },
  {
    id: 'lutris',
    name: 'Lutris',
    defaultPaths: ['~/Games'],
    placeholder: '~/Games',
  },
  {
    id: 'bottles',
    name: 'Bottles',
    defaultPaths: [
      '~/.local/share/bottles/bottles',
      '~/.var/app/com.usebottles.bottles/data/bottles/bottles',
    ],
    placeholder: '~/.local/share/bottles/bottles',
  },
  {
    id: 'itch',
    name: 'itch.io',
    defaultPaths: ['~/.config/itch/apps', '~/.var/app/io.itch.itch/config/itch/apps'],
    placeholder: '~/.config/itch/apps',
  },
];

/** Library sources available on the given platform, in display order. */
export const getLibrarySourceDefinitions = (platform: HostPlatform): LibrarySourceDefinition[] =>
  platform === 'win32' ? WINDOWS_SOURCES : LINUX_SOURCES;

/**
 * Resolve the host platform, falling back to Windows if the bridge is unavailable (older preload, or
 * a test render without `electronAPI`) so the source list is never empty.
 */
export const resolveHostPlatform = async (): Promise<HostPlatform> => {
  try {
    const platform = await window.electronAPI?.getPlatform?.();
    return platform ?? 'win32';
  } catch {
    return 'win32';
  }
};
