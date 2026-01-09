import { SteamService, SteamGame } from './SteamService.js';
import { XboxService, XboxGame } from './XboxService.js';
import { AppConfigService } from './AppConfigService.js';
import { MetadataFetcherService } from './MetadataFetcherService.js';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

export interface ScannedGameResult {
  uuid: string;
  source: 'steam' | 'epic' | 'gog' | 'xbox' | 'ubisoft' | 'rockstar' | 'manual_file' | 'manual_folder';
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
   * Scans all enabled app locations from Onyx Settings > Apps
   * Returns a simplified structure that the frontend can convert to StagedGame
   */
  async scanAllSources(): Promise<ScannedGameResult[]> {
    const results: ScannedGameResult[] = [];

    try {
      // Get all enabled app configs from Onyx Settings > Apps
      const configs = await this.appConfigService.getAppConfigs();
      console.log(`[ImportService] Found ${Object.keys(configs).length} app configs`);
      
      const enabledConfigs = Object.values(configs).filter(
        (config: any) => {
          const isEnabled = config.enabled && config.path && existsSync(config.path);
          if (!isEnabled) {
            console.log(`[ImportService] Skipping ${config.id}: enabled=${config.enabled}, path=${config.path}, exists=${config.path ? existsSync(config.path) : false}`);
          }
          return isEnabled;
        }
      );
      
      console.log(`[ImportService] Scanning ${enabledConfigs.length} enabled app configs`);

      // Scan all sources in parallel
      const scanPromises = enabledConfigs.map(async (config: any) => {
        try {
          console.log(`[ImportService] Scanning ${config.id} at path: ${config.path}`);
          if (config.id === 'steam') {
            return this.scanSteam(config.path);
          } else if (config.id === 'xbox') {
            return this.scanXbox(config.path);
          } else if (config.id === 'epic') {
            return this.scanEpic(config.path);
          } else if (config.id === 'gog') {
            return this.scanGOG(config.path);
          } else if (config.id === 'ubisoft') {
            return this.scanUbisoft(config.path);
          } else if (config.id === 'rockstar') {
            return this.scanRockstar(config.path);
          }
          return [];
        } catch (error) {
          console.error(`[ImportService] Error scanning ${config.id}:`, error);
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
      
      return xboxGames.map((game: XboxGame) => {
        // XboxService returns installPath as the full exe path for both UWP and PC games
        // Extract the folder path for installPath, keep exe path separate
        const exePath = game.installPath;
        const pathParts = game.installPath.split(/[/\\]/);
        pathParts.pop(); // Remove the exe filename
        const installPath = pathParts.join(sep);
        
        return {
          uuid: `${game.id}-${Date.now()}`,
          source: 'xbox' as const,
          originalName: game.name,
          installPath: installPath,
          exePath: exePath,
          appId: undefined,
          title: game.name,
          status: 'ambiguous' as const, // Xbox games need metadata matching
        };
      });
    } catch (error) {
      console.error('Error scanning Xbox:', error);
      return [];
    }
  }

  /**
   * Scan Epic Games Launcher for installed games
   * First tries to read from manifests, then falls back to scanning game folders directly
   */
  private async scanEpic(epicPath: string): Promise<ScannedGameResult[]> {
    try {
      const results: ScannedGameResult[] = [];
      
      // Epic Games stores manifests in: {EpicPath}\Epic Games Launcher\Data\Manifests
      const manifestsPath = join(epicPath, 'Epic Games Launcher', 'Data', 'Manifests');
      
      if (existsSync(manifestsPath)) {
        // Try to read from manifests first (preferred method)
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
      }
      
      // Fallback: Scan Epic Games directory directly for game folders
      // This handles cases where manifests aren't available or games are installed directly
      if (!existsSync(epicPath)) {
        return results;
      }
      
      try {
        const entries = readdirSync(epicPath);
        
        for (const entry of entries) {
          // Skip the Epic Games Launcher folder and other non-game folders
          if (entry === 'Epic Games Launcher' || entry === 'UnrealEngine') {
            continue;
          }
          
          const gamePath = join(epicPath, entry);
          
          try {
            const stats = statSync(gamePath);
            if (!stats.isDirectory()) {
              continue;
            }
            
            // Check if we already found this game from manifests
            const alreadyFound = results.some(r => r.installPath === gamePath);
            if (alreadyFound) {
              continue;
            }
            
            // Look for executables in this game folder
            const exeFiles = this.findExecutables(gamePath);
            
            // Filter out helper executables
            const gameExes = exeFiles.filter(exe => {
              const fileName = exe.toLowerCase();
              return !fileName.includes('gamelaunchhelper') &&
                     !fileName.includes('bootstrapper') &&
                     !fileName.includes('uninstall') &&
                     !fileName.includes('setup') &&
                     !fileName.includes('installer') &&
                     !fileName.includes('launcher');
            });
            
            if (gameExes.length > 0) {
              // Use the first executable found
              const mainExe = gameExes[0];
              
              results.push({
                uuid: `epic-${entry}-${Date.now()}`,
                source: 'epic' as const,
                originalName: entry,
                installPath: gamePath,
                exePath: mainExe,
                appId: undefined,
                title: entry,
                status: 'ambiguous' as const, // Epic games need metadata matching
              });
            }
          } catch (err) {
            // Skip folders we can't access
            continue;
          }
        }
      } catch (err) {
        console.error('Error scanning Epic Games directory:', err);
      }
      
      return results;
    } catch (error) {
      console.error('Error scanning Epic Games:', error);
      return [];
    }
  }

  /**
   * Scan GOG Galaxy for installed games
   * Games are located in: {GOGPath}\Games
   * Example: C:\Program Files (x86)\GOG Galaxy\Games
   */
  private async scanGOG(gogPath: string): Promise<ScannedGameResult[]> {
    try {
      const results: ScannedGameResult[] = [];
      
      // GOG games are in: {GOGPath}\Games
      // If path is already the Games folder, use it directly
      let gamesPath: string;
      if (gogPath.toLowerCase().endsWith('games')) {
        gamesPath = gogPath;
      } else {
        gamesPath = join(gogPath, 'Games');
      }
      
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
   * Scan Ubisoft Connect for installed games
   * Games are located in: {UbisoftPath}\games
   * Example: C:\Program Files (x86)\Ubisoft\Ubisoft Game Launcher\games
   */
  private async scanUbisoft(ubisoftPath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[Ubisoft] Starting scan with path: ${ubisoftPath}`);
      const results: ScannedGameResult[] = [];
      
      // Ubisoft games are in: {UbisoftPath}\games (lowercase)
      // If path is already the games folder, use it directly
      let gamesPath: string;
      if (ubisoftPath.toLowerCase().endsWith('games')) {
        gamesPath = ubisoftPath;
      } else {
        gamesPath = join(ubisoftPath, 'games');
      }
      
      console.log(`[Ubisoft] Checking games folder: ${gamesPath}`);
      
      if (!existsSync(gamesPath)) {
        console.warn(`[Ubisoft] Games folder not found: ${gamesPath}`);
        // Try alternative path structure (some installations might be different)
        const altPath = join(ubisoftPath, 'Games');
        if (existsSync(altPath)) {
          console.log(`[Ubisoft] Found games in alternative path: ${altPath}`);
          gamesPath = altPath;
        } else {
          return results;
        }
      }

      console.log(`[Ubisoft] Scanning games folder: ${gamesPath}`);
      const scannedGames = this.scanUbisoftGamesFolder(gamesPath);
      console.log(`[Ubisoft] Found ${scannedGames.length} games`);
      return scannedGames;
    } catch (error) {
      console.error('[Ubisoft] Error scanning Ubisoft:', error);
      return [];
    }
  }

  /**
   * Scan Ubisoft games folder for executables
   */
  private scanUbisoftGamesFolder(gamesPath: string): ScannedGameResult[] {
    const results: ScannedGameResult[] = [];
    
    try {
      const gameFolders = readdirSync(gamesPath);
      console.log(`[Ubisoft] Found ${gameFolders.length} items in games folder`);
      
      for (const gameFolder of gameFolders) {
        const gamePath = join(gamesPath, gameFolder);
        
        try {
          const stats = statSync(gamePath);
          if (!stats.isDirectory()) {
            console.log(`[Ubisoft] Skipping non-directory: ${gameFolder}`);
            continue;
          }
          
          console.log(`[Ubisoft] Scanning game folder: ${gameFolder}`);
          
          // Look for .exe files in the game folder
          const exeFiles = this.findExecutables(gamePath);
          console.log(`[Ubisoft] Found ${exeFiles.length} executables in ${gameFolder}`);
          
          // Filter out helper executables
          const gameExes = exeFiles.filter(exe => {
            const fileName = exe.toLowerCase();
            const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
            return !fileNameOnly.includes('gamelaunchhelper') &&
                   !fileNameOnly.includes('bootstrapper') &&
                   !fileNameOnly.includes('uninstall') &&
                   !fileNameOnly.includes('setup') &&
                   !fileNameOnly.includes('installer') &&
                   !fileNameOnly.includes('uplay') &&
                   !fileNameOnly.includes('ubisoft');
          });
          
          console.log(`[Ubisoft] Filtered to ${gameExes.length} game executables in ${gameFolder}`);
          
          if (gameExes.length > 0) {
            // Use the first executable found
            const mainExe = gameExes[0];
            
            console.log(`[Ubisoft] Adding game: ${gameFolder} with exe: ${mainExe}`);
            
            results.push({
              uuid: `ubisoft-${gameFolder}-${Date.now()}`,
              source: 'ubisoft' as const,
              originalName: gameFolder,
              installPath: gamePath,
              exePath: mainExe,
              appId: undefined,
              title: gameFolder,
              status: 'ambiguous' as const, // Ubisoft games need metadata matching
            });
          } else {
            console.log(`[Ubisoft] No valid game executables found in ${gameFolder}`);
          }
        } catch (err) {
          console.error(`[Ubisoft] Error processing folder ${gameFolder}:`, err);
          // Skip folders we can't access
          continue;
        }
      }
    } catch (err) {
      console.error('[Ubisoft] Error scanning Ubisoft games folder:', err);
    }
    
    return results;
  }

  /**
   * Scan Rockstar Games Launcher for installed games
   * Games are typically in: {RockstarPath}\{GameName}
   * Example: C:\Program Files\Rockstar Games\Grand Theft Auto V
   */
  private async scanRockstar(rockstarPath: string): Promise<ScannedGameResult[]> {
    try {
      const results: ScannedGameResult[] = [];
      
      if (!existsSync(rockstarPath)) {
        console.warn(`Rockstar Games folder not found: ${rockstarPath}`);
        return results;
      }

      // Rockstar games are typically in subdirectories of the Rockstar Games folder
      // Each game has its own folder (e.g., Grand Theft Auto V, Red Dead Redemption 2)
      try {
        const entries = readdirSync(rockstarPath);
        
        for (const entry of entries) {
          // Skip known non-game folders
          if (entry.toLowerCase() === 'launcher' || 
              entry.toLowerCase() === 'social club' ||
              entry.toLowerCase() === 'redistributables') {
            continue;
          }
          
          const gamePath = join(rockstarPath, entry);
          
          try {
            const stats = statSync(gamePath);
            if (!stats.isDirectory()) continue;
            
            // Look for .exe files in the game folder
            const exeFiles = this.findExecutables(gamePath);
            
            // Filter out helper executables and launchers
            const gameExes = exeFiles.filter(exe => {
              const fileName = exe.toLowerCase();
              return !fileName.includes('launcher') &&
                     !fileName.includes('uninstall') &&
                     !fileName.includes('setup') &&
                     !fileName.includes('installer') &&
                     !fileName.includes('socialclub') &&
                     !fileName.includes('redistributables') &&
                     !fileName.includes('updater');
            });
            
            if (gameExes.length > 0) {
              // Use the first executable found
              const mainExe = gameExes[0];
              
              results.push({
                uuid: `rockstar-${entry}-${Date.now()}`,
                source: 'rockstar' as const,
                originalName: entry,
                installPath: gamePath,
                exePath: mainExe,
                appId: undefined,
                title: entry,
                status: 'ambiguous' as const, // Rockstar games need metadata matching
              });
            }
          } catch (err) {
            // Skip folders we can't access
            continue;
          }
        }
      } catch (err) {
        console.error('Error scanning Rockstar Games directory:', err);
      }
      
      return results;
    } catch (error) {
      console.error('Error scanning Rockstar Games:', error);
      return [];
    }
  }

  /**
   * Scan a folder for manual executables
   * Returns ScannedGameResult[] format for use with the importer
   * Each top-level subdirectory becomes a game, using the folder name as the game title
   */
  async scanFolderForExecutables(folderPath: string): Promise<ScannedGameResult[]> {
    const results: ScannedGameResult[] = [];
    
    try {
      if (!existsSync(folderPath)) {
        console.error(`[ImportService] Folder does not exist: ${folderPath}`);
        return [];
      }

      // Get all top-level subdirectories
      const entries = readdirSync(folderPath, { withFileTypes: true });
      const subdirectories = entries.filter(entry => entry.isDirectory());
      
      if (subdirectories.length === 0) {
        // If no subdirectories, scan the folder itself for executables
        const exeFiles = this.findExecutables(folderPath, 0, 3);
        const gameExes = exeFiles.filter(exe => {
          const fileName = exe.toLowerCase();
          return !fileName.includes('gamelaunchhelper') &&
                 !fileName.includes('bootstrapper') &&
                 !fileName.includes('uninstall') &&
                 !fileName.includes('unins') &&
                 !fileName.includes('setup') &&
                 !fileName.includes('installer') &&
                 !fileName.includes('install') &&
                 !fileName.includes('cleanup') &&
                 !fileName.includes('crashhandler') &&
                 !fileName.includes('redist') &&
                 !fileName.includes('directx') &&
                 !fileName.includes('updater') &&
                 !fileName.includes('launcher');
        });
        
        if (gameExes.length > 0) {
          // Use folder name as game title
          const folderName = folderPath.split(sep).pop() || 'Unknown';
          const mainExe = gameExes[0];
          
          // Try to find an exe with the same name as the folder
          const matchingExe = gameExes.find(exe => {
            const exeName = exe.split(sep).pop()?.toLowerCase().replace('.exe', '') || '';
            return exeName === folderName.toLowerCase();
          });
          
          results.push({
            uuid: `manual_folder-${folderPath}-${Date.now()}`,
            source: 'manual_folder' as const,
            originalName: folderName,
            installPath: folderPath,
            exePath: matchingExe || mainExe,
            appId: undefined,
            title: folderName,
            status: 'ambiguous' as const,
          });
        }
        
        console.log(`[ImportService] Scanned folder "${folderPath}" (no subdirectories) and found ${results.length} games`);
        return results;
      }
      
      // For each top-level subdirectory, scan for executables and create a game
      for (const subdir of subdirectories) {
        const subdirPath = join(folderPath, subdir.name);
        const gameTitle = subdir.name; // Use the folder name as the game title
        
        try {
          // Find executables in this subdirectory (scan up to 3 levels deep)
          const exeFiles = this.findExecutables(subdirPath, 0, 3);
          
          // Filter out helper executables
          const gameExes = exeFiles.filter(exe => {
            const fileName = exe.toLowerCase();
            return !fileName.includes('gamelaunchhelper') &&
                   !fileName.includes('bootstrapper') &&
                   !fileName.includes('uninstall') &&
                   !fileName.includes('unins') &&
                   !fileName.includes('setup') &&
                   !fileName.includes('installer') &&
                   !fileName.includes('install') &&
                   !fileName.includes('cleanup') &&
                   !fileName.includes('crashhandler') &&
                   !fileName.includes('redist') &&
                   !fileName.includes('directx') &&
                   !fileName.includes('updater') &&
                   !fileName.includes('launcher');
          });
          
          if (gameExes.length > 0) {
            // Prefer executables with the same name as the directory
            let mainExe = gameExes[0];
            
            // Try to find an exe with the same name as the directory
            const matchingExe = gameExes.find(exe => {
              const exeName = exe.split(sep).pop()?.toLowerCase().replace('.exe', '') || '';
              return exeName === gameTitle.toLowerCase();
            });
            
            if (matchingExe) {
              mainExe = matchingExe;
            }
            
            results.push({
              uuid: `manual_folder-${subdirPath}-${Date.now()}`,
              source: 'manual_folder' as const,
              originalName: gameTitle,
              installPath: subdirPath,
              exePath: mainExe,
              appId: undefined,
              title: gameTitle,
              status: 'ambiguous' as const, // Manual folder scans need metadata matching
            });
          }
        } catch (err) {
          // Skip directories we can't access
          console.warn(`[ImportService] Could not scan subdirectory "${subdirPath}":`, err);
          continue;
        }
      }
      
      console.log(`[ImportService] Scanned folder "${folderPath}" and found ${results.length} games`);
      return results;
    } catch (error) {
      console.error(`[ImportService] Error scanning folder "${folderPath}":`, error);
      return [];
    }
  }
}
