import { statSync } from 'node:fs';
import { readdirSync } from 'node:fs';

/**
 * Shared game filtering logic for all launchers
 * Ensures consistent filtering across Steam, Epic, GOG, EA, Ubisoft, etc.
 * Uses hybrid approach: publisher whitelist + system apps + keywords + size heuristics
 */
export class GameFilteringService {
  /**
   * Known game publishers across all platforms
   * Used to whitelist games from established publishers
   * ⚡ BOLT: Hoisted to static readonly to prevent redundant object allocations during frequent directory scans
   */
  private static readonly KNOWN_PUBLISHERS: ReadonlySet<string> = new Set([
    // AAA Publishers
    'ea', 'activision', 'ubisoft', '2k', 'square', 'rockstar', 'bethesda', 'capcom',
    'bandai', 'konami', 'sega', 'disney', 'warner', 'paramount', 'sony',
    'microsoft', 'xbox', 'obsidian', 'ninja', 'rare', 'inxile', 'playground',
    'coalition', 'remedy', 'compulsion', 'sloclap', 'astragon', 'blizzard',
  ]);

  /**
   * System app prefixes/folders to exclude
   */
  private static readonly SYSTEM_APP_PATTERNS: readonly string[] = [
    // Windows system apps
    'microsoft.windows', 'microsoft.office', 'microsoft.edge', 'microsoft.store',
    'microsoft.skype', 'microsoft.msn', 'microsoft.weather', 'microsoft.photos',
    'microsoft.camera', 'microsoft.clock', 'microsoft.calculator',
    'microsoft.messaging', 'microsoft.notes', 'microsoft.mail', 'microsoft.people',
    'microsoft.maps', 'microsoft.net', 'microsoft.vclibs', 'microsoft.ui.xaml',
    'microsoft.advertising', 'microsoft.services.store', 'microsoft.gamingapp',
    'microsoft.gamingservices', 'microsoft.xboxapp', 'microsoft.xbox',

    // Third-party utilities
    'adobe', 'autodesk', 'jetbrains', 'sublimetext', 'vscode', 'visualstudio',
    'python', 'nodejs', 'git', 'docker', 'vlc', 'audacity', 'ffmpeg',
  ];

  /**
   * Non-game keywords (in app name, folder name, or exe name)
   */
  private static readonly NON_GAME_KEYWORDS: readonly string[] = [
    // Media/Entertainment
    'music', 'video', 'tv', 'movie', 'media', 'photo', 'camera', 'photoeditor',
    'gallery', 'clipchamp', 'paint', 'editor', 'viewer', 'player',

    // System/Tools
    'settings', 'config', 'update', 'updater', 'installer', 'runtime', 'driver',
    'service', 'services', 'keyboard', 'language', 'voice', 'assistant', 'copilot',
    'search', 'mail', 'outlook', 'calendar', 'news', 'weather', 'maps', 'clock',
    'calculator', 'store', 'browser', 'onedrive', 'onenote', 'teams', 'office',
    'word', 'excel', 'powerpoint', 'access', 'publisher', 'project',

    // Support/Admin
    'support', 'help', 'feedback', 'repair', 'firmware', 'backup', 'sync',
    'family', 'security', 'defender', 'antivirus', 'malware', 'control panel',
    'device manager', 'task manager', 'registry', 'powershell', 'command',

    // Hardware/Drivers
    'intel', 'nvidia', 'amd', 'realtek', 'audio', 'driver', 'chipset',
    'graphics', 'network', 'wifi', 'bluetooth', 'usb',

    // Hardware Manufacturer Utilities
    'lenovo', 'dell', 'hp', 'asus', 'msi', 'acer', 'razer', 'corsair',
    'logitech', 'steelseries', 'apple', 'google',

    // Coding/Dev Tools
    'python', 'idle', 'node', 'npm', 'git', 'compiler', 'debugger', 'ide',
    'visual', 'code', 'studio', 'jetbrains', 'sublime', 'atom',

    // Archive/Compression
    'winrar', 'archive', '7-zip', 'zip', 'compress', 'extract', 'rar',
    'tar', 'gzip', 'bzip2',

    // Utilities/Tools
    'tool', 'utility', 'helper', 'launcher', 'updater', 'optimizer',
    'cleaner', 'uninstaller', 'manager', 'monitor', 'viewer', 'converter',
    'recorder', 'codec', 'directx', 'vcredist', 'redist', 'runtime',
    'bootstrap', 'bootstrapper', 'gamelaunchhelper',

    // Communication
    'whatsapp', 'telegram', 'discord', 'slack', 'zoom', 'skype', 'teams',

    // Game Launchers & Platforms (not actual games)
    'battle.net', 'battlenet', 'blizzard', 'steam client', 'epic games launcher',
    'origin', 'ea desktop', 'ubisoft connect', 'gog galaxy', 'xbox app',
    'game bar', 'game overlay', 'game launcher', 'launcher',

    // Specific Problem Cases
    'quick assist', 'snipping', 'sticky', 'hdr calibration', 'insider hub',
    'xbox', 'console', 'terminal', 'cmd', 'powershell', 'bash', 'shell',
    'photoshop', 'illustrator', 'premiere', 'after effects',
  ];

