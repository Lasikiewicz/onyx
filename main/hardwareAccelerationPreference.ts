import fs from 'node:fs';
import path from 'node:path';

/**
 * Reads the hardware acceleration preference straight from the preferences file.
 *
 * Electron ignores app.disableHardwareAcceleration() once the app is ready, and the preference
 * service only loads asynchronously, so main.ts calls this before whenReady. Defaults to enabled
 * when the file, key or JSON is missing or unreadable, matching the preference default.
 */
export function readHardwareAccelerationEnabled(userDataDir: string): boolean {
  try {
    // Strip a UTF-8 byte-order mark: some editors and Windows PowerShell write one, and JSON.parse rejects it.
    const raw = fs.readFileSync(path.join(userDataDir, 'user-preferences.json'), 'utf8').replace(/^﻿/, '');
    const parsed = JSON.parse(raw);
    return parsed?.preferences?.enableHardwareAcceleration !== false;
  } catch {
    return true;
  }
}
