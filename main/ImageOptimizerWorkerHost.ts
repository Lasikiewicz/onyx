/**
 * Spawns and talks to the ImageOptimizer worker thread. Main process uses this to run Sharp off the main thread.
 */

import { app } from 'electron';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { debugOptimizationLog, isDebugOptimizationEnabled } from './debugOptimizationLog.js';

export type OptimizeMode = 'static' | 'animated-webp';

export interface OptimizeResult {
  data: Buffer;
  ext: string;
}

let worker: Worker | null = null;
let workerFailed = false; // avoid repeated spawn attempts if worker never loads
let consecutiveWorkerExits = 0; // in release, stop respawning after repeated crashes
const pending = new Map<string, { resolve: (r: OptimizeResult) => void; reject: (e: Error) => void }>();
let nextId = 0;

function getWorker(): Worker | null {
  if (worker) return worker;
  if (workerFailed) return null;
  try {
    let workerPath = path.join(__dirname, 'ImageOptimizerWorker.worker.js');
    // Electron asar: load worker from unpacked dir so Sharp native module can load
    workerPath = workerPath.replace(/app\.asar([/\\])/g, 'app.asar.unpacked$1');
    worker = new Worker(workerPath, { workerData: {} });
    if (isDebugOptimizationEnabled()) debugOptimizationLog('worker spawn');
    worker.on('message', (msg: { type: string; id: string; data?: ArrayBuffer; ext?: string; message?: string }) => {
      const entry = pending.get(msg?.id);
      if (!entry) return;
      pending.delete(msg.id);
      try {
        if (msg.type === 'result' && msg.data != null && typeof msg.ext === 'string') {
          consecutiveWorkerExits = 0; // success: allow worker to be respawned if it exits later
          if (isDebugOptimizationEnabled()) debugOptimizationLog(`worker result id=${msg.id} outBytes=${msg.data.byteLength} ext=${msg.ext}`);
          // Defer Buffer.from to next tick so this handler returns quickly and doesn't block the event loop (avoids "Not Responding")
          const data = msg.data;
          const ext = msg.ext;
          setImmediate(() => {
            try {
              entry.resolve({ data: Buffer.from(data), ext });
            } catch (e) {
              entry.reject(e instanceof Error ? e : new Error(String(e)));
            }
          });
        } else if (msg.type === 'error') {
          if (isDebugOptimizationEnabled()) debugOptimizationLog(`worker error id=${msg.id} message=${msg.message ?? 'Worker error'}`);
          entry.reject(new Error(msg.message ?? 'Worker error'));
        }
      } catch (e) {
        entry.reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
    worker.on('error', (err) => {
      console.warn('[ImageOptimizerWorker] Worker error:', err);
      for (const [, entry] of pending) entry.reject(err);
      pending.clear();
      worker = null;
    });
    worker.on('exit', (code) => {
      if (code !== 0) {
        consecutiveWorkerExits++;
        console.warn('[ImageOptimizerWorker] Worker exited with code', code, `(consecutive exits: ${consecutiveWorkerExits})`);
        for (const [, entry] of pending) entry.reject(new Error(`Worker exited ${code}`));
        pending.clear();
        // In release, after 2 consecutive crashes stop respawning and use main-thread Sharp only
        if (consecutiveWorkerExits >= 2 && app.isPackaged) {
          console.warn('[ImageOptimizerWorker] Disabling worker after repeated exits; using main-thread fallback.');
          workerFailed = true;
        }
      }
      worker = null;
    });
    return worker;
  } catch (err) {
    console.warn('[ImageOptimizerWorker] Failed to start worker (run build so ImageOptimizerWorker.worker.js exists):', err);
    workerFailed = true;
    return null;
  }
}

export function optimizeInWorker(
  imageData: Buffer,
  imageType: string,
  sourceExt: string,
  mode: OptimizeMode
): Promise<OptimizeResult> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    if (!w) {
      reject(new Error('Worker not available'));
      return;
    }
    const id = `opt-${++nextId}-${Date.now()}`;
    pending.set(id, { resolve, reject });
    const buf = Buffer.from(imageData);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    if (isDebugOptimizationEnabled()) debugOptimizationLog(`worker send id=${id} mode=${mode} imageType=${imageType} bytes=${imageData.length}`);
    try {
      w.postMessage(
        { type: 'optimize', id, imageData: ab, imageType, sourceExt, mode },
        [ab]
      );
    } catch (err) {
      pending.delete(id);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export function isWorkerAvailable(): boolean {
  return getWorker() !== null;
}

export function getWorkerDiagnostics(): {
  workerPath: string;
  workerPathExists: boolean;
  workerFailed: boolean;
  consecutiveWorkerExits: number;
  hasLiveWorker: boolean;
  isPackaged: boolean;
} {
  let workerPath = path.join(__dirname, 'ImageOptimizerWorker.worker.js');
  workerPath = workerPath.replace(/app\.asar([/\\])/g, 'app.asar.unpacked$1');
  return {
    workerPath,
    workerPathExists: existsSync(workerPath),
    workerFailed,
    consecutiveWorkerExits,
    hasLiveWorker: worker !== null,
    isPackaged: app.isPackaged,
  };
}