  /**
   * Executable filenames that are definitely not games
   */
  private static readonly NON_GAME_EXECUTABLES: ReadonlySet<string> = new Set([
    'setup.exe', 'uninstall.exe', 'unins000.exe',
    'installer.exe', 'bootstrapper.exe', 'launcher.exe',
    'updater.exe', 'config.exe',
    'python.exe', 'pythonw.exe', 'python3.exe',
    'node.exe', 'npm.exe', 'npm.cmd',
    'git.exe', 'git-bash.exe',
    'code.exe', 'codeinsiders.exe',
    'unity.exe', 'unitycrashhandler.exe', 'unitycrashhandler64.exe',
    'unitycrashhandler32.exe',
    'crashreportclient.exe', 'crashpad_handler.exe',
    'cleanup.exe', 'directxsetup.exe', 'dxsetup.exe',
    'vc_redist.x64.exe', 'vc_redist.x86.exe',
    'vulkan.exe', 'dxcpl.exe',
    // Battle.net launcher executables
    'battlenet.exe', 'battle.net.exe', 'battlenet.overlay.runtime.exe',
    'blizzardlauncher.exe', 'blizzard.exe', 'blizzardupdate.exe',
    'blizzardbrowser.exe', 'blizzarderror.exe', 'blizztray.exe',
    'gamesessionmonitor.exe',
    'quickassist.exe', 'quickassistant.exe',
    'realtek.exe', 'snipping.exe', 'stickynotes.exe',
    'hdr_calibration.exe', 'xbox_insider.exe',
    'zsync.exe', 'zsyncmake.exe',
  ]);

  /**
   * Patterns indicating a downloading/staged game path
   */
  private static readonly DOWNLOAD_PATTERNS: readonly string[] = [
    'uplay_download',
    'steamapps\\downloading',
    'steamapps/downloading',
    'epicgames\\directdownload',
    'originservice\\staged',
    'origin games\\__origintmp',
    'battle.net\\temp',
    'battlenet\\temp',
    'appdata\\local\\temp\\gog-galaxy',
  ];

  /**
   * Regex pattern for Xbox UUIDs in paths
   */
  private static readonly XBOX_UUID_PATTERN = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;

  /**
   * Extract publisher from folder name or app name
   * Example: "EA Sports FC" → "ea", "Ubisoft.Game" → "ubisoft"
   */
  private getPublisherFromName(name: string): string | null {
    const lowerName = name.toLowerCase();

    // Direct match
    for (const pub of GameFilteringService.KNOWN_PUBLISHERS) {
      if (lowerName.includes(pub)) {
        return pub;
      }
    }

    return null;
  }

