import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryListView } from './LibraryListView';
import type { Game } from '../types/game';

/**
 * Windowing tests for the list view.
 *
 * The list used to render one DOM subtree per game, so a large library built thousands of
 * nodes and started thousands of image loads at once. These pin the property that matters —
 * the number of rows in the DOM does not scale with the size of the library — without
 * asserting an exact window size, which depends on measured row heights.
 */

function makeGames(count: number): Game[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `game-${i}`,
    title: `Game ${String(i).padStart(4, '0')}`,
    platform: 'steam',
    exePath: `C:\\Games\\Game${i}\\game.exe`,
    boxArtUrl: '',
    bannerUrl: '',
  }));
}

function renderedRowCount(container: HTMLElement): number {
  return container.querySelectorAll('[data-game-card]').length;
}

const VIEWPORT_HEIGHT = 800;
const ROW_HEIGHT = 120;

describe('LibraryListView windowing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: { getPreferences: vi.fn(async () => ({})), savePreferences: vi.fn(async () => undefined) },
    });

    // jsdom reports every element as zero-sized, so the virtualizer computes a viewport of 0
    // and renders nothing. @tanstack/virtual measures through offsetWidth/offsetHeight (not
    // getBoundingClientRect), so those are what have to report realistic values: a viewport
    // for the scroll container, and a row height for everything else.
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList?.contains('overflow-y-auto') ? VIEWPORT_HEIGHT : ROW_HEIGHT;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => 900,
    });

    // The shared ResizeObserver mock in vitest.setup.ts never invokes its callback, so the
    // virtualizer would keep its initial zero-sized rect regardless of the stubs above. This
    // one reports the observed element as soon as it is observed.
    class FiringResizeObserver {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: target.getBoundingClientRect() } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', FiringResizeObserver);
  });

  afterEach(() => {
    // These are prototype-level, so they must be removed or they leak into other suites.
    delete (HTMLElement.prototype as any).offsetHeight;
    delete (HTMLElement.prototype as any).offsetWidth;
    vi.unstubAllGlobals();
  });

  it('renders far fewer rows than the library contains', () => {
    const { container } = render(<LibraryListView games={makeGames(2000)} />);

    const rows = renderedRowCount(container);
    expect(rows).toBeGreaterThan(0);
    // The exact count depends on measured heights in jsdom; the point is that it is bounded
    // and nowhere near the library size.
    expect(rows).toBeLessThan(100);
  });

  it('does not render more rows for a larger library', () => {
    const small = render(<LibraryListView games={makeGames(200)} />);
    const smallRows = renderedRowCount(small.container);
    small.unmount();

    const large = render(<LibraryListView games={makeGames(5000)} />);
    const largeRows = renderedRowCount(large.container);

    expect(largeRows).toBe(smallRows);
  });

  it('sizes the scroll area for the whole library so the scrollbar stays honest', () => {
    const { container } = render(<LibraryListView games={makeGames(500)} />);

    const sizer = container.querySelector('[style*="position: relative"]') as HTMLElement | null;
    expect(sizer).not.toBeNull();
    const height = parseInt(sizer!.style.height, 10);
    // 500 rows at any plausible row height is far taller than a viewport.
    expect(height).toBeGreaterThan(5000);
  });

  it('renders the first game and not one far down the list', () => {
    render(<LibraryListView games={makeGames(1000)} />);

    expect(screen.getByText('Game 0000')).toBeTruthy();
    expect(screen.queryByText('Game 0900')).toBeNull();
  });

  it('renders an empty library without error', () => {
    const { container } = render(<LibraryListView games={[]} />);
    expect(renderedRowCount(container)).toBe(0);
  });
});
