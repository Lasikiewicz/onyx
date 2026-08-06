import { promises as fsp } from 'node:fs';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { readEaInstalledGames } from './eaRegistry.js';
import {
  IS_WINDOWS,
  findFirstExistingPath,
  getLinuxBottlesRoots,
  getLinuxGogGameRoots,
  getLinuxItchRoots,
  getLinuxLutrisRoots,
  getLinuxSteamRootCandidates,
} from './platformSupport.js';
import { findHeroicConfigRoot } from './HeroicService.js';

const execFileAsync = promisify(execFile);

export interface DetectedLauncher {
  id: string;
  name: string;
  path: string;
  detected: boolean;
  detectionMethod: 'registry' | 'path' | 'none';
}

/**
 * Service to auto-detect installed game launchers.
 *
 * Windows detection is registry-first with well-known path fallbacks. Linux has no registry, and the
 * Windows-only stores (Xbox, EA App, Ubisoft Connect, Battle.net, Rockstar) have no native client at
 * all — there Epic and GOG libraries arrive via Heroic, and Lutris/Bottles manage everything else.
 * So the two platforms detect a genuinely different set of launchers, not the same set differently.
 */
export class LauncherDetectionService {
  private isWindows: boolean;

  constructor() {
    this.isWindows = IS_WINDOWS;
  }

  /**
   * Read a Windows Registry value.
   *
   * Async on purpose: detection issues one `reg query` per value across seven launchers, and
   * spawning those synchronously blocks the main process — window paint, input and every
   * other IPC handler — for the duration.
   */
  private async readRegistryValue(key: string, valueName: string): Promise<string | null> {
    if (!this.isWindows) {
      return null;
    }

    try {
      // Args array (no shell) removes any command-injection surface
      const { stdout } = await execFileAsync('reg', ['query', key, '/v', valueName], {
        encoding: 'utf-8',
      });

      // Parse the registry output (escape valueName so regex metacharacters match literally)
      const escapedValueName = valueName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = stdout.match(new RegExp(`${escapedValueName}\\s+REG_[^\\s]+\\s+(.+)`));
      if (match && match[1]) {
        return match[1].trim();
      }
    } catch {
      // Registry key doesn't exist or access denied
      return null;
    }

    return null;
  }

  /**
   * Check if a path exists
   */
  private async checkPath(path: string): Promise<boolean> {
    try {
      await fsp.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Expand environment variables in a path
   */
  private expandPath(path: string): string {
    if (!this.isWindows) {
      return path;
    }

    // Replace common environment variables
    const envVars: Record<string, string> = {
      '%LOCALAPPDATA%': process.env.LOCALAPPDATA || '',
      '%APPDATA%': process.env.APPDATA || '',
      '%USERPROFILE%': process.env.USERPROFILE || '',
      '%PROGRAMFILES%': process.env.PROGRAMFILES || 'C:\\Program Files',
      '%PROGRAMFILES(X86)%': process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
    };

    let expanded = path;
    for (const [key, value] of Object.entries(envVars)) {
      expanded = expanded.replace(key, value);
    }

    return expanded;
  }

  /**
   * Detect Steam installation
   */
  private async detectSteam(): Promise<DetectedLauncher | null> {
    // Try registry first
    const registryPath = await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam',
      'InstallPath'
    ) || await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Valve\\Steam',
      'InstallPath'
    );

    if (registryPath && await this.checkPath(registryPath)) {
      return {
        id: 'steam',
        name: 'Steam',
        path: registryPath,
        detected: true,
        detectionMethod: 'registry',
      };
    }

    // Try default paths
    const defaultPaths = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
    ];

    for (const path of defaultPaths) {
      if (await this.checkPath(path)) {
        return {
          id: 'steam',
          name: 'Steam',
          path: path,
          detected: true,
          detectionMethod: 'path',
        };
      }
    }

