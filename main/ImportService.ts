import { SteamService, SteamGame } from './SteamService.js';
import { XboxService, XboxGame } from './XboxService.js';
import { AppConfigService } from './AppConfigService.js';
import { MetadataFetcherService } from './MetadataFetcherService.js';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

export interface ScannedGameResult {
  uuid: string;
  source: 'steam' | 'epic' | 'gog' | 'xbox' | 'ubisoft' | 'rockstar' | 'ea' | 'battle' | 'humble' | 'itch' | 'manual_file' | 'manual_folder';
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
  async scanAllSources(progressCallback?: (message: string) => void): Promise<ScannedGameResult[]> {
    const results: ScannedGameResult[] = [];

    try {
      console.log('[ImportService] Starting scanAllSources');
      progressCallback?.('Initializing scan...');
      
      // Get all enabled app configs from Onyx Settings > Apps
      console.log('[ImportService] Getting app configs...');
      const configs = await this.appConfigService.getAppConfigs();
      console.log('[ImportService] Got app configs:', Object.keys(configs));
      console.log(`[ImportService] Found ${Object.keys(configs).length} app configs`);
      progressCallback?.(`Checking ${Object.keys(configs).length} configured locations...`);
      
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
      progressCallback?.(`Scanning ${enabledConfigs.length} location${enabledConfigs.length !== 1 ? 's' : ''}...`);

      // Scan all sources sequentially to show progress
      for (let i = 0; i < enabledConfigs.length; i++) {
        const config: any = enabledConfigs[i];
        const appName = this.getAppDisplayName(config.id);
        
        try {
          progressCallback?.(`Scanning ${appName} (${config.path})...`);
          console.log(`[ImportService] Scanning ${config.id} at path: ${config.path}`);
          
          let games: ScannedGameResult[] = [];
          if (config.id === 'steam') {
            games = await this.scanSteam(config.path);
          } else if (config.id === 'xbox') {
            games = await this.scanXbox(config.path);
          } else if (config.id === 'epic') {
            games = await this.scanEpic(config.path);
          } else if (config.id === 'gog') {
            games = await this.scanGOG(config.path);
          } else if (config.id === 'ubisoft') {
            games = await this.scanUbisoft(config.path);
          } else if (config.id === 'rockstar') {
            games = await this.scanRockstar(config.path);
          } else if (config.id === 'ea') {
            games = await this.scanEA(config.path);
          } else if (config.id === 'battle') {
            games = await this.scanBattle(config.path);
          } else if (config.id === 'humble') {
            games = await this.scanHumble(config.path);
          } else if (config.id === 'itch') {
            games = await this.scanItch(config.path);
          } else {
            // Fallback: Use generic deep scan for any unknown app type
            console.log(`[ImportService] No specific scanner for ${config.id}, using generic deep scan`);
            games = await this.scanFolderForExecutables(config.path);
          }
          
          if (games.length > 0) {
            progressCallback?.(`Found ${games.length} game${games.length !== 1 ? 's' : ''} in ${appName}`);
            games.forEach(game => {
              progressCallback?.(`Found: ${game.title}`);
            });
          } else {
            progressCallback?.(`No games found in ${appName}`);
          }
          
          results.push(...games);
        } catch (error) {
          console.error(`[ImportService] Error scanning ${config.id}:`, error);
          progressCallback?.(`Error scanning ${appName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Scan manual folders
      const manualFolders = await this.appConfigService.getManualFolders();
      if (manualFolders.length > 0) {
        progressCallback?.(`Scanning ${manualFolders.length} manual folder${manualFolders.length !== 1 ? 's' : ''}...`);
        for (const folder of manualFolders) {
          try {
            if (existsSync(folder)) {
              progressCallback?.(`Scanning ${folder}...`);
              const folderGames = await this.scanFolderForExecutables(folder);
              if (folderGames.length > 0) {
                progressCallback?.(`Found ${folderGames.length} game${folderGames.length !== 1 ? 's' : ''} in ${folder}`);
                folderGames.forEach(game => {
                  progressCallback?.(`Found: ${game.title}`);
                });
              } else {
                progressCallback?.(`No games found in ${folder}`);
              }
              results.push(...folderGames);
            } else {
              console.warn(`[ImportService] Manual folder does not exist: ${folder}`);
              progressCallback?.(`Warning: Folder does not exist: ${folder}`);
            }
          } catch (error) {
            console.error(`[ImportService] Error scanning manual folder ${folder}:`, error);
            progressCallback?.(`Error scanning ${folder}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
      
      progressCallback?.(`Scan complete. Found ${results.length} total game${results.length !== 1 ? 's' : ''}.`);
    } catch (error) {
      console.error('Error in scanAllSources:', error);
      progressCallback?.(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return results;
  }

  /**
   * Scan Steam games
   */
  private async scanSteam(steamPath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[ImportService] scanSteam called with path: ${steamPath}`);
      this.steamService.setSteamPath(steamPath);
      const steamGames = this.steamService.scanSteamGames();
      console.log(`[ImportService] scanSteam found ${steamGames.length} games`);
      
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
            
            // Look for executables in this game folder (deep scan)
            const exeFiles = this.findExecutables(gamePath, 0, 20);
            
            // Filter out helper executables
            const gameExes = exeFiles.filter(exe => {
              const fileName = exe.toLowerCase();
              const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
              return !fileNameOnly.includes('gamelaunchhelper') &&
                     !fileNameOnly.includes('bootstrapper') &&
                     !fileNameOnly.includes('uninstall') &&
                     !fileNameOnly.includes('setup') &&
                     !fileNameOnly.includes('installer') &&
                     !fileNameOnly.includes('launcher') &&
                     fileNameOnly !== 'crashreportclient.exe' &&
                     fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
                     fileNameOnly !== 'crashpad_handler.exe' &&
                     fileNameOnly !== 'embark-crash-helper.exe' &&
                     fileNameOnly !== 'blizzardbrowser.exe' &&
                     fileNameOnly !== 'blizzarderror.exe';
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
          
          // Look for .exe files in the game folder (deep scan)
          const exeFiles = this.findExecutables(gamePath, 0, 20);
          
          // Filter out helper executables
          const gameExes = exeFiles.filter(exe => {
            const fileName = exe.toLowerCase();
            const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
            return !fileNameOnly.includes('gamelaunchhelper') &&
                   !fileNameOnly.includes('bootstrapper') &&
                   !fileNameOnly.includes('uninstall') &&
                   !fileNameOnly.includes('setup') &&
                   !fileNameOnly.includes('installer') &&
                   fileNameOnly !== 'crashreportclient.exe' &&
                   fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
                   fileNameOnly !== 'crashpad_handler.exe';
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
   * Find executable files in a directory (recursive, deep scan with high max depth)
   */
  private findExecutables(dirPath: string, depth: number = 0, maxDepth: number = 20): string[] {
    const executables: string[] = [];
    
    if (depth > maxDepth) return executables;
    
    const excludeNames = [
      'gamelaunchhelper.exe',
      'bootstrapper.exe',
      'crashreportclient.exe',
      'battlenet.overlay.runtime.exe',
      'crashpad_handler.exe',
      'embark-crash-helper.exe',
      'blizzardbrowser.exe',
      'blizzarderror.exe',
      'gamelaunchhelper',
      'bootstrapper',
      'crashreportclient',
      'battlenet.overlay.runtime',
      'crashpad_handler',
      'embark-crash-helper',
      'blizzardbrowser',
      'blizzarderror',
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
                !lowerName.includes('bootstrapper') &&
                !lowerName.includes('crashreportclient') &&
                !lowerName.includes('battlenet.overlay.runtime') &&
                !lowerName.includes('crashpad_handler') &&
                !lowerName.includes('embark-crash-helper') &&
                !lowerName.includes('blizzardbrowser') &&
                !lowerName.includes('blizzarderror')) {
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
          
          // Look for .exe files in the game folder (deep scan)
          const exeFiles = this.findExecutables(gamePath, 0, 20);
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
                   !fileNameOnly.includes('ubisoft') &&
                   fileNameOnly !== 'crashreportclient.exe' &&
                   fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
                   fileNameOnly !== 'crashpad_handler.exe';
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
      console.log(`[Rockstar] Starting scan with path: ${rockstarPath}`);
      const results: ScannedGameResult[] = [];
      
      if (!existsSync(rockstarPath)) {
        console.warn(`[Rockstar] Rockstar Games folder not found: ${rockstarPath}`);
        return results;
      }

      // Rockstar games are typically in subdirectories of the Rockstar Games folder
      // Each game has its own folder (e.g., Grand Theft Auto V, Red Dead Redemption 2)
      try {
        const entries = readdirSync(rockstarPath);
        console.log(`[Rockstar] Found ${entries.length} entries in Rockstar Games folder`);
        
        for (const entry of entries) {
          // Skip known non-game folders
          const dirName = entry.toLowerCase();
          if (dirName === 'launcher' || 
              dirName === 'social club' ||
              dirName === 'redistributables' ||
              dirName.startsWith('$')) {
            console.log(`[Rockstar] Skipping non-game folder: ${entry}`);
            continue;
          }
          
          const gamePath = join(rockstarPath, entry);
          
          try {
            const stats = statSync(gamePath);
            if (!stats.isDirectory()) {
              continue;
            }
            
            console.log(`[Rockstar] Scanning game folder: ${entry}`);
            
            // Look for .exe files in the game folder (deep scan)
            const exeFiles = this.findExecutables(gamePath, 0, 20);
            console.log(`[Rockstar] Found ${exeFiles.length} executables in ${entry}`);
            
            // Filter out helper executables and launchers
            const gameExes = exeFiles.filter(exe => {
              const fileName = exe.toLowerCase();
              const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
              return !fileNameOnly.includes('launcher') &&
                     !fileNameOnly.includes('uninstall') &&
                     !fileNameOnly.includes('unins') &&
                     !fileNameOnly.includes('setup') &&
                     !fileNameOnly.includes('installer') &&
                     !fileNameOnly.includes('socialclub') &&
                     !fileNameOnly.includes('social club') &&
                     !fileNameOnly.includes('redistributables') &&
                     !fileNameOnly.includes('redist') &&
                     !fileNameOnly.includes('updater') &&
                     !fileNameOnly.includes('gamelaunchhelper') &&
                     !fileNameOnly.includes('bootstrapper') &&
                     fileNameOnly !== 'crashreportclient.exe' &&
                     fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
                     fileNameOnly !== 'crashpad_handler.exe' &&
                     fileNameOnly !== 'embark-crash-helper.exe' &&
                     fileNameOnly !== 'blizzardbrowser.exe' &&
                     fileNameOnly !== 'blizzarderror.exe';
            });
            
            console.log(`[Rockstar] Filtered to ${gameExes.length} game executables in ${entry}`);
            
            if (gameExes.length > 0) {
              // Prefer executables with the same name as the game folder
              let mainExe = gameExes[0];
              
              // Try to find an exe with the same name as the directory
              const matchingExe = gameExes.find(exe => {
                const exeName = exe.split(sep).pop()?.toLowerCase().replace('.exe', '') || '';
                const gameName = entry.toLowerCase();
                return exeName === gameName || 
                       exeName.includes(gameName.replace(/\s+/g, '')) ||
                       gameName.includes(exeName);
              });
              
              if (matchingExe) {
                mainExe = matchingExe;
              } else {
                // Prefer executables closer to root (fewer directory separators)
                const exeWithDepth = gameExes.map(exe => ({
                  exe,
                  depth: (exe.match(/[/\\]/g) || []).length
                }));
                exeWithDepth.sort((a, b) => a.depth - b.depth);
                mainExe = exeWithDepth[0].exe;
              }
              
              console.log(`[Rockstar] ✓ Found Rockstar game: ${entry} (${mainExe})`);
              
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
            } else {
              console.log(`[Rockstar] No valid game executables found in ${entry}`);
            }
          } catch (err) {
            console.warn(`[Rockstar] Could not scan folder "${entry}":`, err);
            continue;
          }
        }
      } catch (err) {
        console.error('[Rockstar] Error scanning Rockstar Games directory:', err);
      }
      
      console.log(`[Rockstar] Total Rockstar games found: ${results.length}`);
      return results;
    } catch (error) {
      console.error('[Rockstar] Error scanning Rockstar Games:', error);
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
        // If no subdirectories, scan the folder itself for executables (deep scan)
        const exeFiles = this.findExecutables(folderPath, 0, 20);
        const gameExes = exeFiles.filter(exe => {
          const fileName = exe.toLowerCase();
          const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
          return !fileNameOnly.includes('gamelaunchhelper') &&
                 !fileNameOnly.includes('bootstrapper') &&
                 !fileNameOnly.includes('uninstall') &&
                 !fileNameOnly.includes('unins') &&
                 !fileNameOnly.includes('setup') &&
                 !fileNameOnly.includes('installer') &&
                 !fileNameOnly.includes('install') &&
                 !fileNameOnly.includes('cleanup') &&
                 !fileNameOnly.includes('crashhandler') &&
                 !fileNameOnly.includes('redist') &&
                 !fileNameOnly.includes('directx') &&
                 !fileNameOnly.includes('updater') &&
                 !fileNameOnly.includes('launcher') &&
                 fileNameOnly !== 'crashreportclient.exe' &&
                 fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
                 fileNameOnly !== 'crashpad_handler.exe';
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
          // Find executables in this subdirectory (deep scan)
          const exeFiles = this.findExecutables(subdirPath, 0, 20);
          
          // Filter out helper executables
          const gameExes = exeFiles.filter(exe => {
            const fileName = exe.toLowerCase();
            const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
            return !fileNameOnly.includes('gamelaunchhelper') &&
                   !fileNameOnly.includes('bootstrapper') &&
                   !fileNameOnly.includes('uninstall') &&
                   !fileNameOnly.includes('unins') &&
                   !fileNameOnly.includes('setup') &&
                   !fileNameOnly.includes('installer') &&
                   !fileNameOnly.includes('install') &&
                   !fileNameOnly.includes('cleanup') &&
                   !fileNameOnly.includes('crashhandler') &&
                   !fileNameOnly.includes('redist') &&
                   !fileNameOnly.includes('directx') &&
                   !fileNameOnly.includes('updater') &&
                   !fileNameOnly.includes('launcher') &&
                   fileNameOnly !== 'crashreportclient.exe' &&
                   fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
                   fileNameOnly !== 'crashpad_handler.exe';
          });
          
          if (gameExes.length > 0) {
            // Prefer executables with the same name as the directory
            // Also prefer executables closer to the root (fewer path separators)
            let mainExe = gameExes[0];
            
            // Try to find an exe with the same name as the directory
            const matchingExe = gameExes.find(exe => {
              const exeName = exe.split(sep).pop()?.toLowerCase().replace('.exe', '') || '';
              return exeName === gameTitle.toLowerCase();
            });
            
            if (matchingExe) {
              mainExe = matchingExe;
            } else {
              // If no exact match, prefer executables closer to root (fewer path separators)
              // This helps with games like Dying Light where the exe is deep in nested folders
              const sortedByDepth = gameExes.sort((a, b) => {
                const depthA = a.split(sep).length;
                const depthB = b.split(sep).length;
                return depthA - depthB; // Prefer shallower (closer to root)
              });
              mainExe = sortedByDepth[0];
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

  /**
   * Scan EA App / Origin for installed games
   * Games are typically in: {EAPath}\Games or subdirectories
   */
  private async scanEA(eaPath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[EA] Starting scan with path: ${eaPath}`);
      const results: ScannedGameResult[] = [];
      
      if (!existsSync(eaPath)) {
        console.warn(`[EA] Path does not exist: ${eaPath}`);
        return results;
      }

      // EA App games can be in multiple locations:
      // 1. {EAPath}\Games (common)
      // 2. Direct subdirectories of {EAPath}
      // 3. {EAPath}\Program Files\EA Games (older Origin)
      
      const possiblePaths = [
        join(eaPath, 'Games'),
        join(eaPath, 'Program Files', 'EA Games'),
        join(eaPath, 'Program Files (x86)', 'EA Games'),
        eaPath, // Scan the root path itself
      ];

      for (const gamesPath of possiblePaths) {
        if (existsSync(gamesPath)) {
          console.log(`[EA] Scanning: ${gamesPath}`);
          const scanned = await this.scanGenericGamesFolder(gamesPath, 'ea');
          results.push(...scanned);
        }
      }

      console.log(`[EA] Found ${results.length} games total`);
      return results;
    } catch (error) {
      console.error('[EA] Error scanning EA App:', error);
      return [];
    }
  }

  /**
   * Scan Battle.net for installed games
   * Games are typically in: {BattlePath}\Games or subdirectories
   */
  private async scanBattle(battlePath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[Battle.net] Starting scan with path: ${battlePath}`);
      const results: ScannedGameResult[] = [];
      
      if (!existsSync(battlePath)) {
        console.warn(`[Battle.net] Path does not exist: ${battlePath}`);
        return results;
      }

      // Battle.net games can be in:
      // 1. {BattlePath}\Games (common)
      // 2. Direct subdirectories of {BattlePath}
      
      const possiblePaths = [
        join(battlePath, 'Games'),
        battlePath, // Scan the root path itself
      ];

      for (const gamesPath of possiblePaths) {
        if (existsSync(gamesPath)) {
          console.log(`[Battle.net] Scanning: ${gamesPath}`);
          const scanned = await this.scanGenericGamesFolder(gamesPath, 'battle');
          results.push(...scanned);
        }
      }

      console.log(`[Battle.net] Found ${results.length} games total`);
      return results;
    } catch (error) {
      console.error('[Battle.net] Error scanning Battle.net:', error);
      return [];
    }
  }

  /**
   * Scan Humble App for installed games
   * Games are typically in subdirectories
   */
  private async scanHumble(humblePath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[Humble] Starting scan with path: ${humblePath}`);
      const results: ScannedGameResult[] = [];
      
      if (!existsSync(humblePath)) {
        console.warn(`[Humble] Path does not exist: ${humblePath}`);
        return results;
      }

      // Humble games are typically in subdirectories
      console.log(`[Humble] Scanning: ${humblePath}`);
      const scanned = await this.scanGenericGamesFolder(humblePath, 'humble');
      results.push(...scanned);

      console.log(`[Humble] Found ${results.length} games total`);
      return results;
    } catch (error) {
      console.error('[Humble] Error scanning Humble:', error);
      return [];
    }
  }

  /**
   * Scan itch.io for installed games
   * Games are typically in subdirectories
   */
  private async scanItch(itchPath: string): Promise<ScannedGameResult[]> {
    try {
      console.log(`[itch.io] Starting scan with path: ${itchPath}`);
      const results: ScannedGameResult[] = [];
      
      if (!existsSync(itchPath)) {
        console.warn(`[itch.io] Path does not exist: ${itchPath}`);
        return results;
      }

      // itch.io games are typically in subdirectories
      console.log(`[itch.io] Scanning: ${itchPath}`);
      const scanned = await this.scanGenericGamesFolder(itchPath, 'itch');
      results.push(...scanned);

      console.log(`[itch.io] Found ${results.length} games total`);
      return results;
    } catch (error) {
      console.error('[itch.io] Error scanning itch.io:', error);
      return [];
    }
  }

  /**
   * Generic method to scan a games folder for any launcher
   * Scans all subdirectories recursively for game executables
   */
  private async scanGenericGamesFolder(gamesPath: string, source: 'ea' | 'battle' | 'humble' | 'itch'): Promise<ScannedGameResult[]> {
    const results: ScannedGameResult[] = [];
    
    try {
      const entries = readdirSync(gamesPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const gamePath = join(gamesPath, entry.name);
        
        try {
          // Skip known non-game directories
          const dirName = entry.name.toLowerCase();
          if (dirName === 'launcher' || 
              dirName === 'redistributables' ||
              dirName === 'support' ||
              dirName === 'tools' ||
              dirName.startsWith('$')) {
            continue;
          }
          
          // Deep scan for executables
          const exeFiles = this.findExecutables(gamePath, 0, 20);
          
          // Filter out helper executables
          const gameExes = exeFiles.filter(exe => {
            const fileName = exe.toLowerCase();
            const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
            return !fileNameOnly.includes('gamelaunchhelper') &&
                   !fileNameOnly.includes('bootstrapper') &&
                   !fileNameOnly.includes('uninstall') &&
                   !fileNameOnly.includes('unins') &&
                   !fileNameOnly.includes('setup') &&
                   !fileNameOnly.includes('installer') &&
                   !fileNameOnly.includes('launcher') &&
                   !fileNameOnly.includes('updater') &&
                   !fileNameOnly.includes('redist') &&
                   !fileNameOnly.includes('directx') &&
                   fileNameOnly !== 'crashreportclient.exe' &&
                   fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
                   fileNameOnly !== 'crashpad_handler.exe';
          });
          
          if (gameExes.length > 0) {
            // Prefer executables with the same name as the directory
            let mainExe = gameExes[0];
            const matchingExe = gameExes.find(exe => {
              const exeName = exe.split(sep).pop()?.toLowerCase().replace('.exe', '') || '';
              return exeName === entry.name.toLowerCase();
            });
            if (matchingExe) {
              mainExe = matchingExe;
            }
            
            results.push({
              uuid: `${source}-${entry.name}-${Date.now()}`,
              source: source,
              originalName: entry.name,
              installPath: gamePath,
              exePath: mainExe,
              appId: undefined,
              title: entry.name,
              status: 'ambiguous' as const,
            });
          }
        } catch (err) {
          console.warn(`[${source}] Could not scan directory "${gamePath}":`, err);
          continue;
        }
      }
    } catch (err) {
      console.error(`[${source}] Error scanning games folder:`, err);
    }
    
    return results;
  }

  /**
   * Get display name for app ID
   */
  private getAppDisplayName(appId: string): string {
    const names: Record<string, string> = {
      'steam': 'Steam',
      'epic': 'Epic Games',
      'gog': 'GOG Galaxy',
      'xbox': 'Xbox Game Pass',
      'ubisoft': 'Ubisoft Connect',
      'rockstar': 'Rockstar Games',
      'ea': 'EA App',
      'battle': 'Battle.net',
      'humble': 'Humble Bundle',
      'itch': 'itch.io',
    };
    return names[appId] || appId;
  }
}
