import { promises as fsp } from 'node:fs';
import path from 'node:path';
import type { Game } from './GameStore.js';

/** Keep this many snapshots. Older ones are deleted when a new one is written. */
export const MAX_LIBRARY_BACKUPS = 5;

export interface LibraryBackupInfo {
  file: string;
  savedAt: string;
  reason: string;
  gameCount: number;
}

/**
 * Snapshots of the library, written before destructive actions (E3). Each snapshot is one JSON
 * file in `dir`. The newest MAX_LIBRARY_BACKUPS are kept.
 */
export class LibraryBackupService {
  constructor(private readonly dir: string) {}

  /** Write a snapshot of `games`, labelled with `reason`, and rotate the old ones out. */
  async snapshot(games: Game[], reason: string): Promise<string> {
    await fsp.mkdir(this.dir, { recursive: true });
    const savedAt = new Date().toISOString();
    const safeReason = reason.replace(/[^a-z0-9-]+/gi, '-').toLowerCase().slice(0, 40) || 'backup';
    // The ISO time sorts lexically, so the file name order is the time order.
    const file = `library-${savedAt.replace(/[:.]/g, '-')}-${safeReason}.json`;
    await fsp.writeFile(
      path.join(this.dir, file),
      JSON.stringify({ savedAt, reason, games }, null, 2),
      'utf-8',
    );
    await this.rotate();
    return file;
  }

  /** Snapshots, newest first. */
  async list(): Promise<LibraryBackupInfo[]> {
    const files = await this.backupFiles();
    const infos: LibraryBackupInfo[] = [];
    for (const file of files) {
      try {
        const parsed = JSON.parse(await fsp.readFile(path.join(this.dir, file), 'utf-8'));
        infos.push({
          file,
          savedAt: String(parsed.savedAt ?? ''),
          reason: String(parsed.reason ?? ''),
          gameCount: Array.isArray(parsed.games) ? parsed.games.length : 0,
        });
      } catch {
        // A damaged snapshot is left out of the list, not deleted.
      }
    }
    return infos;
  }

  /**
   * The games in one snapshot. `file` must be a name this service wrote: it is matched against the
   * snapshot list, so a crafted path can't read anything else. Returns undefined if it isn't valid.
   */
  async read(file: string): Promise<Game[] | undefined> {
    if (!(await this.backupFiles()).includes(file)) return undefined;
    try {
      const parsed = JSON.parse(await fsp.readFile(path.join(this.dir, file), 'utf-8'));
      if (!Array.isArray(parsed.games)) return undefined;
      const games = parsed.games as Game[];
      return games.every((g) => g && typeof g.id === 'string') ? games : undefined;
    } catch {
      return undefined;
    }
  }

  private async backupFiles(): Promise<string[]> {
    let names: string[];
    try {
      names = await fsp.readdir(this.dir);
    } catch {
      return [];
    }
    return names
      .filter((name) => /^library-.*\.json$/.test(name))
      .sort()
      .reverse();
  }

  private async rotate(): Promise<void> {
    const files = await this.backupFiles();
    for (const stale of files.slice(MAX_LIBRARY_BACKUPS)) {
      await fsp.unlink(path.join(this.dir, stale)).catch(() => undefined);
    }
  }
}
