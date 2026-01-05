import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { platform } from 'node:os';

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
   * Read a Windows Registry value
   */
  private readRegistryValue(key: string, valueName: string): string | null {
    if (!this.isWindows) {
      return null;
    }

    try {
      const result = execSync(`reg query "${key}" /v "${valueName}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      
      // Parse the registry output
      const match = result.match(new RegExp(`${valueName}\\s+REG_[^\\s]+\\s+(.+)`));
      if (match && match[1]) {
        return match[1].trim();
      }
    } catch (error) {
      // Registry key doesn't exist or access denied
      return null;
    }

    return null;
  }

  /**
   * Check if a path exists
   */
  private checkPath(path: string): boolean {
    try {
      return existsSync(path);
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
  private detectSteam(): DetectedLauncher | null {
    // Try registry first
    const registryPath = this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam',
      'InstallPath'
    ) || this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Valve\\Steam',
      'InstallPath'
    );

    if (registryPath && this.checkPath(registryPath)) {
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
      if (this.checkPath(path)) {
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
  private detectEpic(): DetectedLauncher | null {
    // Epic Games Launcher registry location
    const registryPath = this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Epic Games\\EpicGamesLauncher',
      'AppDataPath'
    );

    if (registryPath) {
      const launcherPath = registryPath.replace(/\\Epic Games Launcher$/, '');
      if (this.checkPath(launcherPath)) {
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
      if (this.checkPath(path)) {
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
  private detectGOG(): DetectedLauncher | null {
    // GOG Galaxy registry location
    const registryPath = this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\GOG.com\\GalaxyClient',
      'path'
    ) || this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\GOG.com\\GalaxyClient',
      'path'
    );

    if (registryPath && this.checkPath(registryPath)) {
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
      if (this.checkPath(path)) {
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
  private detectEA(): DetectedLauncher | null {
    // EA App registry location
    const registryPath = this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Electronic Arts\\EA Desktop',
      'Install Dir'
    ) || this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Electronic Arts\\EA Desktop',
      'Install Dir'
    );

    if (registryPath && this.checkPath(registryPath)) {
      return {
        id: 'ea',
        name: 'EA App',
        path: registryPath,
        detected: true,
        detectionMethod: 'registry',
      };
    }

    // Try Origin registry
    const originPath = this.readRegistryValue(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Origin',
      'ClientPath'
    );

    if (originPath) {
      const originDir = originPath.replace(/\\Origin.exe$/, '');
      if (this.checkPath(originDir)) {
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
      if (this.checkPath(path)) {
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
  private detectXbox(): DetectedLauncher | null {
    // Xbox games are typically in these locations
    const defaultPaths = [
      'C:\\XboxGames',
      'C:\\Program Files\\WindowsApps',
    ];

    for (const path of defaultPaths) {
      if (this.checkPath(path)) {
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
   * Detect all installed launchers
   */
  async detectAllLaunchers(): Promise<DetectedLauncher[]> {
    if (!this.isWindows) {
      return [];
    }

    const detected: DetectedLauncher[] = [];

    const detectors = [
      () => this.detectSteam(),
      () => this.detectEpic(),
      () => this.detectGOG(),
      () => this.detectEA(),
      () => this.detectXbox(),
    ];

    for (const detector of detectors) {
      try {
        const result = detector();
        if (result) {
          detected.push(result);
        }
      } catch (error) {
        console.error('Error detecting launcher:', error);
      }
    }

    return detected;
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
      default:
        return null;
    }
  }
}
