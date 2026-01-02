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
   * For Steam games: opens steam://rungameid/<AppID>
   * For non-Steam games: executes the .exe file using child_process.spawn
   */
  async launchGame(gameId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const games = await this.gameStore.getLibrary();
      const game = games.find(g => g.id === gameId);

      if (!game) {
        return { success: false, error: `Game with ID ${gameId} not found` };
      }

      if (game.platform === 'steam') {
        // Extract AppID from game ID (format: steam-<AppID>)
        const appIdMatch = gameId.match(/^steam-(.+)$/);
        if (!appIdMatch || !appIdMatch[1]) {
          return { success: false, error: 'Invalid Steam game ID format' };
        }

        const appId = appIdMatch[1];
        const steamUrl = `steam://rungameid/${appId}`;

        // Use Electron's shell.openExternal to open the Steam URL
        // This is safer than finding the EXE directly
        await shell.openExternal(steamUrl);
        return { success: true };
      } else {
        // Non-Steam game: launch the executable
        if (!game.exePath) {
          return { success: false, error: 'Executable path not set for this game' };
        }

        // Use spawn to execute the game
        // On Windows, spawn can directly execute .exe files
        const child = spawn(game.exePath, [], {
          detached: true,
          stdio: 'ignore',
        });

        // Unref the child process so it doesn't keep the Electron app alive
        child.unref();

        // Check if the process started successfully
        child.on('error', (error) => {
          console.error(`Failed to launch game: ${error.message}`);
        });

        return { success: true };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error launching game:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}
