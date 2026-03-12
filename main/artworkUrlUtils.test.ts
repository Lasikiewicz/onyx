import { describe, expect, it } from 'vitest';
import {
  normalizeOnyxLocalUrl,
  parseOnyxLocalAssetUrl,
  stripTransientUrlSuffix,
} from './artworkUrlUtils.js';

describe('artworkUrlUtils', () => {
  it('strips transient query and hash suffixes from artwork URLs', () => {
    expect(stripTransientUrlSuffix('onyx-local://steam-123-boxart?t=123')).toBe('onyx-local://steam-123-boxart');
    expect(stripTransientUrlSuffix('https://example/image.webp?t=123#x')).toBe('https://example/image.webp');
  });

  it('preserves empty artwork fields', () => {
    expect(stripTransientUrlSuffix(undefined)).toBeUndefined();
    expect(stripTransientUrlSuffix('')).toBe('');
    expect(stripTransientUrlSuffix('   ')).toBe('');
  });

  it('normalizes and parses onyx-local asset URLs with cache-busters', () => {
    expect(normalizeOnyxLocalUrl('onyx-local://steam-123-boxart/?t=123#hash')).toBe('onyx-local://steam-123-boxart');
    expect(parseOnyxLocalAssetUrl('onyx-local://steam-123-logo?t=123')).toEqual({
      gameId: 'steam-123',
      imageType: 'logo',
    });
  });
});