import { spawn } from 'child_process';
import { shell } from 'electron';
import { GameStore, Game } from './GameStore.js';

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
          });
          child.unref();
          child.on('error', (error) => {
            console.error(`Failed to launch Xbox game via explorer: ${error.message}`);
          });

          // Update lastPlayed timestamp
          game.lastPlayed = new Date().toISOString();
          await this.gameStore.saveGame(game);

          return { success: true, pid: child.pid };
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

      // Use spawn to execute the game
      // On Windows, we need to use shell: true for paths with spaces
      // When using shell: true, the command/path must be quoted if it contains spaces
      const { dirname } = require('path');
      const workingDir = dirname(game.exePath);

      console.log(`[LauncherService] Spawning exe: ${game.exePath}`);
      console.log(`[LauncherService] Working directory: ${workingDir}`);
      if (game.launchArgs) {
        console.log(`[LauncherService] Launch arguments: ${game.launchArgs}`);
      }

      // Parse launch arguments if provided
      // Use a regex that respects quoted strings to avoid splitting paths with spaces
      const args: string[] = [];
      if (game.launchArgs) {
        const regex = /[^\s"]+|"([^"]*)"/g;
        let match;
        while ((match = regex.exec(game.launchArgs)) !== null) {
          // If the match is quoted, match[1] will have the content without quotes
          // Otherwise, match[0] has the unquoted word
          args.push(match[1] !== undefined ? match[1] : match[0]);
        }
      }

      // Quote the executable path for the shell if it hasn't been already
      const quotedExePath = game.exePath.startsWith('"') ? game.exePath : `"${game.exePath}"`;

      const child = spawn(quotedExePath, args, {
        detached: true,
        stdio: 'ignore',
        shell: true,  // Required on Windows for paths with spaces
        cwd: workingDir,  // Set working directory
      });

      // Unref the child process so it doesn't keep the Electron app alive
      child.unref();

      // Check if the process started successfully
      child.on('error', (error) => {
        console.error(`Failed to launch game: ${error.message}`);
      });

      // Update lastPlayed timestamp
      game.lastPlayed = new Date().toISOString();
      await this.gameStore.saveGame(game);

      // Return PID for process tracking (if available)
      return { success: true, pid: child.pid };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error launching game:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}