    return null;
  }

  /**
   * Detect Epic Games Launcher
   */
  private async detectEpic(): Promise<DetectedLauncher | null> {
    // Epic Games Launcher registry location
    const registryPath = await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Epic Games\\EpicGamesLauncher',
      'AppDataPath'
    );

    if (registryPath) {
      const launcherPath = registryPath.replace(/\\Epic Games Launcher$/, '');
      if (await this.checkPath(launcherPath)) {
        return {
          id: 'epic',
          name: 'Epic Games',
          path: launcherPath,
          detected: true,
          detectionMethod: 'registry',
        };
      }
    }

    // Try default paths
    const defaultPaths = [
      'C:\\Program Files\\Epic Games',
      'C:\\Program Files (x86)\\Epic Games',
    ];

    for (const path of defaultPaths) {
      if (await this.checkPath(path)) {
        return {
          id: 'epic',
          name: 'Epic Games',
          path: path,
          detected: true,
          detectionMethod: 'path',
        };
      }
    }

    return null;
  }

  /**
   * Detect GOG Galaxy
   */
  private async detectGOG(): Promise<DetectedLauncher | null> {
    // GOG Galaxy registry location
    const registryPath = await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\GOG.com\\GalaxyClient',
      'path'
    ) || await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\GOG.com\\GalaxyClient',
      'path'
    );

    if (registryPath && await this.checkPath(registryPath)) {
      return {
        id: 'gog',
        name: 'GOG Galaxy',
        path: registryPath,
        detected: true,
        detectionMethod: 'registry',
      };
    }

    // Try default paths
    const defaultPaths = [
      'C:\\Program Files (x86)\\GOG Galaxy',
      'C:\\Program Files\\GOG Galaxy',
    ];

    for (const path of defaultPaths) {
      if (await this.checkPath(path)) {
        return {
          id: 'gog',
          name: 'GOG Galaxy',
          path: path,
          detected: true,
          detectionMethod: 'path',
        };
      }
    }

    return null;
  }

  /**
   * Normalise a registry value that points at an executable rather than the folder holding it.
   */
  private toDirectory(registryPath: string): string {
    const trimmed = registryPath.trim();
    return /\.exe$/i.test(trimmed) ? dirname(trimmed) : trimmed.replace(/[\\/]+$/, '');
  }

  /**
   * Detect EA App / Origin.
   *
   * The path stored for a source is the root the scanner walks, so for EA that must be a *games
   * library* root — not the client folder. EA installs its client under \Electronic Arts\EA Desktop
   * and its games under an unrelated tree (\EA Games), so a client path yields nothing to scan.
   */
  private async detectEA(): Promise<DetectedLauncher | null> {
    // Best source: the root EA actually installed games into. This is the only branch that
    // finds a library on a non-default drive, which no amount of path guessing will.
    const installRootCounts = new Map<string, { path: string; count: number }>();
    for (const game of await readEaInstalledGames()) {
      const root = dirname(game.installDir);
      // Guard against a game installed at a drive root, which would make the whole drive the scan root
      if (!root || root === dirname(root)) continue;

      const existing = installRootCounts.get(root.toLowerCase());
      if (existing) {
        existing.count++;
      } else {
        installRootCounts.set(root.toLowerCase(), { path: root, count: 1 });
      }
    }

    const rootsByGameCount = Array.from(installRootCounts.values()).sort((a, b) => b.count - a.count);
    for (const root of rootsByGameCount) {
      if (await this.checkPath(root.path)) {
        return {
          id: 'ea',
          name: 'EA App',
          path: root.path,
          detected: true,
          detectionMethod: 'registry',
        };
      }
    }

    // Try the well-known library roots
    const defaultPaths = [
      'C:\\Program Files\\EA Games',
      'C:\\Program Files (x86)\\EA Games',
      'C:\\Program Files\\Origin Games',
      'C:\\Program Files (x86)\\Origin Games',
    ];

    for (const path of defaultPaths) {
      if (await this.checkPath(path)) {
        return {
          id: 'ea',
          name: 'EA App / Origin',
          path: path,
          detected: true,
          detectionMethod: 'path',
        };
      }
    }

    // Last resort: the client folder, so the source is at least reported as detected and
    // scanEA can probe the library sub-folders beneath it. `InstallLocation` is the value EA
    // Desktop actually writes; `Install Dir` and the Origin ClientPath cover older installs,
    // and ClientPath names the executable rather than its directory.
    const clientPath = await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Electronic Arts\\EA Desktop',
      'InstallLocation'
    ) || await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Electronic Arts\\EA Desktop',
      'InstallLocation'
    ) || await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Electronic Arts\\EA Desktop',
      'Install Dir'
    ) || await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Origin',
      'ClientPath'
    );

    if (clientPath) {
      const clientDir = this.toDirectory(clientPath);
      if (clientDir && await this.checkPath(clientDir)) {
        return {
          id: 'ea',
          name: 'EA App / Origin',
          path: clientDir,
          detected: true,
          detectionMethod: 'registry',
        };
      }
    }

    return null;
  }

  /**
   * Detect Xbox Game Pass (Windows Store games)
   */
  private async detectXbox(): Promise<DetectedLauncher | null> {
    // Xbox games are typically in these locations
    const defaultPaths = [
      'C:\\XboxGames',
      'C:\\Program Files\\WindowsApps',
    ];

    for (const path of defaultPaths) {
      if (await this.checkPath(path)) {
        return {
          id: 'xbox',
          name: 'Xbox Game Pass',
          path: path,
          detected: true,
          detectionMethod: 'path',
        };
      }
    }

    return null;
  }

  /**
   * Detect Ubisoft Connect
   */
  private async detectUbisoft(): Promise<DetectedLauncher | null> {
    // Try registry first
    const registryPath = await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher',
      'InstallDir'
    ) || await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Ubisoft\\Launcher',
      'InstallDir'
    );

    if (registryPath && await this.checkPath(registryPath)) {
      return {
        id: 'ubisoft',
        name: 'Ubisoft Connect',
        path: registryPath,
        detected: true,
        detectionMethod: 'registry',
      };
    }

    // Try default paths
    const defaultPaths = [
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher',
      'C:\\Program Files\\Ubisoft\\Ubisoft Game Launcher',
    ];

    for (const path of defaultPaths) {
      if (await this.checkPath(path)) {
        return {
          id: 'ubisoft',
          name: 'Ubisoft Connect',
          path: path,
          detected: true,
          detectionMethod: 'path',
        };
      }
    }

    return null;
  }

  /**
   * Detect Battle.net
   */
  private async detectBattle(): Promise<DetectedLauncher | null> {
    // Try registry first
    const registryPath = await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Battle.net',
      'InstallLocation'
    ) || await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Battle.net',
      'InstallLocation'
    );

    if (registryPath && await this.checkPath(registryPath)) {
      return {
        id: 'battle',
        name: 'Battle.net',
        path: registryPath,
        detected: true,
        detectionMethod: 'registry',
      };
    }

    // Try default paths
    const defaultPaths = [
      'C:\\Program Files (x86)\\Battle.net',
      'C:\\Program Files\\Battle.net',
    ];

    for (const path of defaultPaths) {
      if (await this.checkPath(path)) {
        return {
          id: 'battle',
          name: 'Battle.net',
          path: path,
          detected: true,
          detectionMethod: 'path',
        };
      }
    }

    return null;
  }

  /**
   * First existing path among `candidates`, reported under the given launcher identity.
   */
  private async detectByPaths(
    id: string,
    name: string,
    candidates: string[],
  ): Promise<DetectedLauncher | null> {
    for (const path of candidates) {
      if (await this.checkPath(path)) {
        return { id, name, path, detected: true, detectionMethod: 'path' };
      }
    }
    return null;
  }

  /**
   * Detect Steam on Linux across the native, legacy, Flatpak and Snap locations.
   */
  private async detectLinuxSteam(): Promise<DetectedLauncher | null> {
    return this.detectByPaths('steam', 'Steam', getLinuxSteamRootCandidates());
  }

  /**
   * Detect Heroic, reported once per store it fronts so Epic and GOG appear as separate sources in
   * the UI exactly as they do on Windows. The reported path is Heroic's config root: the scanners
   * read Heroic's install records from there rather than walking a games folder.
   */
  private async detectLinuxHeroic(source: 'epic' | 'gog'): Promise<DetectedLauncher | null> {
    const configRoot = await findHeroicConfigRoot();
    if (!configRoot) {
      return null;
    }

    return {
      id: source,
      name: source === 'epic' ? 'Epic Games (Heroic)' : 'GOG (Heroic)',
      path: configRoot,
      detected: true,
      detectionMethod: 'path',
    };
  }

  /** Native GOG installs land outside Heroic too, so probe the installer's default roots. */
  private async detectLinuxGogGames(): Promise<DetectedLauncher | null> {
    return this.detectByPaths('gog', 'GOG Games', getLinuxGogGameRoots());
  }

  /**
   * Detect Lutris by its data directory, but report the folder it *installs games into*: the stored
   * path is what the scanner walks, and Lutris' data directory holds its sqlite library rather than
   * any games.
   */
  private async detectLinuxLutris(): Promise<DetectedLauncher | null> {
    const dataRoot = await findFirstExistingPath(getLinuxLutrisRoots());
    if (!dataRoot) {
      return null;
    }

    const gamesRoot = await findFirstExistingPath([join(homedir(), 'Games')]);
    return {
      id: 'lutris',
      name: 'Lutris',
      path: gamesRoot ?? dataRoot,
      detected: true,
      detectionMethod: 'path',
    };
  }

  /** Detect Bottles, reporting the bottles root so each prefix's `drive_c` is reachable by a scan. */
  private async detectLinuxBottles(): Promise<DetectedLauncher | null> {
    const dataRoot = await findFirstExistingPath(getLinuxBottlesRoots());
    if (!dataRoot) {
      return null;
    }

    const bottlesRoot = await findFirstExistingPath([join(dataRoot, 'bottles')]);
    return {
      id: 'bottles',
      name: 'Bottles',
      path: bottlesRoot ?? dataRoot,
      detected: true,
      detectionMethod: 'path',
    };
  }

  private async detectLinuxItch(): Promise<DetectedLauncher | null> {
    const roots = getLinuxItchRoots();
    // The desktop app keeps installed games under `apps/`; that is the folder worth scanning.
    return this.detectByPaths('itch', 'itch.io', [...roots.map((root) => join(root, 'apps')), ...roots]);
  }

  private linuxDetectors(): Array<() => Promise<DetectedLauncher | null>> {
    return [
      () => this.detectLinuxSteam(),
      () => this.detectLinuxHeroic('epic'),
      () => this.detectLinuxHeroic('gog').then((heroic) => heroic ?? this.detectLinuxGogGames()),
      () => this.detectLinuxLutris(),
      () => this.detectLinuxBottles(),
      () => this.detectLinuxItch(),
    ];
  }

  /**
   * Detect all installed launchers
   */
  async detectAllLaunchers(): Promise<DetectedLauncher[]> {
    const detectors = this.isWindows
      ? [
        () => this.detectSteam(),
        () => this.detectEpic(),
        () => this.detectGOG(),
        () => this.detectEA(),
        () => this.detectXbox(),
        () => this.detectUbisoft(),
        () => this.detectBattle(),
      ]
      : this.linuxDetectors();

    // Run in parallel: the detectors are independent and each is dominated by process-spawn
    // latency, so serialising them multiplies the wait for no benefit. Order of the returned
    // array still follows `detectors` because Promise.all preserves position.
    const results = await Promise.all(detectors.map(async (detector) => {
      try {
        return await detector();
      } catch (error) {
        console.error('Error detecting launcher:', error);
        return null;
      }
    }));

    return results.filter((result): result is DetectedLauncher => result !== null);
  }

  /**
   * Detect a specific launcher by ID
   */
  async detectLauncher(launcherId: string): Promise<DetectedLauncher | null> {
    if (!this.isWindows) {
      switch (launcherId) {
        case 'steam':
          return this.detectLinuxSteam();
        case 'epic':
          return this.detectLinuxHeroic('epic');
        case 'gog':
          return (await this.detectLinuxHeroic('gog')) ?? this.detectLinuxGogGames();
        case 'lutris':
          return this.detectLinuxLutris();
        case 'bottles':
          return this.detectLinuxBottles();
        case 'itch':
          return this.detectLinuxItch();
        default:
          // Xbox, EA App, Ubisoft Connect, Battle.net and Rockstar have no Linux client.
          return null;
      }
    }

    switch (launcherId) {
      case 'steam':
        return this.detectSteam();
      case 'epic':
        return this.detectEpic();
      case 'gog':
        return this.detectGOG();
      case 'ea':
        return this.detectEA();
      case 'xbox':
        return this.detectXbox();
      case 'ubisoft':
        return this.detectUbisoft();
      case 'battle':
        return this.detectBattle();
      default:
        return null;
    }
  }
}
