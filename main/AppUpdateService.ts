import { app, net } from 'electron';
import type { BrowserWindow } from 'electron';

// electron-updater is optional in packaged builds; guard require so missing module doesn't crash startup.
type AutoUpdater = typeof import('electron-updater')['autoUpdater'];
let autoUpdater: AutoUpdater | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  autoUpdater = require('electron-updater').autoUpdater;
} catch {
  autoUpdater = null;
}
import * as fs from 'node:fs';
import * as path from 'node:path';

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
  progressPercent?: number;
}

function sanitizeUpdateErrorMessage(raw?: string): string | undefined {
  if (!raw) return undefined;

  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const hasHtml = /<!doctype html|<html|<head|<body|<style|<script|<div|<span/i.test(trimmed);
  if (hasHtml) {
    return 'Update check failed due to an unexpected server response. Please try again in a moment.';
  }

  const normalized = trimmed.replace(/\s+/g, ' ');

  if (/net::err_internet_disconnected|enotfound|eai_again/i.test(normalized)) {
    return 'Update check failed because the internet connection appears to be unavailable.';
  }

  if (/timed out|timeout/i.test(normalized)) {
    return 'Update check timed out. Please try again.';
  }

  if (/latest\.yml|cannot find channel|cannot parse update info/i.test(normalized)) {
    return 'Update metadata could not be read from the update server. Please try again later.';
  }

  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}

const GITHUB_OWNER = 'Lasikiewicz';
const GITHUB_REPO = 'onyx';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

/** Parses version from tag like "alpha-v0.3.7" or "v0.3.7". Returns null if not parseable. */
function versionFromTag(tag: string): string | null {
  const match = tag.match(/v?(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

/** Compare version strings (e.g. "0.3.7" > "0.3.6"). Returns true if a > b. */
function versionGt(a: string, b: string): boolean {
  return compareVersions(a, b) > 0;
}

/** Compare version strings for sorting. Returns -1 if a < b, 0 if equal, 1 if a > b. */
function compareVersions(a: string, b: string): number {
  const parts = (v: string) => v.split('.').map(Number);
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

interface AlphaUpdateInfo {
  tag: string;
  version: string;
  downloadUrl: string;
}

let isAlpha = false;
let getWin: (() => BrowserWindow | null) | null = null;
let pendingAlphaUpdate: AlphaUpdateInfo | null = null;
let downloadedAlphaPath: string | null = null;

let statusListeners: Array<(payload: UpdateStatusPayload) => void> = [];

/**
 * Adds a listener for update status changes.
 * Used for coordination between update checks and other startup tasks in the main process.
 */
export function addUpdateStatusListener(
  listener: (payload: UpdateStatusPayload) => void
): () => void {
  statusListeners.push(listener);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== listener);
  };
}

/**
 * Alpha builds: electron-updater uses the releases Atom feed and picks the *first* entry.
 * The feed order can put alpha-v0.3.6 before alpha-v0.3.7, so 0.3.6 never sees 0.3.7.
 * We bypass that by using the GitHub REST API to get the latest prerelease by version.
 */
async function checkForUpdatesAlpha(): Promise<void> {
  const send = (payload: UpdateStatusPayload) => {
    const win = getWin?.() ?? null;
    if (win && !win.isDestroyed() && win.webContents) {
      win.webContents.send('app:update-status', payload);
    }
    // Also notify main process listeners
    statusListeners.forEach((l) => l(payload));
  };

  send({ status: 'checking' });
  pendingAlphaUpdate = null;

  try {
    const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const req = net.request({
        method: 'GET',
        url: GITHUB_API,
        useSessionCookies: false
      });
      req.setHeader('Accept', 'application/vnd.github.v3+json');
      req.on('response', (response) => {
        let body = '';
        response.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        response.on('end', () => resolve({ statusCode: response.statusCode ?? 0, body }));
      });
      req.on('error', reject);
      req.end();
    });

    if (res.statusCode !== 200) {
      send({ status: 'error', error: sanitizeUpdateErrorMessage(`GitHub API returned ${res.statusCode}`) });
      return;
    }

    const releases: Array<{ tag_name: string; prerelease: boolean; assets: Array<{ name: string; browser_download_url: string }> }> = JSON.parse(res.body);
    const prereleases = releases.filter((r) => r.prerelease === true);
    if (prereleases.length === 0) {
      send({ status: 'not-available' });
      return;
    }

    // Sort by version descending (newest first) using semantic version comparison
    const withVersion = prereleases
      .map((r) => ({ release: r, version: versionFromTag(r.tag_name) }))
      .filter((x): x is { release: (typeof prereleases)[0]; version: string } => x.version !== null);
    withVersion.sort((a, b) => compareVersions(b.version, a.version)); // Descending: b vs a

    const latest = withVersion[0];
    if (!latest) {
      send({ status: 'not-available' });
      return;
    }

    const currentVersion = app.getVersion();
    if (!versionGt(latest.version, currentVersion)) {
      send({ status: 'not-available' });
      return;
    }

    const exeAsset = latest.release.assets.find(
      (a) => a.name.endsWith('.exe') && a.name.toLowerCase().includes('setup')
    );
    if (!exeAsset) {
      send({ status: 'error', error: sanitizeUpdateErrorMessage('No Setup exe found in release') });
      return;
    }

    pendingAlphaUpdate = {
      tag: latest.release.tag_name,
      version: latest.version,
      downloadUrl: exeAsset.browser_download_url
    };
    send({ status: 'available', version: latest.version });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[AppUpdate] Alpha check failed:', err);
    send({ status: 'error', error: sanitizeUpdateErrorMessage(err.message) });
  }
}

