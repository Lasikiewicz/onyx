import { promises as fsp } from 'node:fs';
import { execFile } from 'node:child_process';
import { platform } from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface DetectedLauncher {
  id: string;
  name: string;
  path: string;
  detected: boolean;
  detectionMethod: 'registry' | 'path' | 'none';
}

/**
 * Service to auto-detect installed game launchers on Windows
 */
export class LauncherDetectionService {
  private isWindows: boolean;

  constructor() {
    this.isWindows = platform() === 'win32';
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
   * Detect EA App / Origin
   */
  private async detectEA(): Promise<DetectedLauncher | null> {
    // EA App registry location
    const registryPath = await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Electronic Arts\\EA Desktop',
      'Install Dir'
    ) || await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Electronic Arts\\EA Desktop',
      'Install Dir'
    );

    if (registryPath && await this.checkPath(registryPath)) {
      return {
        id: 'ea',
        name: 'EA App',
        path: registryPath,
        detected: true,
        detectionMethod: 'registry',
      };
    }

    // Try Origin registry
    const originPath = await this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Origin',
      'ClientPath'
    );

    if (originPath) {
      const originDir = originPath.replace(/\\Origin.exe$/, '');
      if (await this.checkPath(originDir)) {
        return {
          id: 'ea',
          name: 'Origin',
          path: originDir,
          detected: true,
          detectionMethod: 'registry',
        };
      }
    }

    // Try default paths
    const defaultPaths = [
      'C:\\Program Files\\EA Games',
      'C:\\Program Files (x86)\\EA Games',
      'C:\\Program Files\\Electronic Arts',
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
   * Detect all installed launchers
   */
  async detectAllLaunchers(): Promise<DetectedLauncher[]> {
    if (!this.isWindows) {
      return [];
    }

    const detectors = [
      () => this.detectSteam(),
      () => this.detectEpic(),
      () => this.detectGOG(),
      () => this.detectEA(),
      () => this.detectXbox(),
      () => this.detectUbisoft(),
      () => this.detectBattle(),
    ];

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
      return null;
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
