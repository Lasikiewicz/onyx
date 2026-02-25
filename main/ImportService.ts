import { SteamService } from './SteamService.js';
import { XboxService } from './XboxService.js';
import { AppConfigService } from './AppConfigService.js';
import { MetadataFetcherService } from './MetadataFetcherService.js';
import { GameFilteringService } from './GameFilteringService.js';
import { existsSync } from 'node:fs';

// Import Scanners
import { ScannedGameResult } from './scanners/ScannedGameResult.js';
import { SteamScanner } from './scanners/SteamScanner.js';
import { XboxScanner } from './scanners/XboxScanner.js';
import { EpicScanner } from './scanners/EpicScanner.js';
import { GogScanner } from './scanners/GogScanner.js';
import { UbisoftScanner } from './scanners/UbisoftScanner.js';
import { RockstarScanner } from './scanners/RockstarScanner.js';
import { EAScanner } from './scanners/EAScanner.js';
import { BattleNetScanner } from './scanners/BattleNetScanner.js';
import { HumbleScanner } from './scanners/HumbleScanner.js';
import { ItchScanner } from './scanners/ItchScanner.js';
import { ManualScanner } from './scanners/ManualScanner.js';
import { DeepScanner } from './scanners/DeepScanner.js';

// Re-export ScannedGameResult for compatibility
export type { ScannedGameResult } from './scanners/ScannedGameResult.js';

/**
 * Service to orchestrate scanning from all game sources
 * Returns simplified structures that can be converted to StagedGame in the frontend
 */
export class ImportService {
  private steamService: SteamService;
  private xboxService: XboxService;
  private appConfigService: AppConfigService;
  private metadataFetcher: MetadataFetcherService;
  private gameFilteringService: GameFilteringService;
  private isScanCancelled: boolean = false;

  // Scanners
  private steamScanner: SteamScanner;
  private xboxScanner: XboxScanner;
  private epicScanner: EpicScanner;
  private gogScanner: GogScanner;
  private ubisoftScanner: UbisoftScanner;
  private rockstarScanner: RockstarScanner;
  private eaScanner: EAScanner;
  private battleNetScanner: BattleNetScanner;
  private humbleScanner: HumbleScanner;
  private itchScanner: ItchScanner;
  private deepScanner: DeepScanner;

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
    this.gameFilteringService = new GameFilteringService();

    // Initialize Scanners
    this.steamScanner = new SteamScanner(this.steamService);
    this.xboxScanner = new XboxScanner(this.xboxService);
    this.epicScanner = new EpicScanner(this.gameFilteringService);
    this.gogScanner = new GogScanner(this.gameFilteringService);
    this.ubisoftScanner = new UbisoftScanner(this.gameFilteringService);
    this.rockstarScanner = new RockstarScanner(this.gameFilteringService);
    this.eaScanner = new EAScanner(this.gameFilteringService);
    this.battleNetScanner = new BattleNetScanner(this.gameFilteringService);
    this.humbleScanner = new HumbleScanner(this.gameFilteringService);
    this.itchScanner = new ItchScanner(this.gameFilteringService);
    this.deepScanner = new DeepScanner(this.gameFilteringService);
  }

  /**
   * Cancels the ongoing scan process
   */
  cancelScanAllSources(): void {
    console.log('[ImportService] Cancelling scan...');
    this.isScanCancelled = true;
  }

  /**
   * Scan all configured sources in parallel
   * Scans all enabled app locations from Onyx Settings > Apps
   * Returns a simplified structure that the frontend can convert to StagedGame
   */
  async scanAllSources(progressCallback?: (message: string) => void): Promise<ScannedGameResult[]> {
    this.isScanCancelled = false;
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
          // Some launchers (like Battle.net, Epic) can find games globally via Registry/ProgramData
          // so we don't strictly require the configured path to exist as long as they are enabled.
          const isEnabled = config.enabled && (
            (config.path && existsSync(config.path)) ||
            config.id === 'battle' ||
            config.id === 'epic'
          );
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
        if (this.isScanCancelled) {
          console.log('[ImportService] Scan cancelled by user (during apps config limit)');
          progressCallback?.('Scan cancelled by user.');
          return results;
        }

        const config: any = enabledConfigs[i];
        const appName = this.getAppDisplayName(config.id);

        try {
          progressCallback?.(`Scanning ${appName} (${config.path})...`);
          console.log(`[ImportService] Scanning ${config.id} at path: ${config.path}`);

          let games: ScannedGameResult[] = [];

          switch (config.id) {
            case 'steam':
              games = await this.steamScanner.scan(config.path);
              break;
            case 'xbox':
              games = await this.xboxScanner.scan(config.path);
              break;
            case 'epic':
              games = await this.epicScanner.scan(config.path);
              break;
            case 'gog':
              games = await this.gogScanner.scan(config.path);
              break;
            case 'ubisoft':
              games = await this.ubisoftScanner.scan(config.path);
              break;
            case 'rockstar':
              games = await this.rockstarScanner.scan(config.path);
              break;
            case 'ea':
              games = await this.eaScanner.scan(config.path);
              break;
            case 'battle':
              games = await this.battleNetScanner.scan(config.path);
              break;
            case 'humble':
              games = await this.humbleScanner.scan(config.path);
              break;
            case 'itch':
              games = await this.itchScanner.scan(config.path);
              break;
            default:
              // Fallback: Use generic deep scan for any unknown app type
              console.log(`[ImportService] No specific scanner for ${config.id}, using generic deep scan`);
              games = await this.deepScanner.scan(config.path);
              break;
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
      const manualFolderConfigs = await this.appConfigService.getManualFolderConfigs();
      const enabledManualFolders = Object.values(manualFolderConfigs).filter(c => c.enabled !== false);

      if (enabledManualFolders.length > 0) {
        progressCallback?.(`Scanning ${enabledManualFolders.length} manual folder${enabledManualFolders.length !== 1 ? 's' : ''}...`);
        for (const config of enabledManualFolders) {
          if (this.isScanCancelled) {
            console.log('[ImportService] Scan cancelled by user (during manual folders)');
            progressCallback?.('Scan cancelled by user.');
            return results;
          }

          const folder = config.path;
          try {
            if (existsSync(folder)) {
              progressCallback?.(`Scanning manual root ${folder} (subfolders = game names)...`);

              const manualScanner = new ManualScanner(config.autoCategory, config.name, this.gameFilteringService);
              const folderGames = await manualScanner.scan(folder);

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

      // Auto-detect Battle.net games via registry if not already configured
      // This ensures Blizzard games are found even if the user hasn't enabled Battle.net in Configure Apps
      const battleAlreadyScanned = enabledConfigs.some((c: any) => c.id === 'battle');
      if (!this.isScanCancelled && !battleAlreadyScanned && process.platform === 'win32') {
        try {
          progressCallback?.('Auto-detecting Battle.net games...');
          console.log('[ImportService] Battle.net not configured, running auto-detection via registry...');
          const battleGames = await this.battleNetScanner.scan('');
          if (battleGames.length > 0) {
            progressCallback?.(`Found ${battleGames.length} Battle.net game${battleGames.length !== 1 ? 's' : ''} (auto-detected)`);
            battleGames.forEach(game => {
              progressCallback?.(`Found: ${game.title}`);
            });
            results.push(...battleGames);
          }
        } catch (error) {
          console.warn('[ImportService] Battle.net auto-detection failed:', error);
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
