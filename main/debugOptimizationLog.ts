/**
 * In-depth optimization debug log (local dev only).
 * Writes to debug-logs/optimization.log in the app path (repo root when running electron .).
 * Also keeps a crash-context file with the last N lines for post-crash inspection.
 * Enable only when app is not packaged (development).
 */

import { app } from 'electron';
import path from 'node:path';
import { appendFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';

const CRASH_CONTEXT_LINES = 80;

let logPath: string | null = null;
let contextPath: string | null = null;
let enabled = false;
const recentLines: string[] = [];

function init(): boolean {
  if (logPath !== null) return enabled;
  try {
    const allowPackagedLogging = process.env.ONYX_OPTIMIZATION_DEBUG === '1';
    if (app.isPackaged && !allowPackagedLogging) {
      logPath = '';
      contextPath = null;
      enabled = false;
      return false;
    }
    const dir = app.isPackaged
      ? path.join(app.getPath('userData'), 'debug-logs')
      : path.join(app.getAppPath(), 'debug-logs');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    logPath = path.join(dir, 'optimization.log');
    contextPath = path.join(dir, 'crash-context.txt');
    enabled = true;
    const startLine = `[${new Date().toISOString()}] debug log started, path=${logPath}\n`;
    appendFileSync(logPath, startLine, 'utf8');
    recentLines.push(startLine.trim());
    return true;
  } catch {
    logPath = '';
    contextPath = null;
    enabled = false;
    return false;
  }
}

export function isDebugOptimizationEnabled(): boolean {
  return init() && enabled;
}

function writeCrashContext(): void {
  if (!contextPath || recentLines.length === 0) return;
  try {
    const tail = recentLines.slice(-CRASH_CONTEXT_LINES);
    writeFileSync(
      contextPath,
      `Last ${tail.length} optimization log lines (updated on each log). Process may have crashed after last line.\n\n${tail.join('\n')}\n`,
      'utf8'
    );
  } catch {
    /* ignore */
  }
}

export function debugOptimizationLog(message: string): void {
  if (!init() || !enabled || !logPath) return;
  try {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    appendFileSync(logPath, line, 'utf8');
    recentLines.push(line.trim());
    if (recentLines.length > CRASH_CONTEXT_LINES * 2) {
      recentLines.splice(0, recentLines.length - CRASH_CONTEXT_LINES);
    }
    writeCrashContext();
  } catch {
    /* ignore */
  }
}
