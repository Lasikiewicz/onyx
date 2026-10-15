import { describe, expect, it } from 'vitest';
import type { GameMetadata } from './MetadataFetcherService.js';
import { hasCacheableMetadata } from './MetadataCache.js';

describe('hasCacheableMetadata', () => {
  it('rejects an empty lookup, so a failed match is not cached', () => {
    expect(hasCacheableMetadata({} as GameMetadata)).toBe(false);
  });

  it('accepts a lookup that found box art', () => {
    expect(hasCacheableMetadata({ boxArtUrl: 'https://cdn.example/a.jpg' } as GameMetadata)).toBe(true);
  });

  it('accepts a lookup that found only a description', () => {
    expect(hasCacheableMetadata({ description: 'A game.' } as GameMetadata)).toBe(true);
  });

  it('rejects an empty links array with nothing else', () => {
    expect(hasCacheableMetadata({ links: [] } as unknown as GameMetadata)).toBe(false);
  });
});
