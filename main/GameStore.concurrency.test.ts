import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameStore, type Game } from './GameStore.js';

const { MockStore } = vi.hoisted(() => {
  class HoistedMockStore {
    static persisted = new Map<string, any>();
    name: string;

    constructor(options?: { name?: string; defaults?: Record<string, unknown> }) {
      this.name = options?.name || 'default';
      if (!HoistedMockStore.persisted.has(this.name)) {
        HoistedMockStore.persisted.set(this.name, { ...(options?.defaults || {}) });
      }
    }

    get(key: string, fallback?: unknown) {
      const state = HoistedMockStore.persisted.get(this.name) || {};
      return state[key] ?? fallback;
    }

    set(key: string, value: unknown) {
      const state = HoistedMockStore.persisted.get(this.name) || {};
      state[key] = value;
      HoistedMockStore.persisted.set(this.name, state);
    }
  }

  return { MockStore: HoistedMockStore };
});

vi.mock('./electronStoreShim.js', () => ({
  default: MockStore,
}));

const makeGame = (id: string, overrides: Partial<Game> = {}): Game => ({
  id,
  title: `Title ${id}`,
  platform: 'other',
  exePath: `C:\\Games\\${id}.exe`,
  boxArtUrl: '',
  bannerUrl: '',
  ...overrides,
});

const persistedGames = (): Game[] => MockStore.persisted.get('game-library')?.games ?? [];

describe('GameStore concurrent writes (A2)', () => {
  beforeEach(() => {
    MockStore.persisted.clear();
    vi.clearAllMocks();
  });

  it('keeps both games when two saves overlap', async () => {
    const store = new GameStore();
    await Promise.all([
      store.saveGame(makeGame('custom-1')),
      store.saveGame(makeGame('custom-2')),
    ]);

    const ids = (await store.getLibrary()).map(g => g.id).sort();
    expect(ids).toEqual(['custom-1', 'custom-2']);

    await store.flushPending();
    expect(persistedGames().map(g => g.id).sort()).toEqual(['custom-1', 'custom-2']);
  });

  it('keeps a save that lands while a Steam merge is caching images', async () => {
    const store = new GameStore();
    await store.saveGame(makeGame('custom-existing'));

    const imageCacheService = {
      cacheImages: vi.fn(async (urls: { boxArtUrl?: string; bannerUrl?: string }) => {
        // A save from elsewhere lands while the merge is awaiting image caching.
        await store.saveGame(makeGame('custom-during-merge'));
        return { boxArtUrl: urls.boxArtUrl, bannerUrl: urls.bannerUrl };
      }),
    };

    await store.mergeSteamGames([{ appId: '42', name: 'Steam Game' } as any], imageCacheService, true);

    const ids = (await store.getLibrary()).map(g => g.id).sort();
    expect(ids).toEqual(['custom-during-merge', 'custom-existing', 'steam-42']);
  });

  it('patches only the named fields, so a concurrent edit to another field survives', () => {
    const store = new GameStore();
    void store.saveGame(makeGame('custom-1', { favorite: true }));

    const updated = store.updateGame('custom-1', { lastPlayed: '2026-10-14T00:00:00.000Z' });

    expect(updated).toBe(true);
    return store.getLibrary().then(games => {
      expect(games[0].favorite).toBe(true);
      expect(games[0].lastPlayed).toBe('2026-10-14T00:00:00.000Z');
    });
  });

  it('returns false from updateGame when the game does not exist', () => {
    const store = new GameStore();
    expect(store.updateGame('missing', { title: 'x' })).toBe(false);
  });

  it('returns copies from getLibrary, so callers cannot change the cache', async () => {
    const store = new GameStore();
    await store.saveGame(makeGame('custom-1', { links: [{ name: 'Wiki', url: 'https://example.com' }] }));

    const games = await store.getLibrary();
    games[0].title = 'Mutated';
    games[0].links![0].url = 'https://evil.example';

    const fresh = await store.getLibrary();
    expect(fresh[0].title).toBe('Title custom-1');
    expect(fresh[0].links![0].url).toBe('https://example.com');
  });
});

describe('GameStore.reorderGames (A1)', () => {
  beforeEach(() => {
    MockStore.persisted.clear();
    vi.clearAllMocks();
  });

  it('keeps hidden games in place when only visible games are reordered', async () => {
    const store = new GameStore();
    // Library order: a, hidden, b, c. Only a, b, c are on screen.
    await store.saveGames([
      makeGame('a'),
      makeGame('hidden', { hidden: true }),
      makeGame('b'),
      makeGame('c'),
    ]);

    await store.reorderGames(['c', 'a', 'b']);
    await store.flushPending();

    expect(persistedGames().map(g => g.id)).toEqual(['c', 'hidden', 'a', 'b']);
  });

  it('does not persist renderer-only fields from the ids it is given', async () => {
    const store = new GameStore();
    await store.saveGames([makeGame('a', { boxArtUrl: 'https://cdn.example/a.jpg' }), makeGame('b')]);

    // The renderer sends ids only, so there is no object to smuggle a cache-buster through.
    await store.reorderGames(['b', 'a']);
    await store.flushPending();

    const a = persistedGames().find(g => g.id === 'a');
    expect(a?.boxArtUrl).toBe('https://cdn.example/a.jpg');
  });

  it('ignores unknown and duplicate ids', async () => {
    const store = new GameStore();
    await store.saveGames([makeGame('a'), makeGame('b'), makeGame('c')]);

    await store.reorderGames(['c', 'nope', 'c', 'a']);
    await store.flushPending();

    expect(persistedGames().map(g => g.id)).toEqual(['c', 'b', 'a']);
  });
});
