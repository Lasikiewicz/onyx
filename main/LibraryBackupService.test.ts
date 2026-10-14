import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Game } from './GameStore.js';
import { LibraryBackupService, MAX_LIBRARY_BACKUPS } from './LibraryBackupService.js';

const game = (id: string): Game => ({ id, title: id, platform: 'other', exePath: '', boxArtUrl: '', bannerUrl: '' });

describe('LibraryBackupService (E3)', () => {
  let dir: string;
  let service: LibraryBackupService;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'onyx-backups-'));
    service = new LibraryBackupService(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes a snapshot and lists it with its game count and reason', async () => {
    await service.snapshot([game('a'), game('b')], 'clear library');

    const [info] = await service.list();
    expect(info.reason).toBe('clear library');
    expect(info.gameCount).toBe(2);
  });

  it('keeps only the newest snapshots', async () => {
    for (let i = 0; i < MAX_LIBRARY_BACKUPS + 3; i++) {
      await service.snapshot([game(`g${i}`)], 'bulk');
      // Names are timestamped to the millisecond, so separate the writes slightly.
      await new Promise((r) => setTimeout(r, 5));
    }

    const list = await service.list();
    expect(list).toHaveLength(MAX_LIBRARY_BACKUPS);
  });

  it('reads back the games from a snapshot it wrote', async () => {
    const file = await service.snapshot([game('a'), game('b')], 'remove missing');

    expect((await service.read(file))?.map((g) => g.id)).toEqual(['a', 'b']);
  });

  it('refuses to read a file it did not write, even inside the backup folder', async () => {
    writeFileSync(path.join(dir, 'secret.json'), JSON.stringify({ games: [game('x')] }));

    expect(await service.read('secret.json')).toBeUndefined();
    expect(await service.read('../secret.json')).toBeUndefined();
  });

  it('returns nothing for a snapshot whose games are malformed', async () => {
    writeFileSync(path.join(dir, 'library-2026-broken.json'), JSON.stringify({ games: [{ title: 'no id' }] }));

    expect(await service.read('library-2026-broken.json')).toBeUndefined();
  });
});
