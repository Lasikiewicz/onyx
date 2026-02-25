import { app } from 'electron';
import path from 'node:path';
import { readdirSync, existsSync, copyFileSync, mkdirSync, promises as fsPromises } from 'node:fs';

/**
 * One-time migration for alpha builds: copy userData from legacy "Onyx" folder to "Onyx Alpha".
 * Alpha 0.3.5 (bug) used app name "Onyx" so data lived in appData/Onyx; 0.3.6+ correctly use "Onyx Alpha".
 * Run before any service reads userData so they see migrated files.
 */
export function migrateAlphaUserDataFromOnyx(isAlpha: boolean): void {
  if (!isAlpha || !app.isPackaged) return;
  const current = app.getPath('userData');
  const legacy = path.join(app.getPath('appData'), 'Onyx');
  const marker = path.join(current, '.alpha-migrated-from-onyx');
  if (!existsSync(legacy) || existsSync(marker)) return;
  // Skip if current already has our store files (fresh install or already migrated)
  if (existsSync(path.join(current, 'game-library.json')) || existsSync(path.join(current, 'user-preferences.json'))) {
    try {
      fsPromises.writeFile(marker, '').catch(() => { });
    } catch {
      // ignore
    }
    return;
  }
  try {
    function copyRecursive(src: string, dest: string): void {
      const entries = readdirSync(src, { withFileTypes: true });
      for (const e of entries) {
        const srcPath = path.join(src, e.name);
        const destPath = path.join(dest, e.name);
        if (e.isDirectory()) {
          if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true });
          copyRecursive(srcPath, destPath);
        } else if (!existsSync(destPath)) {
          mkdirSync(path.dirname(destPath), { recursive: true });
          copyFileSync(srcPath, destPath);
        }
      }
    }
    copyRecursive(legacy, current);
    fsPromises.writeFile(marker, '').catch(() => { });
    console.log('[Alpha] Migrated userData from Onyx to Onyx Alpha.');
  } catch (err) {
    console.error('[Alpha] Migration from Onyx userData failed:', err);
  }
}
