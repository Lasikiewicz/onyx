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

  it('keeps the other query parameters of a remote URL, and drops only the app cache-buster', () => {
    expect(stripTransientUrlSuffix('https://cdn.example/a.jpg?Expires=1&Signature=abc&t=9'))
      .toBe('https://cdn.example/a.jpg?Expires=1&Signature=abc');
    expect(stripTransientUrlSuffix('https://cdn.steamstatic.com/steam/apps/1/header.jpg?t=42'))
      .toBe('https://cdn.steamstatic.com/steam/apps/1/header.jpg');
    expect(stripTransientUrlSuffix('https://example.com/x.png?size=2&t=1&fmt=webp'))
      .toBe('https://example.com/x.png?size=2&fmt=webp');
  });

  it('still removes the whole query from local URLs', () => {
    expect(stripTransientUrlSuffix('file:///C:/cache/a.png?v=1&x=2')).toBe('file:///C:/cache/a.png');
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