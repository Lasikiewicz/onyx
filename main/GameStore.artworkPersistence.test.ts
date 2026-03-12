import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameStore, type Game } from './GameStore.js';
import * as dynamicImportModule from './dynamicImport.js';

vi.mock('./dynamicImport.js', () => ({
  dynamicImport: vi.fn(),
}));

class MockStore {
  static persisted = new Map<string, any>();
  name: string;

  constructor(options?: { name?: string; defaults?: Record<string, unknown> }) {
    this.name = options?.name || 'default';
    if (!MockStore.persisted.has(this.name)) {
      MockStore.persisted.set(this.name, { ...(options?.defaults || {}) });
    }
  }

  get(key: string, fallback?: unknown) {
    const state = MockStore.persisted.get(this.name) || {};
    return state[key] ?? fallback;
  }

  set(key: string, value: unknown) {
    const state = MockStore.persisted.get(this.name) || {};
    state[key] = value;
    MockStore.persisted.set(this.name, state);
  }
}

const baseGame: Game = {
  id: 'steam-123',
  title: 'Test Game',
  platform: 'steam',
  exePath: '',
  boxArtUrl: 'onyx-local://steam-123-boxart',
  bannerUrl: 'onyx-local://steam-123-banner',
  logoUrl: 'onyx-local://steam-123-logo',
  categories: ['Original'],
};

describe('GameStore artwork persistence', () => {
  beforeEach(() => {
    MockStore.persisted.clear();
    vi.clearAllMocks();
    vi.mocked(dynamicImportModule.dynamicImport).mockResolvedValue({ default: MockStore as any });
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
    });
    await store.flushPending();

    const reloadedStore = new GameStore();
    const [reloadedGame] = await reloadedStore.getLibrary();

    expect(reloadedGame.categories).toEqual(['Updated']);
    expect(reloadedGame.boxArtUrl).toBe('onyx-local://steam-123-boxart');
    expect(reloadedGame.bannerUrl).toBe('onyx-local://steam-123-banner');
    expect(reloadedGame.logoUrl).toBe('onyx-local://steam-123-logo');
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
    }];
    MockStore.persisted.set('game-library', persisted);

    const cacheDir = mkdtempSync(path.join(tmpdir(), 'onyx-artwork-'));
    try {
      writeFileSync(path.join(cacheDir, 'steam-123-boxart.jpg'), 'boxart');
      writeFileSync(path.join(cacheDir, 'steam-123-banner.png'), 'banner');
      writeFileSync(path.join(cacheDir, 'steam-123-logo.webp'), 'logo');
      writeFileSync(path.join(cacheDir, 'steam-123-hero.jpg'), 'hero');

      const clearedCount = await store.clearBrokenOnyxLocalUrls(cacheDir);
      expect(clearedCount).toBe(0);

      const [game] = await store.getLibrary();
      expect(game.boxArtUrl).toBe('onyx-local://steam-123-boxart?t=111');
      expect(game.bannerUrl).toBe('onyx-local://steam-123-banner?t=222');
      expect(game.logoUrl).toBe('onyx-local://steam-123-logo?t=333');
      expect(game.heroUrl).toBe('onyx-local://steam-123-hero?t=444');
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
      logoUrl: undefined,
    }];
    MockStore.persisted.set('game-library', persisted);

    const cacheDir = mkdtempSync(path.join(tmpdir(), 'onyx-artwork-'));
    try {
      mkdirSync(cacheDir, { recursive: true });

      const clearedCount = await store.clearBrokenOnyxLocalUrls(cacheDir);
      expect(clearedCount).toBe(2);

      const [game] = await store.getLibrary();
      expect(game.boxArtUrl).toBe('');
      expect(game.bannerUrl).toBe('');
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });
});