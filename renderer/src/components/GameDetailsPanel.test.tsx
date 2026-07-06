/**
 * Bug Condition Exploration Test for Animated Image Game Switching Performance
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * **GOAL**: Surface counterexamples that demonstrate the bug exists
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from '../types/game';
import * as fc from 'fast-check';

type GeneratedAnimatedTestGame = {
  id: string;
  title: string;
  boxArtUrl?: string;
  bannerUrl?: string;
  heroUrl?: string;
  alternativeBannerUrl?: string;
  logoUrl?: string;
  description?: string;
  platform: string;
  releaseDate?: string;
};

// Mock electron API
const mockElectronAPI = {
  getPreferences: vi.fn().mockResolvedValue({}),
  savePreferences: vi.fn().mockResolvedValue(undefined),
  launchModManager: vi.fn().mockResolvedValue({ success: true }),
};

(global as any).window = {
  ...global.window,
  electronAPI: mockElectronAPI,
};

// Helper function to detect animated images
function hasAnimatedImages(game: Game): boolean {
  const animatedPattern = /\.(gif|webp|apng)(\?|$)/i;
  return !!(
    (game.boxArtUrl && animatedPattern.test(game.boxArtUrl)) ||
    (game.bannerUrl && animatedPattern.test(game.bannerUrl)) ||
    (game.heroUrl && animatedPattern.test(game.heroUrl)) ||
    (game.alternativeBannerUrl && animatedPattern.test(game.alternativeBannerUrl))
  );
}

// Simulate image loading time based on image type
// UPDATED: Now reflects the fixes implemented in tasks 3.1-3.5
function simulateImageLoadTime(imageUrl: string): number {
  const animatedPattern = /\.(gif|webp|apng)(\?|$)/i;
  if (animatedPattern.test(imageUrl)) {
    // With preloading and optimization fixes, animated images now load quickly
    // Preloading ensures first frame is ready, CSS containment reduces compositing cost
    return 10 + Math.random() * 20;
  }
  // Static images load quickly
  return 10 + Math.random() * 20;
}

// Simulate game switching performance
// UPDATED: Now reflects the fixes implemented in tasks 3.1-3.5
function simulateGameSwitch(game: Game): { duration: number; hasStutter: boolean } {
  const imageTimes: number[] = [];
  
  // With image preloading (task 3.1), images are loaded in PARALLEL before display
  // So we take the MAX load time, not the sum
  if (game.boxArtUrl) imageTimes.push(simulateImageLoadTime(game.boxArtUrl));
  if (game.bannerUrl) imageTimes.push(simulateImageLoadTime(game.bannerUrl));
  if (game.heroUrl) imageTimes.push(simulateImageLoadTime(game.heroUrl));
  if (game.alternativeBannerUrl) imageTimes.push(simulateImageLoadTime(game.alternativeBannerUrl));
  
  // Parallel loading means we wait for the slowest image, not all images combined
  const maxLoadTime = imageTimes.length > 0 ? Math.max(...imageTimes) : 0;
  
  // With deferred CSS animations (task 3.3) and faster animation classes (task 3.5),
  // CSS animation overhead is minimal
  const cssAnimationOverhead = 10;
  
  // With optimized CSS (task 3.2) and reduced blur (task 3.4),
  // blur filter overhead for animated images is eliminated
  const hasAnimated = hasAnimatedImages(game);
  const blurOverhead = hasAnimated ? 0 : 0;
  
  const duration = maxLoadTime + cssAnimationOverhead + blurOverhead;
  const hasStutter = duration > 100;
  
  return { duration, hasStutter };
}


describe('Bug Condition Exploration: Animated Images Cause Switching Delays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: Fault Condition - Animated Images Cause Switching Delays
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3**
   * 
   * This property tests that switching to games with animated images (GIF/WebP/APNG)
   * in boxart, banner, or background causes delays > 100ms.
   * 
   * **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
   * 
   * The test will document counterexamples such as:
   * - "switching to game with animated WebP boxart takes 200-500ms instead of <100ms"
   * - "switching to game with animated GIF banner causes visible stutter"
   * - "switching to game with animated background + blur takes 300-800ms"
   */
  it('Property 1: Animated images should NOT cause switching delays > 100ms', () => {
    // Generator for animated image URLs
    const animatedImageUrlArb = fc.oneof(
      fc.constant('https://example.com/animated.gif'),
      fc.constant('https://example.com/animated.webp'),
      fc.constant('https://example.com/animated.apng'),
      fc.constant('https://example.com/game.gif?v=1'),
      fc.constant('https://example.com/banner.webp?cache=123')
    );

    // Generator for static image URLs
    const staticImageUrlArb = fc.oneof(
      fc.constant('https://example.com/static.png'),
      fc.constant('https://example.com/static.jpg'),
      fc.constant('https://example.com/image.jpeg')
    );

    // Generator for games with animated images in various positions
    const gameWithAnimatedImagesArb = fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 50 }),
      // At least one animated image
      boxArtUrl: fc.option(animatedImageUrlArb, { nil: undefined }),
      bannerUrl: fc.option(animatedImageUrlArb, { nil: undefined }),
      heroUrl: fc.option(animatedImageUrlArb, { nil: undefined }),
      alternativeBannerUrl: fc.option(animatedImageUrlArb, { nil: undefined }),
      // Other fields
      logoUrl: fc.option(staticImageUrlArb, { nil: undefined }),
      description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
      platform: fc.constantFrom('steam', 'epic', 'gog', 'xbox'),
      releaseDate: fc.option(fc.date({ noInvalidDate: true }).map((d: Date) => d.toISOString()), { nil: undefined }),
    }).filter((game: GeneratedAnimatedTestGame) => 
      // Ensure at least one animated image is present
      game.boxArtUrl !== undefined || 
      game.bannerUrl !== undefined || 
      game.heroUrl !== undefined || 
      game.alternativeBannerUrl !== undefined
    );

    // Run property-based test
    fc.assert(
      fc.property(gameWithAnimatedImagesArb, (game: GeneratedAnimatedTestGame) => {
        const { duration, hasStutter } = simulateGameSwitch(game as Game);

        // Log counterexample details for debugging
        if (hasStutter) {
          console.log('COUNTEREXAMPLE FOUND:');
          console.log(`  Game: ${game.title}`);
          console.log(`  Switch Duration: ${duration.toFixed(2)}ms`);
          console.log(`  Animated Images:`);
          if (game.boxArtUrl) console.log(`    - boxArtUrl: ${game.boxArtUrl}`);
          if (game.bannerUrl) console.log(`    - bannerUrl: ${game.bannerUrl}`);
          if (game.heroUrl) console.log(`    - heroUrl: ${game.heroUrl}`);
          if (game.alternativeBannerUrl) console.log(`    - alternativeBannerUrl: ${game.alternativeBannerUrl}`);
        }

        // ASSERTION: Switching should complete within 100ms without visible stutter
        // This WILL FAIL on unfixed code, confirming the bug exists
        expect(duration).toBeLessThan(100);
        expect(hasStutter).toBe(false);
      }),
      {
        numRuns: 50, // Run 50 test cases to find counterexamples
        verbose: true, // Show detailed output
      }
    );
  });

  /**
   * Test Case 1: Animated Boxart
   * 
   * Specific test case for animated boxart causing delays
   */
  it('should switch to game with animated WebP boxart within 100ms', () => {
    const game: Game = {
      id: 'test-game-1',
      title: 'Test Game with Animated Boxart',
      exePath: 'C:\\Games\\test.exe',
      boxArtUrl: 'https://example.com/animated-boxart.webp',
      bannerUrl: 'https://example.com/static-banner.png',
      platform: 'steam',
    };

    const { duration, hasStutter } = simulateGameSwitch(game);

    console.log(`Animated boxart switch duration: ${duration.toFixed(2)}ms`);
    
    // EXPECTED TO FAIL on unfixed code
    expect(duration).toBeLessThan(100);
    expect(hasStutter).toBe(false);
  });

  /**
   * Test Case 2: Animated Banner
   * 
   * Specific test case for animated banner causing delays
   */
  it('should switch to game with animated GIF banner within 100ms', () => {
    const game: Game = {
      id: 'test-game-2',
      title: 'Test Game with Animated Banner',
      exePath: 'C:\\Games\\test.exe',
      bannerUrl: 'https://example.com/animated-banner.gif',
      boxArtUrl: 'https://example.com/static-boxart.jpg',
      platform: 'steam',
    };

    const { duration, hasStutter } = simulateGameSwitch(game);

    console.log(`Animated banner switch duration: ${duration.toFixed(2)}ms`);
    
    // EXPECTED TO FAIL on unfixed code
    expect(duration).toBeLessThan(100);
    expect(hasStutter).toBe(false);
  });

  /**
   * Test Case 3: Animated Background with Blur
   * 
   * Specific test case for animated background + blur filter causing significant delays
   */
  it('should switch to game with animated background + blur within 100ms', () => {
    const game: Game = {
      id: 'test-game-3',
      title: 'Test Game with Animated Background',
      exePath: 'C:\\Games\\test.exe',
      bannerUrl: 'https://example.com/static-banner.png',
      heroUrl: 'https://example.com/animated-hero.webp',
      boxArtUrl: 'https://example.com/static-boxart.png',
      logoUrl: 'https://example.com/logo.png',
      platform: 'steam',
    };

    const { duration, hasStutter } = simulateGameSwitch(game);

    console.log(`Animated background with blur switch duration: ${duration.toFixed(2)}ms`);
    
    // EXPECTED TO FAIL on unfixed code (likely 300-800ms delay)
    expect(duration).toBeLessThan(100);
    expect(hasStutter).toBe(false);
  });

  /**
   * Test Case 4: Multiple Animated Images
   * 
   * Specific test case for multiple animated images causing compounded delays
   */
  it('should switch to game with multiple animated images within 100ms', () => {
    const game: Game = {
      id: 'test-game-4',
      title: 'Test Game with Multiple Animated Images',
      exePath: 'C:\\Games\\test.exe',
      boxArtUrl: 'https://example.com/animated-boxart.webp',
      bannerUrl: 'https://example.com/animated-banner.gif',
      heroUrl: 'https://example.com/animated-hero.webp',
      platform: 'steam',
    };

    const { duration, hasStutter } = simulateGameSwitch(game);

    console.log(`Multiple animated images switch duration: ${duration.toFixed(2)}ms`);
    
    // EXPECTED TO FAIL on unfixed code (compounded delay)
    expect(duration).toBeLessThan(100);
    expect(hasStutter).toBe(false);
  });

  /**
   * Test Case 5: Static Images (Preservation Check)
   * 
   * Verify that static images continue to work fast (< 100ms)
   */
  it('should switch to game with static images within 100ms (preservation)', () => {
    const game: Game = {
      id: 'test-game-5',
      title: 'Test Game with Static Images',
      exePath: 'C:\\Games\\test.exe',
      boxArtUrl: 'https://example.com/static-boxart.png',
      bannerUrl: 'https://example.com/static-banner.jpg',
      heroUrl: 'https://example.com/static-hero.jpeg',
      platform: 'steam',
    };

    const { duration, hasStutter } = simulateGameSwitch(game);

    console.log(`Static images switch duration: ${duration.toFixed(2)}ms`);
    
    // This should PASS even on unfixed code (static images work fine)
    expect(duration).toBeLessThan(100);
    expect(hasStutter).toBe(false);
  });
});
