import { describe, it, expect } from 'vitest';
import {
  imageTypesFromUrls,
  sourceExtFromUrl,
  isKnownStaticExt,
  countUrlEntries,
} from './ImageOptimizationQueue.js';

/**
 * These helpers decide what the optimizer downloads, how it classifies each asset, and
 * therefore whether an item lands in the static or the animated queue. Their inputs are
 * provider-supplied URLs, so the failure cases matter as much as the happy path.
 */

describe('imageTypesFromUrls', () => {
  it('returns only the artwork slots that are populated', () => {
    expect(imageTypesFromUrls({ boxArtUrl: 'a.png', logoUrl: 'b.png' })).toEqual([
      { type: 'boxart', url: 'a.png' },
      { type: 'logo', url: 'b.png' },
    ]);
  });

  it('emits every slot in a stable order', () => {
    const all = imageTypesFromUrls({
      boxArtUrl: 'box', bannerUrl: 'ban', alternativeBannerUrl: 'alt',
      logoUrl: 'logo', heroUrl: 'hero', iconUrl: 'icon',
    });
    expect(all.map((entry) => entry.type)).toEqual([
      'boxart', 'banner', 'alternativeBanner', 'logo', 'hero', 'icon',
    ]);
  });

  it('returns nothing for an empty bag', () => {
    expect(imageTypesFromUrls({})).toEqual([]);
  });

  it('treats an empty-string URL as absent', () => {
    expect(imageTypesFromUrls({ boxArtUrl: '', logoUrl: 'logo' })).toEqual([
      { type: 'logo', url: 'logo' },
    ]);
  });
});

describe('sourceExtFromUrl', () => {
  it('reads the extension from a remote URL', () => {
    expect(sourceExtFromUrl('https://cdn.example.com/art/cover.png')).toBe('PNG');
  });

  it('ignores a query string', () => {
    expect(sourceExtFromUrl('https://cdn.example.com/art/cover.jpg?t=12345')).toBe('JPG');
  });

  it('uppercases the extension', () => {
    expect(sourceExtFromUrl('https://cdn.example.com/a.WeBp')).toBe('WEBP');
  });

  it('reads the extension from a file:// URL', () => {
    expect(sourceExtFromUrl('file:///C:/games/art/cover.gif')).toBe('GIF');
  });

  it('percent-decodes a file:// URL before reading the extension', () => {
    expect(sourceExtFromUrl('file:///C:/my%20games/cover%20art.webm')).toBe('WEBM');
  });

  it('returns undefined for an empty URL', () => {
    expect(sourceExtFromUrl('')).toBeUndefined();
  });

  it('returns undefined when there is no extension', () => {
    expect(sourceExtFromUrl('https://cdn.example.com/art/cover')).toBeUndefined();
  });

  it('returns undefined rather than throwing on an unparseable URL', () => {
    expect(sourceExtFromUrl('not a url at all')).toBeUndefined();
  });
});

describe('isKnownStaticExt', () => {
  it.each(['JPG', 'JPEG', 'PNG', 'ICO', 'AVIF'])('treats %s as static', (ext) => {
    expect(isKnownStaticExt(ext)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isKnownStaticExt('png')).toBe(true);
  });

  it.each(['GIF', 'WEBM', 'WEBP'])('does not treat %s as static', (ext) => {
    // WEBP is deliberately excluded: many are static, but some animate, so it cannot be
    // assumed static without inspecting the file.
    expect(isKnownStaticExt(ext)).toBe(false);
  });

  it('returns false for an unknown extension', () => {
    expect(isKnownStaticExt('exe')).toBe(false);
  });

  it('returns false when the extension is unknown/undefined', () => {
    expect(isKnownStaticExt(undefined)).toBe(false);
  });
});

describe('countUrlEntries', () => {
  it('counts only populated slots', () => {
    expect(countUrlEntries({ boxArtUrl: 'a', bannerUrl: 'b' })).toBe(2);
  });

  it('counts every slot when all are populated', () => {
    expect(countUrlEntries({
      boxArtUrl: 'a', bannerUrl: 'b', alternativeBannerUrl: 'c',
      logoUrl: 'd', heroUrl: 'e', iconUrl: 'f',
    })).toBe(6);
  });

  it('returns zero for an empty bag', () => {
    expect(countUrlEntries({})).toBe(0);
  });

  it('does not count empty-string URLs', () => {
    expect(countUrlEntries({ boxArtUrl: '', bannerUrl: 'b' })).toBe(1);
  });

  it('agrees with imageTypesFromUrls', () => {
    const urls = { boxArtUrl: 'a', logoUrl: '', heroUrl: 'c' };
    expect(countUrlEntries(urls)).toBe(imageTypesFromUrls(urls).length);
  });
});