/**
 * Configures and runs the app updater. Only active when app.isPackaged.
 * Alpha builds use a custom GitHub API check so the newest prerelease is found (Atom feed order is unreliable).
 */
export function initAppUpdateService(
  getWinFn: () => BrowserWindow | null,
  isAlphaBuild: boolean
): void {
  if (!app.isPackaged) {
    return;
  }

  if (!autoUpdater) {
    console.warn('[AppUpdate] electron-updater not available; update service disabled.');
    return;
  }

  isAlpha = isAlphaBuild;
  getWin = getWinFn;

  autoUpdater.allowPrerelease = isAlphaBuild;
  autoUpdater.autoDownload = false;
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO
  });

  console.log(`[AppUpdate] Configured: isAlpha=${isAlphaBuild}, allowPrerelease=${autoUpdater.allowPrerelease}`);

  const send = (payload: UpdateStatusPayload) => {
    const win = getWin?.() ?? null;
    if (win && !win.isDestroyed() && win.webContents) {
      win.webContents.send('app:update-status', payload);
    }
    // Also notify main process listeners
    statusListeners.forEach((l) => l(payload));
  };

  autoUpdater.on('checking-for-update', () => send({ status: 'checking' }));
  autoUpdater.on('update-available', (info: { version?: string }) => {
    send({ status: 'available', version: info?.version });
  });
  autoUpdater.on('update-not-available', () => send({ status: 'not-available' }));
  autoUpdater.on('download-progress', (progress: { percent?: number }) =>
    send({
      status: 'downloading',
      progressPercent: typeof progress?.percent === 'number'
        ? Math.max(0, Math.min(100, progress.percent))
        : undefined,
    }),
  );
  autoUpdater.on('update-downloaded', () => send({ status: 'downloaded' }));
  autoUpdater.on('error', (err: Error) => {
    send({ status: 'error', error: sanitizeUpdateErrorMessage(err?.message ?? String(err)) });
  });
}

export function checkForUpdates(): void {
  const { app } = require('electron');
  if (!app.isPackaged) return;
  if (!autoUpdater && !isAlpha) return;
  try {
    if (isAlpha) {
      checkForUpdatesAlpha();
    } else {
      autoUpdater!.checkForUpdates().catch((err) => {
        console.error('[AppUpdate] checkForUpdates failed:', err);
      });
    }
  } catch (e) {
    console.error('[AppUpdate] checkForUpdates error:', e);
  }
}

export function downloadUpdate(): Promise<string[] | null> {
  const { app } = require('electron');
  if (!app.isPackaged) return Promise.resolve(null);

  if (isAlpha && pendingAlphaUpdate) {
    const send = (payload: UpdateStatusPayload) => {
      const win = getWin?.() ?? null;
      if (win && !win.isDestroyed() && win.webContents) {
        win.webContents.send('app:update-status', payload);
      }
      // Also notify main process listeners
      statusListeners.forEach((l) => l(payload));
    };
    const url = pendingAlphaUpdate.downloadUrl;
    const filename = path.basename(new URL(url).pathname) || `Onyx.Alpha.Setup.${pendingAlphaUpdate.version}.exe`;
    const destPath = path.join(app.getPath('temp'), filename);

    send({ status: 'downloading' });

    return new Promise((resolve) => {
      const req = net.request({ method: 'GET', url, useSessionCookies: false });
      const out = fs.createWriteStream(destPath);
      req.on('response', (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          out.close();
          fs.unlink(destPath, () => { });
          send({ status: 'error', error: sanitizeUpdateErrorMessage(`Download failed: ${response.statusCode}`) });
          resolve(null);
          return;
        }
        const totalBytesHeader = response.headers['content-length'];
        const totalBytesRaw = Array.isArray(totalBytesHeader) ? totalBytesHeader[0] : totalBytesHeader;
        const totalBytes = totalBytesRaw ? Number(totalBytesRaw) : NaN;
        const hasTotalBytes = Number.isFinite(totalBytes) && totalBytes > 0;
        let downloadedBytes = 0;

        response.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          out.write(chunk);

          if (hasTotalBytes) {
            send({
              status: 'downloading',
              progressPercent: Math.max(0, Math.min(100, (downloadedBytes / totalBytes) * 100)),
            });
          }
        });
        response.on('end', () => {
          out.end(() => {
            downloadedAlphaPath = destPath;
            send({ status: 'downloaded' });
            resolve([destPath]);
          });
        });
      });
      req.on('error', (err) => {
        out.close();
        fs.unlink(destPath, () => { });
        send({ status: 'error', error: sanitizeUpdateErrorMessage(err.message) });
        resolve(null);
      });
      req.end();
    });
  }

  if (!autoUpdater) return Promise.resolve(null);
  return autoUpdater.downloadUpdate();
}

export function quitAndInstall(): void {
  const { app } = require('electron');
  if (!app.isPackaged) return;

  if (downloadedAlphaPath && fs.existsSync(downloadedAlphaPath)) {
    const { spawn } = require('child_process');
    spawn(downloadedAlphaPath, [], { detached: true, stdio: 'ignore' }).unref();
    app.quit();
    return;
  }

  if (autoUpdater) {
    autoUpdater.quitAndInstall(false);
  }
}
