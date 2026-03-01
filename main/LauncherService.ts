import { spawn, execFile } from 'child_process';
import { dirname, join, normalize } from 'path';
import { existsSync, readdirSync } from 'node:fs';
import { shell } from 'electron';
import { GameStore, Game } from './GameStore.js';

/** Common uninstaller executable names to look for in the game folder */
const UNINSTALLER_NAMES = ['uninstall.exe', 'Uninstall.exe', 'unins000.exe', 'unins001.exe', 'unins002.exe'];

export class LauncherService {
  private gameStore: GameStore;

  constructor(gameStore: GameStore) {
    this.gameStore = gameStore;
  }

  /**
   * Launch a game by its ID
   * Supports URI protocols for:
   * - Steam: steam://rungameid/<AppID>
   * - Epic: com.epicgames.launcher://apps/<AppID>?action=launch&silent=true
   * - GOG: goggalaxy://openGameView/<ProductID>
   * - Xbox: shell:appsFolder\\<PackageFamilyName>!App (uses explorer)
   * - EA/Origin: origin2://game/launch?offerIds=<OfferId>
   * - Battle.net: Uses Battle.net.exe --exec=\"launch <GameCode>\"
   * - Ubisoft: uplay://launch/<GameID>
   * For non-launcher games: executes the .exe file using child_process.spawn
   * Returns PID for non-Steam games for process tracking
   */
  async launchGame(gameId: string): Promise<{ success: boolean; error?: string; pid?: number }> {
    try {
      const games = await this.gameStore.getLibrary();
      const game = games.find(g => g.id === gameId);

      if (!game) {
        return { success: false, error: `Game with ID ${gameId} not found` };
      }

      // Check ID format to determine launcher (most reliable method)
      // Steam games: steam-<AppID>
      const steamMatch = gameId.match(/^steam-(.+)$/);

      if (steamMatch && steamMatch[1]) {
        // This is a Steam game - launch via Steam URL protocol
        const appId = steamMatch[1];
        const steamUrl = `steam://rungameid/${appId}`;
        await shell.openExternal(steamUrl);

        // Update lastPlayed timestamp
        game.lastPlayed = new Date().toISOString();
        await this.gameStore.saveGame(game);

        // For Steam games, we need to wait a moment and then try to find the process
        // since we launch via protocol, we don't get a PID back immediately.
        console.log(`[LauncherService] Steam game launched via protocol. Attempting to detect PID for: ${game.title}`);

        // Wait 5 seconds for the game to start before attempting to find PID
        let pid: number | undefined;
        setTimeout(async () => {
          pid = await this.getActiveSteamProcessId(game);
          if (pid) {
            console.log(`[LauncherService] Detected Steam game PID: ${pid}`);
          }
        }, 5000);

        return { success: true };
      }

      // Epic Games: epic-<CatalogItemId> or epic-<AppName>
      const epicMatch = gameId.match(/^epic-(.+)$/);
      const isEpic = epicMatch || game.platform === 'epic' || game.source === 'epic';
      if (isEpic && game.installationDirectory) {
        // Epic uses: com.epicgames.launcher://apps/<InstallPath>?action=launch&silent=true
        // InstallPath needs to be URI encoded
        const installPathEncoded = encodeURIComponent(game.installationDirectory);
        const epicUrl = `com.epicgames.launcher://apps/${installPathEncoded}?action=launch&silent=true`;
        console.log(`[LauncherService] Launching Epic game: ${epicUrl}`);
        await shell.openExternal(epicUrl);

        // Update lastPlayed timestamp
        game.lastPlayed = new Date().toISOString();
        await this.gameStore.saveGame(game);

        return { success: true };
      }

      // EA/Origin: ea-<OfferId> or origin-<OfferId>
      const eaMatch = gameId.match(/^(ea|origin)-(.+)$/);
      const isEA = eaMatch || game.platform === 'ea' || game.source === 'ea' || game.platform === 'origin' || game.source === 'origin';
      if (isEA && eaMatch && eaMatch[2]) {
        // EA uses: origin2://game/launch?offerIds=<OfferId>
        const offerId = eaMatch[2];
        const eaUrl = `origin2://game/launch?offerIds=${offerId}`;
        console.log(`[LauncherService] Launching EA game: ${eaUrl}`);
        await shell.openExternal(eaUrl);

        // Update lastPlayed timestamp
        game.lastPlayed = new Date().toISOString();
        await this.gameStore.saveGame(game);

        return { success: true };
      }

      // GOG: gog-<ProductId> (Product IDs should be numeric)
      const gogMatch = gameId.match(/^gog-(\d+)$/);
      const isGOG = gogMatch || game.platform === 'gog' || game.source === 'gog';
      if (isGOG && gogMatch && gogMatch[1]) {
        // GOG uses: goggalaxy://launchGame/<ProductID>
        const productId = gogMatch[1];
        const gogUrl = `goggalaxy://launchGame/${productId}`;
        console.log(`[LauncherService] Launching GOG game via protocol: ${gogUrl}`);
        await shell.openExternal(gogUrl);

        // Update lastPlayed timestamp
        game.lastPlayed = new Date().toISOString();
        await this.gameStore.saveGame(game);

        return { success: true };
      }

      // Ubisoft Connect: ubisoft-<GameId> (Game IDs should be numeric)
      const ubisoftMatch = gameId.match(/^ubisoft-(\d+)$/);
      const isUbisoft = ubisoftMatch || game.platform === 'ubisoft' || game.source === 'ubisoft';
      if (isUbisoft && ubisoftMatch && ubisoftMatch[1]) {
        // Ubisoft uses: uplay://launch/<GameID>
        const gameUbisoftId = ubisoftMatch[1];
        const ubisoftUrl = `uplay://launch/${gameUbisoftId}`;
        console.log(`[LauncherService] Launching Ubisoft game via protocol: ${ubisoftUrl}`);
        await shell.openExternal(ubisoftUrl);

        // Update lastPlayed timestamp
        game.lastPlayed = new Date().toISOString();
        await this.gameStore.saveGame(game);

        return { success: true };
      }

      // Rockstar Games Launcher: Launch via exe (no URI protocol)
      // Rockstar games typically need to be launched through their exe
      const isRockstar = game.platform === 'rockstar' || game.source === 'rockstar';
      if (isRockstar && game.exePath) {
        console.log(`[LauncherService] Launching Rockstar game via exe: ${game.exePath}`);
        // Fall through to exe launch below
      }

      // Xbox (UWP/PC Game Pass)
      const isXbox = gameId.startsWith('xbox-') || game.platform === 'xbox' || game.source === 'xbox';
      if (isXbox) {
        const xboxKind = (game as any).xboxKind as string | undefined;
        const appUserModelId = (game as any).appUserModelId as string | undefined;
        const launchUri = (game as any).launchUri as string | undefined || (appUserModelId ? `shell:AppsFolder\\${appUserModelId}` : undefined);

        console.log(`[LauncherService] Launching Xbox game: ${game.title}`);
        console.log(`  xboxKind: ${xboxKind}`);
        console.log(`  exePath: ${game.exePath}`);
        console.log(`  appUserModelId: ${appUserModelId}`);
        console.log(`  launchUri: ${launchUri}`);

        // Prefer direct explorer launch for UWP/MSIX entries
        if ((xboxKind === 'uwp' || appUserModelId || launchUri) && launchUri) {
          console.log(`[LauncherService] Using explorer.exe launch with URI: ${launchUri}`);
          const child = spawn('explorer.exe', [launchUri], {
            detached: true,
            stdio: 'ignore',
            shell: false,
          });
          child.unref();

          // Update lastPlayed timestamp
          game.lastPlayed = new Date().toISOString();
          await this.gameStore.saveGame(game);

          // Do not return explorer PID here: explorer exits quickly and is not the actual game process.
          // Returning it causes renderer/background tracking to mark the game as stopped almost immediately.
          return { success: true };
        }

        // Fallback to executable launch for PC installs
        if (!game.exePath) {
          console.error(`[LauncherService] Xbox PC game has no executable path: ${game.title}`);
          return { success: false, error: 'Executable path not set for this Xbox game' };
        }

        console.log(`[LauncherService] Using exe launch for PC Game Pass: ${game.exePath}`);
      }

      // Fallback: Check platform field if ID format doesn't match
      if (game.platform === 'steam') {
        // Fallback: platform is set to 'steam' but ID format doesn't match
        // Try to extract appId from the ID anyway
        const fallbackMatch = gameId.match(/steam-?(\d+)/);
        if (fallbackMatch && fallbackMatch[1]) {
          const appId = fallbackMatch[1];
          const steamUrl = `steam://rungameid/${appId}`;
          await shell.openExternal(steamUrl);

          // Update lastPlayed timestamp
          game.lastPlayed = new Date().toISOString();
          await this.gameStore.saveGame(game);

          return { success: true };
        }
        return { success: false, error: 'Invalid Steam game ID format' };
      }

      // For GOG games without proper IDs, try to launch via exe
      if (isGOG && !gogMatch && game.exePath) {
        console.log(`[LauncherService] GOG game without proper ID, launching via exe: ${game.exePath}`);
        // Fall through to exe launch below
      }

      // For Epic games without proper installation directory, try exe launch
      if (isEpic && !game.installationDirectory && game.exePath) {
        console.log(`[LauncherService] Epic game without installation directory, launching via exe: ${game.exePath}`);
        // Fall through to exe launch below
      }

      // Non-launcher game or fallback: launch the executable
      if (!game.exePath) {
        return { success: false, error: 'Executable path not set for this game' };
      }

      // Use normalized native paths on Windows to avoid EACCES (spawn can fail with forward slashes)
      let exePath = game.exePath;
      if (exePath.startsWith('"') && exePath.endsWith('"')) {
        exePath = exePath.slice(1, -1);
      }
      exePath = normalize(exePath);
      const workingDir = normalize(dirname(exePath));

      console.log(`[LauncherService] Executing exe: ${exePath}`);
      console.log(`[LauncherService] Working directory: ${workingDir}`);

      // Parse launch arguments if provided (trim so whitespace-only or leading/trailing space works)
      const args: string[] = [];
      const launchArgsStr = typeof game.launchArgs === 'string' ? game.launchArgs.trim() : '';
      if (launchArgsStr) {
        const regex = /[^\s"]+|"([^"]*)"/g;
        let match;
        while ((match = regex.exec(launchArgsStr)) !== null) {
          const arg = match[1] !== undefined ? match[1] : match[0];
          if (arg.length > 0) args.push(arg);
        }
        console.log(`[LauncherService] Parsed launch arguments: ${JSON.stringify(args)}`);
      }

      let child: ReturnType<typeof spawn>;
      if (process.platform === 'win32') {
        // On Windows, use "start" via the system shell so the game launches like a shortcut.
        // Using shell: true avoids Node's CreateProcess argument quoting mangling paths with spaces.
        const escapedExe = exePath.replace(/"/g, '""');
        const argsForCmd = args.map(a => (a.includes(' ') ? `"${a.replace(/"/g, '""')}"` : a)).join(' ');
        const startCmd = `start "" "${escapedExe}"${argsForCmd ? ' ' + argsForCmd : ''}`;
        console.log(`[LauncherService] Using shell launch: ${startCmd}`);
        child = spawn(startCmd, [], {
          detached: true,
          stdio: 'ignore',
          shell: true,
          cwd: workingDir,
        });
      } else {
        child = spawn(exePath, args, {
          detached: true,
          stdio: 'ignore',
          shell: false,
          cwd: workingDir,
        });
      }

      child.unref();
      child.on('error', (error) => {
        console.error(`Failed to launch game: ${error.message}`);
      });

      game.lastPlayed = new Date().toISOString();
      await this.gameStore.saveGame(game);

      if (isXbox) {
        return { success: true };
      }
      return { success: true, pid: child.pid };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error launching game:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Launch the configured mod manager for a game
   * Supports web URLs and local file paths
   */
  async launchModManager(gameId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const games = await this.gameStore.getLibrary();
      const game = games.find(g => g.id === gameId);

      if (!game) {
        return { success: false, error: `Game with ID ${gameId} not found` };
      }

      const modManagerUrl = game.modManagerUrl;
      if (!modManagerUrl) {
        return { success: false, error: 'Mod manager not configured for this game' };
      }

      console.log(`[LauncherService] Launching mod manager for ${game.title}: ${modManagerUrl}`);

      // Try as URL first
      try {
        if (modManagerUrl.startsWith('http://') || modManagerUrl.startsWith('https://') || modManagerUrl.includes('://')) {
          await shell.openExternal(modManagerUrl);
          return { success: true };
        }
      } catch (e) {
        // Not a URL, continue to file path check
      }

      const { existsSync } = require('node:fs');
      if (existsSync(modManagerUrl)) {
        const error = await shell.openPath(modManagerUrl);
        return { success: error === '', error: error || undefined };
      }

      return { success: false, error: 'Mod manager path or URL is invalid or not found' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error launching mod manager:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Open the game's uninstaller if present in the game folder; otherwise open Windows Settings > Apps.
   */
  async openGameUninstaller(gameId: string): Promise<{ success: boolean; error?: string; openedUninstaller?: boolean }> {
    try {
      const games = await this.gameStore.getLibrary();
      const game = games.find(g => g.id === gameId);
      if (!game) {
        return { success: false, error: `Game with ID ${gameId} not found` };
      }

      const gameDir = game.exePath ? dirname(game.exePath) : game.installationDirectory;
      if (!gameDir || !existsSync(gameDir)) {
        console.log(`[LauncherService] No game folder for "${game.title}", opening Windows Settings > Apps`);
        await shell.openExternal('ms-settings:appsfeatures');
        return { success: true, openedUninstaller: false };
      }

      const dirEntries = readdirSync(gameDir, { withFileTypes: true });
      const files = dirEntries.filter(e => e.isFile());
      const lowerToName = new Map(files.map(e => [e.name.toLowerCase(), e.name]));

      for (const name of UNINSTALLER_NAMES) {
        const actualName = lowerToName.get(name.toLowerCase());
        if (actualName) {
          const uninstallerPath = join(gameDir, actualName);
          console.log(`[LauncherService] Opening uninstaller: ${uninstallerPath}`);
          const openError = await shell.openPath(uninstallerPath);
          if (openError) {
            return { success: false, error: openError, openedUninstaller: true };
          }
          return { success: true, openedUninstaller: true };
        }
      }

      console.log(`[LauncherService] No uninstaller found in "${gameDir}", opening Windows Settings > Apps`);
      await shell.openExternal('ms-settings:appsfeatures');
      return { success: true, openedUninstaller: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[LauncherService] Error in openGameUninstaller:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Attempt to find a running process for a Steam game by matching its installation directory.
   * This is used for Steam games launched via protocol since they don't return a PID.
   */
  private async getActiveSteamProcessId(game: Game): Promise<number | undefined> {
    if (process.platform !== 'win32' || !game.installationDirectory) {
      return undefined;
    }

    try {
      // Use wmic to find processes that might be the game
      // We look for processes where the executable path contains the game's installation directory
      // This is a heuristic but fairly reliable for Steam games.
      const normalizedInstallDir = game.installationDirectory.replace(/\//g, '\\').toLowerCase();

      return new Promise<number | undefined>((resolve) => {
        execFile('wmic', ['process', 'where', 'NOT ExecutablePath IS NULL', 'get', 'ExecutablePath,ProcessId'], (error, stdout) => {
          if (error) {
            console.error('[LauncherService] wmic error:', error);
            resolve(undefined);
            return;
          }

          const lines = stdout.split('\n').filter(line => line.trim().length > 0);
          // Skip header
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            const lastSpaceIndex = line.lastIndexOf(' ');
            if (lastSpaceIndex === -1) continue;

            const exePath = line.substring(0, lastSpaceIndex).trim().toLowerCase();
            const pidStr = line.substring(lastSpaceIndex).trim();
            const pid = parseInt(pidStr, 10);

            if (exePath.includes(normalizedInstallDir)) {
              // Extra check: skip common helpers/overlay processes if possible
              const exeName = exePath.split('\\').pop() || '';
              if (!exeName.includes('steamhelper') &&
                !exeName.includes('overlay') &&
                !exeName.includes('crashreport') &&
                !exeName.includes('launcher')) {
                resolve(pid);
                return;
              }
            }
          }
          resolve(undefined);
        });
      });
    } catch (error) {
      console.error('[LauncherService] Failed to detect Steam game process:', error);
      return undefined;
    }
  }
}
