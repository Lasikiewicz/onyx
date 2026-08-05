import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Store from './electronStoreShim.js';

// Outside Electron the shim resolves userData to os.tmpdir(), so each test uses a unique
// store name and cleans up the files it creates.
const created: string[] = [];

function storeName(): string {
  const name = `onyx-shim-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  created.push(path.join(os.tmpdir(), `${name}.json`));
  return name;
}

function cleanup(): void {
  for (const file of created.splice(0)) {
    for (const candidate of [file, `${file}.bak`, `${file}.tmp`]) {
      try {
        fs.rmSync(candidate, { force: true });
      } catch {
        // ignore
      }
    }
    // Remove any .corrupt-* siblings.
    try {
      const dir = path.dirname(file);
      const base = path.basename(file);
      for (const entry of fs.readdirSync(dir)) {
        if (entry.startsWith(`${base}.corrupt-`)) fs.rmSync(path.join(dir, entry), { force: true });
      }
    } catch {
      // ignore
    }
  }
}

beforeEach(cleanup);
afterEach(cleanup);

describe('electronStoreShim', () => {
  it('round-trips values through disk', () => {
    const name = storeName();
    const a = new Store<{ games: unknown[] }>({ name, defaults: { games: [] } });
    a.set('games', [{ id: 'steam-1' }]);

    const b = new Store<{ games: unknown[] }>({ name, defaults: { games: [] } });
    expect(b.get('games')).toEqual([{ id: 'steam-1' }]);
  });

  it('does not leave a partial file behind when writing (atomic rename)', () => {
    const name = storeName();
    const filePath = path.join(os.tmpdir(), `${name}.json`);
    const store = new Store<{ games: unknown[] }>({ name, defaults: { games: [] } });

    store.set('games', Array.from({ length: 500 }, (_, i) => ({ id: `game-${i}` })));

    // The temp file must not survive a completed write.
    expect(fs.existsSync(`${filePath}.tmp`)).toBe(false);
    // And whatever is on disk must always be parseable.
    expect(() => JSON.parse(fs.readFileSync(filePath, 'utf8'))).not.toThrow();
  });

  it('recovers from a truncated file instead of silently starting empty', () => {
    const name = storeName();
    const filePath = path.join(os.tmpdir(), `${name}.json`);

    // Seed real data, which also writes the .bak snapshot on next load.
    const first = new Store<{ games: unknown[] }>({ name, defaults: { games: [] } });
    first.set('games', [{ id: 'steam-42' }]);
    // Load once so the backup exists.
    new Store<{ games: unknown[] }>({ name, defaults: { games: [] } });

    // Simulate a crash mid-write under the old non-atomic scheme.
    fs.writeFileSync(filePath, '{"games": [{"id": "steam-4', 'utf8');

    const recovered = new Store<{ games: unknown[] }>({ name, defaults: { games: [] } });
    expect(recovered.get('games')).toEqual([{ id: 'steam-42' }]);
  });

  it('preserves the corrupt file rather than overwriting it', () => {
    const name = storeName();
    const filePath = path.join(os.tmpdir(), `${name}.json`);

    const first = new Store<{ games: unknown[] }>({ name, defaults: { games: [] } });
    first.set('games', [{ id: 'gog-7' }]);

    fs.writeFileSync(filePath, 'not json at all', 'utf8');
    new Store<{ games: unknown[] }>({ name, defaults: { games: [] } });

    const siblings = fs
      .readdirSync(os.tmpdir())
      .filter((entry) => entry.startsWith(`${path.basename(filePath)}.corrupt-`));
    expect(siblings.length).toBeGreaterThan(0);
  });
});
