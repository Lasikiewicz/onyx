import { describe, it, expect } from 'vitest';
import { getGameMatcher } from './GameMatcher';
import { ScannedGameResult } from './ImportService';
import { GameSearchResult } from './MetadataProvider';

describe('GameMatcher', () => {
  const matcher = getGameMatcher();

  describe('normalizeTitle', () => {
    it('normalizes basic titles', () => {
      expect(matcher.normalizeTitle('  My Game  ')).toBe('my game');
      expect(matcher.normalizeTitle('My-Game!')).toBe('mygame');
    });

    it('handles special cases', () => {
      expect(matcher.normalizeTitle("Tony Hawk's Pro Skater 3+4")).toBe('tony hawks pro skater 3 4');
      expect(matcher.normalizeTitle('AFOP')).toBe('avatar frontiers of pandora');
      expect(matcher.normalizeTitle('Cyberpunk 2077')).toBe('cyberpunk 2077');
    });
  });

  describe('stripDemoIndicator', () => {
    it('strips demo indicators', () => {
      expect(matcher.stripDemoIndicator('My Game Demo').stripped).toBe('My Game');
      expect(matcher.stripDemoIndicator('My Game Prologue').stripped).toBe('My Game');
      expect(matcher.stripDemoIndicator('My Game Trial').stripped).toBe('My Game');
    });

    it('detects isDemo flag', () => {
      expect(matcher.stripDemoIndicator('My Game Demo').isDemo).toBe(true);
      expect(matcher.stripDemoIndicator('My Game').isDemo).toBe(false);
    });
  });

  describe('calculateMatchScore', () => {
    const baseScanned: ScannedGameResult = {
      title: 'Test Game',
      source: 'manual',
      uuid: '1',
      installPath: '/games/test',
      originalName: 'Test Game',
      status: 'scanning'
    };

    const baseCandidate: GameSearchResult = {
      id: '100',
      title: 'Test Game',
      source: 'igdb',
      matchScore: 0,
      imageUrl: '',
      provider: 'igdb'
    };

    it('gives high score for exact title match', () => {
      const result = matcher.calculateMatchScore(baseScanned, baseCandidate);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.reasons).toContain('exact title match');
    });

    it('gives bonus for Steam App ID match', () => {
      const scanned = { ...baseScanned, appId: '12345', source: 'steam' };
      const candidate = { ...baseCandidate, steamAppId: 12345, source: 'steam' };

      const result = matcher.calculateMatchScore(scanned, candidate);
      expect(result.confidence).toBeGreaterThan(0.8); // 0.5 (title) + 0.4 (appId) + 0.1 (source) + 0.1 (provider) -> capped at 1.0
      expect(result.reasons).toContain('steam app id match');
    });

    it('penalizes Steam App ID mismatch', () => {
      const scanned = { ...baseScanned, appId: '12345', source: 'steam' };
      const candidate = { ...baseCandidate, steamAppId: 67890, source: 'steam' };

      const result = matcher.calculateMatchScore(scanned, candidate);
      // 0.5 (title) - 0.2 (appId mismatch) + 0.1 (source) + 0.1 (provider) = 0.5
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.reasons).toContain('steam app id mismatch');
    });

    it('gives bonus for source match', () => {
      const scanned = { ...baseScanned, source: 'igdb' };
      const candidate = { ...baseCandidate, source: 'igdb' };

      const result = matcher.calculateMatchScore(scanned, candidate);
      // 0.5 (title) + 0.1 (source) = 0.6
      expect(result.confidence).toBeGreaterThan(0.55);
      expect(result.reasons).toContain('source match');
    });

    it('handles fuzzy matching', () => {
      const scanned = { ...baseScanned, title: 'The Test Game' };
      const candidate = { ...baseCandidate, title: 'Test Game' };

      const result = matcher.calculateMatchScore(scanned, candidate);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('similar title'))).toBe(true);
    });

    it('penalizes low word overlap', () => {
      const scanned = { ...baseScanned, title: 'Super Mario Bros' };
      const candidate = { ...baseCandidate, title: 'Zelda Breath Wild' };

      const result = matcher.calculateMatchScore(scanned, candidate);
      expect(result.confidence).toBeLessThan(0.3);
      expect(result.reasons).toContain('low word overlap');
    });

    it('penalizes significant title length difference', () => {
      const scanned = { ...baseScanned, title: 'The Elder Scrolls V: Skyrim Special Edition' };
      const candidate = { ...baseCandidate, title: 'Skyrim' };

      const result = matcher.calculateMatchScore(scanned, candidate);
      expect(result.reasons).toContain('significant title length difference');
    });

    it('penalizes suffix mismatch', () => {
       // "Grand Theft Auto V" vs "Grand Theft Auto San Andreas"
       const scanned = { ...baseScanned, title: 'Grand Theft Auto V' };
       const candidate = { ...baseCandidate, title: 'Grand Theft Auto San Andreas' };

       const result = matcher.calculateMatchScore(scanned, candidate);
       expect(result.reasons.some(r => r.includes('title suffix mismatch'))).toBe(true);
    });

    it('handles empty titles gracefully', () => {
        const scanned = { ...baseScanned, title: '' };
        const candidate = { ...baseCandidate, title: '' };
        const result = matcher.calculateMatchScore(scanned, candidate);
        // Should rely on other factors or return low confidence if titles are empty (normalized empty)
        expect(result).toBeDefined();
    });
  });
});
