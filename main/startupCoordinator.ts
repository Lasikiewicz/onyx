import { ipcMain, type BrowserWindow } from 'electron';
import { addUpdateStatusListener, checkForUpdates, type UpdateStatusPayload } from './AppUpdateService.js';
import type { UserPreferencesService } from './UserPreferencesService.js';

type WindowReference = { readonly current: BrowserWindow | null };
type UpdateStatusListener = (payload: UpdateStatusPayload) => void;

export interface StartupCoordinatorOptions {
  appIsPackaged: boolean;
  userPreferencesService: Pick<UserPreferencesService, 'getPreferences'>;
  winReference: WindowReference;
  performBackgroundScan: (emitStartupEvents: boolean, sendStartupOverlay: boolean) => Promise<void>;
  onShowWindow: () => void;
  addUpdateStatusListener?: (listener: UpdateStatusListener) => void;
  checkForUpdates?: () => void;
  fallbackDelayMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerStartupCoordinator({
  appIsPackaged,
  userPreferencesService,
  winReference,
  performBackgroundScan,
  onShowWindow,
  addUpdateStatusListener: registerUpdateStatusListener = addUpdateStatusListener,
  checkForUpdates: triggerUpdateCheck = checkForUpdates,
  fallbackDelayMs = 5000,
}: StartupCoordinatorOptions) {
  let startupScanCancelled = false;
  let updateCheckComplete = false;
  let updateFound = false;
  let updateDismissed = false;
  let startupScanResolve: (() => void) | null = null;
  let updateStatusReceived = false;
  let startupSequenceInitiated = false;

  const resolvePendingStartupWait = () => {
    if (startupScanResolve) {
      startupScanResolve();
      startupScanResolve = null;
    }
  };

  registerUpdateStatusListener((payload) => {
    if (payload.status === 'available' || payload.status === 'not-available' || payload.status === 'error') {
      updateStatusReceived = true;
      if (payload.status === 'available') {
        updateFound = true;
      }
      console.log(`[AppUpdate] Update check completed - status: ${payload.status}`);
    }

    if (payload.status === 'downloaded') {
      updateDismissed = true;
      resolvePendingStartupWait();
    }
  });

  const sendStartupProgress = (message: string) => {
    const win = winReference.current;
    if (win && !win.isDestroyed()) {
      win.webContents.send('startup:progress', { message });
    }
  };

  const runStartupSequence = async () => {
    console.log('[Startup] Starting sequence...');

    const checkForUpdatesOnStartup = async () => {
      try {
        if (!appIsPackaged) {
          updateCheckComplete = true;
          return;
        }

        const prefs = await userPreferencesService.getPreferences();
        if (prefs.checkForUpdatesOnStartup !== false) {
          console.log('[AppUpdate] Checking for updates on startup...');
          triggerUpdateCheck();

          let waited = 0;
          while (waited < 10000 && !updateStatusReceived) {
            await sleep(200);
            waited += 200;
          }

          if (!updateStatusReceived) {
            console.log('[AppUpdate] Update status check timed out - proceeding');
          }
        }
      } catch (error) {
        console.error('[AppUpdate] Error in startup update check:', error);
      } finally {
        updateCheckComplete = true;
      }
    };

    const performStartupScanWithGate = async () => {
      try {
        const prefs = await userPreferencesService.getPreferences();
        if (!prefs.updateLibrariesOnStartup) {
          console.log('[StartupScan] Startup scan disabled in preferences');
          return;
        }

        console.log('[StartupScan] Update Libraries on Startup is enabled');
        console.log('[StartupScan] Waiting for update check to complete...');
        while (!updateCheckComplete && !startupScanCancelled) {
          await sleep(100);
        }

        if (startupScanCancelled) return;

        if (updateFound && !updateDismissed) {
          console.log('[StartupScan] Update found, waiting for user interaction...');
          await new Promise<void>((resolve) => {
            startupScanResolve = resolve;
          });
        }

        if (startupScanCancelled) return;

        console.log('[StartupScan] Starting background library scan...');
        sendStartupProgress('Checking for new games...');
        await performBackgroundScan(true, true);
        sendStartupProgress('Scan complete');
      } catch (error) {
        console.error('[StartupScan] Error during startup scan:', error);
        sendStartupProgress('Error during scan');
      }
    };

    await Promise.all([
      checkForUpdatesOnStartup(),
      performStartupScanWithGate(),
    ]);
  };

  const startStartupSequence = () => {
    if (startupSequenceInitiated) return;
    startupSequenceInitiated = true;
    void runStartupSequence();
  };

  const updateFoundListener = () => {
    updateFound = true;
    console.log('[StartupScan] Update found - pausing startup scan');
  };
  const updateDismissedListener = () => {
    updateDismissed = true;
    console.log('[StartupScan] Update dismissed - resuming startup scan');
    resolvePendingStartupWait();
  };

  ipcMain.on('app:ready', startStartupSequence);
  ipcMain.on('app:show-window', onShowWindow);
  ipcMain.on('app:update-found', updateFoundListener);
  ipcMain.on('app:update-dismissed', updateDismissedListener);

  ipcMain.handle('startup:cancel-scan', () => {
    startupScanCancelled = true;
    console.log('[StartupScan] Startup scan cancelled by user action');
    resolvePendingStartupWait();
    return { success: true };
  });

  const fallbackTimer = setTimeout(() => {
    if (!startupSequenceInitiated) {
      console.log('[Startup] app:ready not received, starting sequence via fallback');
      startStartupSequence();
    }
  }, fallbackDelayMs);

  return {
    startStartupSequence,
    dispose: () => {
      clearTimeout(fallbackTimer);
      ipcMain.removeListener('app:ready', startStartupSequence);
      ipcMain.removeListener('app:show-window', onShowWindow);
      ipcMain.removeListener('app:update-found', updateFoundListener);
      ipcMain.removeListener('app:update-dismissed', updateDismissedListener);
      ipcMain.removeHandler('startup:cancel-scan');
    },
  };
}
