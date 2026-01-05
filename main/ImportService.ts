import { SteamService, SteamGame } from './SteamService.js';
import { XboxService, XboxGame } from './XboxService.js';
import { AppConfigService } from './AppConfigService.js';
import { MetadataFetcherService } from './MetadataFetcherService.js';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface ScannedGameResult {
  uuid: string;
  source: 'steam' | 'epic' | 'gog' | 'xbox' | 'manual_file' | 'manual_folder';
  originalName: string;
  installPath: string;
  exePath?: string;
  appId?: string;
  title: string;
  status: 'pending' | 'scanning' | 'matched' | 'ambiguous' | 'ready' | 'error';
  error?: string;
}

/**
 * Service to orchestrate scanning from all game sources
 * Returns simplified structures that can be converted to StagedGame in the frontend
 */
export class ImportService {
  private steamService: SteamService;
  private xboxService: XboxService;
  private appConfigService: AppConfigService;
  private metadataFetcher: MetadataFetcherService;

  constructor(
    steamService: SteamService,
    xboxService: XboxService,
    appConfigService: AppConfigService,
    metadataFetcher: MetadataFetcherService
  ) {
    this.steamService = steamService;
    this.xboxService = xboxService;
    this.appConfigService = appConfigService;
    this.metadataFetcher = metadataFetcher;
  }

  /**
   * Scan all configured sources in parallel
   * Returns a simplified structure that the frontend can convert to StagedGame
   */
  async scanAllSources(): Promise<ScannedGameResult[]> {
    const results: ScannedGameResult[] = [];

    try {
      // Get all enabled app configs
      const configs = await this.appConfigService.getAppConfigs();
      const enabledConfigs = Object.values(configs).filter(
        (config: any) => config.enabled && config.path && existsSync(config.path)
      );

      // Scan all sources in parallel
      const scanPromises = enabledConfigs.map(async (config: any) => {
        try {
          if (config.id === 'steam') {
            return this.scanSteam(config.path);
          } else if (config.id === 'xbox') {
            return this.scanXbox(config.path);
          } else if (config.id === 'epic') {
            return this.scanEpic(config.path);
          } else if (config.id === 'gog') {
            return this.scanGOG(config.path);
          }
          return [];
        } catch (error) {
          console.error(`Error scanning ${config.id}:`, error);
          return [];
        }
      });

      const scanResults = await Promise.all(scanPromises);
      
      // Flatten results
      for (const scanResult of scanResults) {
        results.push(...scanResult);
      }
    } catch (error) {
      console.error('Error in scanAllSources:', error);
    }

    return results;
  }

  /**
   * Scan Steam games
   */
  private async scanSteam(steamPath: string): Promise<ScannedGameResult[]> {
    try {
      this.steamService.setSteamPath(steamPath);
      const steamGames = this.steamService.scanSteamGames();
      
      return steamGames.map((game: SteamGame) => ({
        uuid: `steam-${game.appId}-${Date.now()}`,
        source: 'steam' as const,
        originalName: game.name,
        installPath: game.installDir,
        exePath: undefined, // Steam games use steam:// protocol
        appId: game.appId,
        title: game.name,
        status: 'ready' as const, // Steam games with AppID are ready
      }));
    } catch (error) {
      console.error('Error scanning Steam:', error);
      return [];
    }
  }

  /**
   * Scan Xbox games
   */
  private async scanXbox(xboxPath: string): Promise<ScannedGameResult[]> {
    try {
      const xboxGames = this.xboxService.scanGames(xboxPath);
      
      return xboxGames.map((game: XboxGame) => ({
        uuid: `${game.id}-${Date.now()}`,
        source: 'xbox' as const,
        originalName: game.name,
        installPath: game.installPath,
        exePath: game.installPath, // Xbox games have direct exe paths
        appId: undefined,
        title: game.name,
        status: 'ambiguous' as const, // Xbox games need metadata matching
      }));
    } catch (error) {
      console.error('Error scanning Xbox:', error);
      return [];
    }
  }

