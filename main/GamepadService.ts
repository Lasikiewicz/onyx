import { BrowserWindow, ipcMain } from 'electron';
import { UserPreferencesService } from './UserPreferencesService.js';

/**
 * GamepadService manages gamepad/controller support
 * Uses Chromium's built-in Gamepad API via the renderer process
 * This service coordinates between main process and renderer for gamepad input
 */
export class GamepadService {
  private userPreferencesService: UserPreferencesService;
  private winReference: { current: BrowserWindow | null };

  constructor(
    winReference: { current: BrowserWindow | null },
    userPreferencesService: UserPreferencesService
  ) {
    this.winReference = winReference;
    this.userPreferencesService = userPreferencesService;
    this.registerIPCHandlers();
  }

  private registerIPCHandlers() {
    // Get gamepad preferences
    ipcMain.handle('gamepad:getPreferences', async () => {
      const prefs = await this.userPreferencesService.getPreferences();
      return {
        enabled: prefs.enableGamepadSupport ?? true,
        navigationSpeed: prefs.gamepadNavigationSpeed ?? 1.0,
        buttonLayout: prefs.gamepadButtonLayout ?? 'xbox',
      };
    });

    // Update gamepad preferences
    ipcMain.handle('gamepad:setEnabled', async (_event, enabled: boolean) => {
      await this.userPreferencesService.savePreferences({
        enableGamepadSupport: enabled,
      });
      return { success: true };
    });

    ipcMain.handle('gamepad:setNavigationSpeed', async (_event, speed: number) => {
      await this.userPreferencesService.savePreferences({
        gamepadNavigationSpeed: speed,
      });
      return { success: true };
    });

    ipcMain.handle('gamepad:setButtonLayout', async (_event, layout: 'xbox' | 'playstation') => {
      await this.userPreferencesService.savePreferences({
        gamepadButtonLayout: layout,
      });
      return { success: true };
    });
  }
}