  /**
   * Estimate folder size by file count
   * Games: typically 100+ files
   * Utilities: typically < 20 files
   */
  private estimateFolderSize(folderPath: string): 'large' | 'small' | 'unknown' {
    try {
      const files = readdirSync(folderPath, { recursive: true });
      const fileCount = files.length;

      if (fileCount > 100) return 'large';  // likely game
      if (fileCount < 20) return 'small';   // likely utility
      return 'unknown';
    } catch (err) {
      return 'unknown';
    }
  }

  /**
   * Main filter method - returns true if the app should be EXCLUDED
   */
  isLikelyNonGame(info: {
    name: string;
    folderPath?: string;
    exeName: string;
    source: 'steam' | 'epic' | 'gog' | 'ubisoft' | 'ea' | 'battle' | 'itch' | 'humble' | 'xbox' | 'manual';
  }): boolean {
    const nameL = info.name.toLowerCase();
    const exeNameL = info.exeName.toLowerCase();

    // STEP 1: Check exact executable name blacklist
    if (GameFilteringService.NON_GAME_EXECUTABLES.has(exeNameL)) {
      console.debug(`[GameFiltering] Excluding ${info.name}: non-game exe "${info.exeName}"`);
      return true;
    }

    // STEP 2: Check if from known game publisher (whitelist - INCLUDE if yes)
    if (this.getPublisherFromName(info.name)) {
      console.debug(`[GameFiltering] Including ${info.name}: known game publisher`);
      return false;
    }

    // STEP 3: Check system app patterns
    if (GameFilteringService.SYSTEM_APP_PATTERNS.some(pattern => nameL.includes(pattern) || exeNameL.includes(pattern))) {
      console.debug(`[GameFiltering] Excluding ${info.name}: system app pattern`);
      return true;
    }

    // STEP 4: Check install size heuristic (only if we have path)
    if (info.folderPath) {
      const sizeCategory = this.estimateFolderSize(info.folderPath);
      if (sizeCategory === 'small') {
        console.debug(`[GameFiltering] Excluding ${info.name}: folder size indicates utility`);
        return true;
      }
    }

    // STEP 5: Check non-game keywords
    if (GameFilteringService.NON_GAME_KEYWORDS.some(keyword => nameL.includes(keyword) || exeNameL.includes(keyword))) {
      console.debug(`[GameFiltering] Excluding ${info.name}: non-game keyword`);
      return true;
    }

    // STEP 6: For manual/unknown sources, be more cautious
    if (info.source === 'manual') {
      // If no publisher found and folder is small, exclude
      if (!this.getPublisherFromName(info.name) && info.folderPath) {
        const sizeCategory = this.estimateFolderSize(info.folderPath);
        if (sizeCategory !== 'large') {
          console.debug(`[GameFiltering] Excluding ${info.name}: manual folder, unknown publisher, small size`);
          return true;
        }
      }
    }

    // Default: include the app (assume it's a game)
    return false;
  }

  /**
   * Check if a game path indicates it is currently downloading or in a staged state
   */
  isLikelyDownloading(folderPath: string): boolean {
    const lowerPath = folderPath.toLowerCase();

    if (GameFilteringService.DOWNLOAD_PATTERNS.some(pattern => lowerPath.includes(pattern))) {
      return true;
    }

    // Xbox UUID pattern in path (could be download)
    // C:\XboxGames\AFA5CF80-538B-4681-A685-0C6E61521265
    // Typical Xbox UUIDs are 8-4-4-4-12 hex chars
    if (lowerPath.includes('xboxgames') && GameFilteringService.XBOX_UUID_PATTERN.test(lowerPath)) {
      return true;
    }

    return false;
  }

  /**
   * Filter an array of game candidates
   */
  filterGames(games: Array<{ name: string; folderPath?: string; exeName: string; source: any }>): typeof games {
    return games.filter(game => !this.isLikelyNonGame(game as any));
  }
}