  /**
   * Scan Epic Games Launcher for installed games
   */
  private async scanEpic(epicPath: string): Promise<ScannedGameResult[]> {
    try {
      const results: ScannedGameResult[] = [];
      
      // Epic Games stores manifests in: {EpicPath}\Epic Games Launcher\Data\Manifests
      const manifestsPath = join(epicPath, 'Epic Games Launcher', 'Data', 'Manifests');
      
      if (!existsSync(manifestsPath)) {
        console.warn(`Epic Games manifests folder not found: ${manifestsPath}`);
        return results;
      }

      const manifestFiles = readdirSync(manifestsPath).filter(f => f.endsWith('.item'));
      
      for (const manifestFile of manifestFiles) {
        try {
          const manifestPath = join(manifestsPath, manifestFile);
          const manifestContent = readFileSync(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);
          
          // Epic manifest structure
          const appName = manifest.DisplayName || manifest.LaunchExecutable || 'Unknown';
          const installLocation = manifest.InstallLocation;
          const launchExecutable = manifest.LaunchExecutable;
          const catalogNamespace = manifest.CatalogNamespace;
          const catalogItemId = manifest.CatalogItemId;
          
          if (installLocation && existsSync(installLocation)) {
            // Find the executable
            let exePath: string | undefined;
            
            if (launchExecutable) {
              const fullExePath = join(installLocation, launchExecutable);
              if (existsSync(fullExePath)) {
                exePath = fullExePath;
              }
            }
            
            // If no launch executable specified, search for common exe names
            if (!exePath) {
              const commonExes = [
                join(installLocation, `${appName}.exe`),
                join(installLocation, 'Binaries', 'Win64', `${appName}.exe`),
                join(installLocation, 'Binaries', 'Win32', `${appName}.exe`),
              ];
              
              for (const exe of commonExes) {
                if (existsSync(exe)) {
                  exePath = exe;
                  break;
                }
              }
            }
            
            // Create a unique ID from catalog info or use manifest filename
            const appId = catalogItemId || manifestFile.replace('.item', '');
            
            results.push({
              uuid: `epic-${appId}-${Date.now()}`,
              source: 'epic' as const,
              originalName: appName,
              installPath: installLocation,
              exePath: exePath,
              appId: appId,
              title: appName,
              status: 'ambiguous' as const, // Epic games need metadata matching
            });
          }
        } catch (err) {
          console.error(`Error parsing Epic manifest ${manifestFile}:`, err);
          continue;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error scanning Epic Games:', error);
      return [];
    }
  }

  /**
   * Scan GOG Galaxy for installed games
   */
  private async scanGOG(gogPath: string): Promise<ScannedGameResult[]> {
    try {
      const results: ScannedGameResult[] = [];
      
      // GOG Galaxy stores game info in: {GOGPath}\Galaxy\storage\galaxy-2.0.db
      // For simplicity, we'll scan the games folder if it exists
      // GOG games are typically in: {GOGPath}\Games
      const gamesPath = join(gogPath, 'Games');
      
      if (!existsSync(gamesPath)) {
        // Try alternative location
        const altGamesPath = join(gogPath, 'Galaxy', 'Games');
        if (existsSync(altGamesPath)) {
          return this.scanGOGGamesFolder(altGamesPath);
        }
        console.warn(`GOG Games folder not found: ${gamesPath}`);
        return results;
      }

      return this.scanGOGGamesFolder(gamesPath);
    } catch (error) {
      console.error('Error scanning GOG:', error);
      return [];
    }
  }

  /**
   * Scan GOG games folder for executables
   */
  private scanGOGGamesFolder(gamesPath: string): ScannedGameResult[] {
    const results: ScannedGameResult[] = [];
    
    try {
      const gameFolders = readdirSync(gamesPath);
      
      for (const gameFolder of gameFolders) {
        const gamePath = join(gamesPath, gameFolder);
        
        try {
          const stats = statSync(gamePath);
          if (!stats.isDirectory()) continue;
          
          // Look for .exe files in the game folder
          const exeFiles = this.findExecutables(gamePath);
          
          // Filter out helper executables
          const gameExes = exeFiles.filter(exe => {
            const fileName = exe.toLowerCase();
            return !fileName.includes('gamelaunchhelper') &&
                   !fileName.includes('bootstrapper') &&
                   !fileName.includes('uninstall') &&
                   !fileName.includes('setup') &&
                   !fileName.includes('installer');
          });
          
          if (gameExes.length > 0) {
            // Use the first executable found
            const mainExe = gameExes[0];
            
            results.push({
              uuid: `gog-${gameFolder}-${Date.now()}`,
              source: 'gog' as const,
              originalName: gameFolder,
              installPath: gamePath,
              exePath: mainExe,
              appId: undefined,
              title: gameFolder,
              status: 'ambiguous' as const, // GOG games need metadata matching
            });
          }
        } catch (err) {
          // Skip folders we can't access
          continue;
        }
      }
    } catch (err) {
      console.error('Error scanning GOG games folder:', err);
    }
    
    return results;
  }

  /**
   * Find executable files in a directory (recursive, max depth 3)
   */
  private findExecutables(dirPath: string, depth: number = 0, maxDepth: number = 3): string[] {
    const executables: string[] = [];
    
    if (depth > maxDepth) return executables;
    
    const excludeNames = [
      'gamelaunchhelper.exe',
      'bootstrapper.exe',
      'gamelaunchhelper',
      'bootstrapper',
    ];
    
    try {
      const entries = readdirSync(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        
        try {
          const stats = statSync(fullPath);
          
          if (stats.isFile() && entry.toLowerCase().endsWith('.exe')) {
            const lowerName = entry.toLowerCase();
            const baseName = lowerName.replace('.exe', '');
            
            // Check exact matches first
            if (excludeNames.includes(lowerName) || excludeNames.includes(baseName)) {
              continue;
            }
            
            // Check patterns
            if (!lowerName.includes('installer') &&
                !lowerName.includes('setup') &&
                !lowerName.includes('uninstall') &&
                !lowerName.includes('launcher') &&
                !lowerName.includes('updater') &&
                !lowerName.includes('gamelaunchhelper') &&
                !lowerName.includes('bootstrapper')) {
              executables.push(fullPath);
            }
          } else if (stats.isDirectory() && depth < maxDepth) {
            // Recursively search subdirectories
            const subExes = this.findExecutables(fullPath, depth + 1, maxDepth);
            executables.push(...subExes);
          }
        } catch (err) {
          // Skip entries we can't access
          continue;
        }
      }
    } catch (err) {
      // Skip directories we can't access
    }
    
    return executables;
  }

  /**
   * Scan a folder for manual executables
   */
  async scanFolderForExecutables(folderPath: string): Promise<ScannedGameResult[]> {
    // This will be handled by the existing IPC handler
    // We'll just return an empty array here as the frontend will call the existing handler
    return [];
  }
}
