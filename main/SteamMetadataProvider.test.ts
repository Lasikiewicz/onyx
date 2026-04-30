import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SteamMetadataProvider } from './SteamMetadataProvider.js';

describe('SteamMetadataProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers about_the_game over short_description', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        '1808500': {
          success: true,
          data: {
            name: 'ARC Raiders',
            about_the_game: '<p>About the Game HTML</p>',
            short_description: 'Short store blurb',
            detailed_description: '<p>Detailed store body</p>',
          },
        },
      }),
    } as Response);

    const provider = new SteamMetadataProvider({} as any);
    const result = await provider.getDescription('steam-1808500');

    expect(result?.title).toBe('ARC Raiders');
    expect(result?.source).toBe('steam');
    expect(result?.description).toBe('<p>About the Game HTML</p>');
    expect(result?.summary).toBe('<p>Detailed store body</p>');
  });

  it('falls back to short_description when about_the_game is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        '620': {
          success: true,
          data: {
            name: 'Portal 2',
            short_description: 'Short store blurb',
            detailed_description: '<p>Detailed store body</p>',
          },
        },
      }),
    } as Response);

    const provider = new SteamMetadataProvider({} as any);
    const result = await provider.getDescription('steam-620');

    expect(result?.description).toBe('Short store blurb');
    expect(result?.summary).toBe('<p>Detailed store body</p>');
  });

  it('prefers 2x Steam box art when both cover sizes are available', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      return {
        ok: url.includes('library_600x900'),
        headers: new Headers({ 'content-type': 'image/jpeg' }),
      } as Response;
    });

    const provider = new SteamMetadataProvider({} as any);
    const result = await provider.getArtwork('steam-620');

    expect(result?.boxArtUrl).toContain('library_600x900_2x.jpg');
    expect(result?.boxArtResolution).toEqual({ width: 1200, height: 1800 });
  });
});
