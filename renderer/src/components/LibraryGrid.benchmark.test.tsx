// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { LibraryGrid } from './LibraryGrid';
import type { Game } from '../types/game';

// Mock ResizeObserver for AutoSizer and Grid
global.ResizeObserver = class ResizeObserver {
  callback: any;
  constructor(callback: any) {
    this.callback = callback;
  }
  observe(target: any) {
    // Trigger callback immediately (but asynchronously in reality, simulated here)
    // We wrap in setTimeout to ensure it runs after render commit if needed,
    // or just call it. But AutoSizer usually works with useLayoutEffect.
    // Calling it synchronously here ensures state update is scheduled.
    this.callback([{
      target,
      contentRect: {
        width: 1000,
        height: 800,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 800,
        x: 0,
        y: 0,
      }
    }], this);
  }
  unobserve() {}
  disconnect() {}
};

// Mock HTMLElement offsetWidth/offsetHeight
Object.defineProperties(HTMLElement.prototype, {
  offsetWidth: {
    get() { return 1000; }
  },
  offsetHeight: {
    get() { return 800; }
  }
});

const generateGames = (count: number): Game[] => {
  const games: Game[] = [];
  for (let i = 0; i < count; i++) {
    games.push({
      id: `game-${i}`,
      title: `Game ${i}`,
      platform: 'PC',
      installationDirectory: `/games/game-${i}`,
      exePath: `/games/game-${i}/game.exe`,
      boxArtUrl: '',
      bannerUrl: '',
      playtime: Math.floor(Math.random() * 1000),
      lastPlayed: new Date().toISOString(),
      dateAdded: new Date().toISOString(),
      hidden: false,
      favorite: false,
      pinned: false,
    });
  }
  return games;
};

describe('LibraryGrid Performance', () => {
  it('renders 5000 items', async () => {
    const games = generateGames(5000);
    const start = performance.now();

    const { container } = render(
      <LibraryGrid
        games={games}
        onReorder={async () => {}}
        onPlay={() => {}}
        onGameClick={() => {}}
        onEdit={() => {}}
      />
    );

    const end = performance.now();
    console.log(`Render time for 5000 items: ${(end - start).toFixed(2)}ms`);

    expect(end - start).toBeLessThan(1000);

    // Wait for virtualization to kick in (AutoSizer needs a cycle)
    await waitFor(() => {
      const renderedItems = container.querySelectorAll('[data-game-card]');
      // console.log(`Rendered items count: ${renderedItems.length}`);
      expect(renderedItems.length).toBeGreaterThan(0);
      expect(renderedItems.length).toBeLessThan(100);
    });
  }, 2000);
});
