import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// `app` is only available inside Electron. Guard against plain-Node test environments.
let appModule: { getPath: (name: string) => string } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require('electron');
  if (electron && electron.app && typeof electron.app.getPath === 'function') {
    appModule = electron.app;
  }
} catch {
  // Not running in Electron — appModule stays null
}

interface StoreOptions<T> {
  name?: string;
  defaults?: T;
}

export default class Store<T = any> {
  private filePath: string;
  private backupPath: string;
  private data: Record<string, any>;

  constructor(options: StoreOptions<T> = {}) {
    const name = options.name || 'config';
    const userDataDir = appModule ? appModule.getPath('userData') : os.tmpdir();
    this.filePath = path.join(userDataDir, `${name}.json`);
    this.backupPath = `${this.filePath}.bak`;
    this.data = options.defaults && typeof options.defaults === 'object'
      ? { ...(options.defaults as any) }
      : {};
    this.load();
  }

  /** Parse `raw`, merging into defaults. Returns false when the payload is not usable. */
  private applyRaw(raw: string): boolean {
    if (raw.trim().length === 0) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return false;
    this.data = { ...this.data, ...parsed };
    return true;
  }

  private load(): void {
    let loaded = false;
    try {
      if (fs.existsSync(this.filePath)) {
        loaded = this.applyRaw(fs.readFileSync(this.filePath, 'utf8'));
      }
    } catch (err) {
      // The primary file is unreadable or corrupt. Never silently fall through to empty
      // defaults: that would let the next save() overwrite real user data with nothing.
      // Preserve the bad file, then try the last-known-good backup.
      console.error(`[Store] Failed to read ${this.filePath}:`, err);
      try {
        fs.renameSync(this.filePath, `${this.filePath}.corrupt-${Date.now()}`);
      } catch {
        // Best effort only.
      }
      try {
        if (fs.existsSync(this.backupPath)) {
          loaded = this.applyRaw(fs.readFileSync(this.backupPath, 'utf8'));
          if (loaded) console.warn(`[Store] Recovered ${this.filePath} from backup.`);
        }
      } catch (backupErr) {
        console.error(`[Store] Backup recovery failed for ${this.filePath}:`, backupErr);
      }
    }

    // Snapshot a known-good copy once per process, so a later corruption has something
    // to recover from. Cheap: one extra write at startup, not per save.
    if (loaded) {
      try {
        fs.copyFileSync(this.filePath, this.backupPath);
      } catch {
        // Best effort only.
      }
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      // Write-then-rename so a crash mid-write cannot truncate the real file.
      // rename() is atomic on NTFS and POSIX filesystems.
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error(`[Store] Failed to persist ${this.filePath}:`, err);
    }
  }

  get<Key extends keyof T & string, U = any>(key: Key | string, defaultValue?: U): U | T[Key] {
    const value = (this.data as any)[key];
    return (value === undefined ? defaultValue : value) as any;
  }

  set<Key extends keyof T & string>(key: Key | string, value: any): void {
    (this.data as any)[key] = value;
    this.save();
  }

  /**
   * Apply several keys in one write.
   *
   * `set` serializes and rewrites the whole file every call, so N consecutive sets rewrite the
   * file N times. Callers updating related keys together (preferences + schema version, a
   * reset that clears several keys) should use this instead.
   */
  setMany(entries: Record<string, any>): void {
    for (const [key, value] of Object.entries(entries)) {
      (this.data as any)[key] = value;
    }
    this.save();
  }

  delete(key: string): void {
    if (key in this.data) {
      delete this.data[key];
      this.save();
    }
  }

  clear(): void {
    this.data = {};
    this.save();
  }
}

