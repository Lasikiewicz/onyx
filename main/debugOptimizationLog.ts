/**
 * In-depth optimization debug log (local dev only).
 * Writes to debug-logs/optimization.log in the app path (repo root when running electron .).
 * Enable only when app is not packaged (development).
 */

import { app } from 'electron';
import path from 'node:path';
import { appendFileSync, mkdirSync, existsSync } from 'node:fs';

let logPath: string | null = null;
let enabled = false;

function init(): boolean {
  if (logPath !== null) return enabled;
  try {
    if (app.isPackaged) {
      logPath = '';
      enabled = false;
      return false;
    }
    const dir = path.join(app.getAppPath(), 'debug-logs');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    logPath = path.join(dir, 'optimization.log');
    enabled = true;
    appendFileSync(logPath, `[${new Date().toISOString()}] debug log started, path=${logPath}\n`, 'utf8');
    return true;
  } catch {
    logPath = '';
    enabled = false;
    return false;
  }
}

export function isDebugOptimizationEnabled(): boolean {
  return init() && enabled;
}

export function debugOptimizationLog(message: string): void {
  if (!init() || !enabled || !logPath) return;
  try {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    appendFileSync(logPath, line, 'utf8');
  } catch {
    /* ignore */
  }
}
