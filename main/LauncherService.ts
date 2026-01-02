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

      // Check if this is a Steam game by ID format (most reliable indicator)
      // Game ID format for Steam games: steam-<AppID>
      // This is more reliable than checking the platform field which might be missing
      const appIdMatch = gameId.match(/^steam-(.+)$/);
      
      if (appIdMatch && appIdMatch[1]) {
        // This is a Steam game - launch via Steam URL protocol
        const appId = appIdMatch[1];
        const steamUrl = `steam://rungameid/${appId}`;

        // Use Electron's shell.openExternal to open the Steam URL
        // This is safer than finding the EXE directly
        await shell.openExternal(steamUrl);
        return { success: true };
      } else if (game.platform === 'steam') {
        // Fallback: platform is set to 'steam' but ID format doesn't match
        // Try to extract appId from the ID anyway
        const fallbackMatch = gameId.match(/steam-?(\d+)/);
        if (fallbackMatch && fallbackMatch[1]) {
          const appId = fallbackMatch[1];
          const steamUrl = `steam://rungameid/${appId}`;
          await shell.openExternal(steamUrl);
          return { success: true };
        }
        return { success: false, error: 'Invalid Steam game ID format' };
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
