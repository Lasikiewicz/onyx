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
  private data: Record<string, any>;

  constructor(options: StoreOptions<T> = {}) {
    const name = options.name || 'config';
    const userDataDir = appModule ? appModule.getPath('userData') : os.tmpdir();
    this.filePath = path.join(userDataDir, `${name}.json`);
    this.data = options.defaults && typeof options.defaults === 'object'
      ? { ...(options.defaults as any) }
      : {};
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        if (raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            this.data = { ...this.data, ...parsed };
          }
        }
      }
    } catch {
      // Ignore corrupt files; keep in-memory defaults
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch {
      // Ignore persistence errors (e.g. read-only filesystem)
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

