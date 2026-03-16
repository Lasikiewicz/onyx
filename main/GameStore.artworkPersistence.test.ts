import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

const baseGame: Game = {
  id: 'steam-123',
  title: 'Test Game',
  platform: 'steam',
  exePath: '',
  boxArtUrl: 'onyx-local://steam-123-boxart',
  bannerUrl: 'onyx-local://steam-123-banner',
  logoUrl: 'onyx-local://steam-123-logo',
  alternativeBannerUrl: 'onyx-local://steam-123-alternativeBanner',
  iconUrl: 'onyx-local://steam-123-icon',
  screenshots: ['onyx-local://steam-123-screenshot-0'],
  categories: ['Original'],
};

describe('GameStore artwork persistence', () => {
  beforeEach(() => {
    MockStore.persisted.clear();
    vi.clearAllMocks();
  });

  it('persists normalized artwork URLs when saving category edits', async () => {
    const store = new GameStore();
    await store.saveGame(baseGame);
    await store.flushPending();

    await store.saveGame({
      ...baseGame,
      categories: ['Updated'],
      boxArtUrl: 'onyx-local://steam-123-boxart?t=111',
      bannerUrl: 'onyx-local://steam-123-banner?t=222#hash',
      logoUrl: 'onyx-local://steam-123-logo?t=333',
      alternativeBannerUrl: 'onyx-local://steam-123-alternativeBanner?t=444',
      iconUrl: 'onyx-local://steam-123-icon?t=555',
    });
    await store.flushPending();

    const reloadedStore = new GameStore();
    const [reloadedGame] = await reloadedStore.getLibrary();

    expect(reloadedGame.categories).toEqual(['Updated']);
    expect(reloadedGame.boxArtUrl).toBe('onyx-local://steam-123-boxart');
    expect(reloadedGame.bannerUrl).toBe('onyx-local://steam-123-banner');
    expect(reloadedGame.logoUrl).toBe('onyx-local://steam-123-logo');
    expect(reloadedGame.alternativeBannerUrl).toBe('onyx-local://steam-123-alternativeBanner');
    expect(reloadedGame.iconUrl).toBe('onyx-local://steam-123-icon');
  });

  it('keeps valid cached artwork during startup cleanup even if URLs include query params', async () => {
    const store = new GameStore();
    const persisted = MockStore.persisted.get('game-library') || { games: [] };
    persisted.games = [{
      ...baseGame,
      boxArtUrl: 'onyx-local://steam-123-boxart?t=111',
      bannerUrl: 'onyx-local://steam-123-banner?t=222',
      logoUrl: 'onyx-local://steam-123-logo?t=333',
      heroUrl: 'onyx-local://steam-123-hero?t=444',
      alternativeBannerUrl: 'onyx-local://steam-123-alternativeBanner?t=555',
      iconUrl: 'onyx-local://steam-123-icon?t=666',
      screenshots: ['onyx-local://steam-123-screenshot-0?t=777'],
    }];
    MockStore.persisted.set('game-library', persisted);

    const cacheDir = mkdtempSync(path.join(tmpdir(), 'onyx-artwork-'));
    try {
      writeFileSync(path.join(cacheDir, 'steam-123-boxart.jpg'), 'boxart');
      writeFileSync(path.join(cacheDir, 'steam-123-banner.png'), 'banner');
      writeFileSync(path.join(cacheDir, 'steam-123-logo.webp'), 'logo');
      writeFileSync(path.join(cacheDir, 'steam-123-hero.jpg'), 'hero');
      writeFileSync(path.join(cacheDir, 'steam-123-alternativeBanner.png'), 'alt');
      writeFileSync(path.join(cacheDir, 'steam-123-icon.ico'), 'icon');
      writeFileSync(path.join(cacheDir, 'steam-123-screenshot-0.webp'), 'screenshot');

      const clearedCount = await store.clearBrokenOnyxLocalUrls(cacheDir);
      expect(clearedCount).toBe(0);

      const [game] = await store.getLibrary();
      expect(game.boxArtUrl).toBe('onyx-local://steam-123-boxart?t=111');
      expect(game.bannerUrl).toBe('onyx-local://steam-123-banner?t=222');
      expect(game.logoUrl).toBe('onyx-local://steam-123-logo?t=333');
      expect(game.heroUrl).toBe('onyx-local://steam-123-hero?t=444');
      expect(game.alternativeBannerUrl).toBe('onyx-local://steam-123-alternativeBanner?t=555');
      expect(game.iconUrl).toBe('onyx-local://steam-123-icon?t=666');
      expect(game.screenshots).toEqual(['onyx-local://steam-123-screenshot-0?t=777']);
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it('still clears genuinely missing cached artwork during startup cleanup', async () => {
    const store = new GameStore();
    const persisted = MockStore.persisted.get('game-library') || { games: [] };
    persisted.games = [{
      ...baseGame,
      boxArtUrl: 'onyx-local://steam-123-boxart?t=111',
      bannerUrl: 'onyx-local://steam-123-banner?t=222',
      logoUrl: 'onyx-local://steam-123-logo?t=333',
      heroUrl: 'onyx-local://steam-123-hero?t=444',
      alternativeBannerUrl: 'onyx-local://steam-123-alternativeBanner?t=555',
      iconUrl: 'onyx-local://steam-123-icon?t=666',
      screenshots: [
        'onyx-local://steam-123-screenshot-0?t=777',
        'https://example.com/keep-me.jpg',
      ],
    }];
    MockStore.persisted.set('game-library', persisted);

    const cacheDir = mkdtempSync(path.join(tmpdir(), 'onyx-artwork-'));
    try {
      mkdirSync(cacheDir, { recursive: true });

      const clearedCount = await store.clearBrokenOnyxLocalUrls(cacheDir);
      expect(clearedCount).toBe(7);

      const [game] = await store.getLibrary();
      expect(game.boxArtUrl).toBe('');
      expect(game.bannerUrl).toBe('');
      expect(game.logoUrl).toBe('');
      expect(game.heroUrl).toBe('');
      expect(game.alternativeBannerUrl).toBe('');
      expect(game.iconUrl).toBe('');
      expect(game.screenshots).toEqual(['https://example.com/keep-me.jpg']);
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });
});
