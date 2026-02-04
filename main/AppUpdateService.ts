import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { BrowserWindow } from 'electron';

export type UpdateStatus =
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateStatusPayload {
  status: UpdateStatus;
  version?: string;
  error?: string;
}

/**
 * Configures and runs the app updater. Only active when app.isPackaged.
 * Alpha builds use allowPrerelease so they receive prerelease GitHub releases.
 */
export function initAppUpdateService(
  getWin: () => BrowserWindow | null,
  isAlpha: boolean
): void {
  if (!app.isPackaged) {
    return;
  }

  // Explicitly configure GitHub provider (electron-updater doesn't read electron-builder config at runtime)
  // For GitHub, electron-updater will look for latest.yml in releases
  // With allowPrerelease=true, it will check prerelease tags (alpha-v*)
  // With allowPrerelease=false, it will check stable tags (v*)
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'Lasikiewicz',
    repo: 'onyx'
  });

  autoUpdater.autoDownload = false;
  autoUpdater.allowPrerelease = isAlpha;
  
  // Log configuration for debugging
  console.log(`[AppUpdate] Configured: isAlpha=${isAlpha}, allowPrerelease=${autoUpdater.allowPrerelease}`);

  const send = (payload: UpdateStatusPayload) => {
    const win = getWin();
    if (win && !win.isDestroyed() && win.webContents) {
      win.webContents.send('app:update-status', payload);
    }
  };

  autoUpdater.on('checking-for-update', () => {
    send({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info: { version?: string }) => {
    send({ status: 'available', version: info?.version });
  });

  autoUpdater.on('update-not-available', () => {
    send({ status: 'not-available' });
  });

  autoUpdater.on('download-progress', () => {
    send({ status: 'downloading' });
  });

  autoUpdater.on('update-downloaded', () => {
    send({ status: 'downloaded' });
  });

  autoUpdater.on('error', (err: Error) => {
    send({ status: 'error', error: err?.message || String(err) });
  });
}

export function checkForUpdates(): void {
  const { app } = require('electron');
  if (!app.isPackaged) return;
  try {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[AppUpdate] checkForUpdates failed:', err);
    });
  } catch (e) {
    console.error('[AppUpdate] checkForUpdates error:', e);
  }
}

export function downloadUpdate(): Promise<string[] | null> {
  if (!app.isPackaged) return Promise.resolve(null);
  return autoUpdater.downloadUpdate();
}

export function quitAndInstall(): void {
  if (!app.isPackaged) return;
  autoUpdater.quitAndInstall(false);
}
