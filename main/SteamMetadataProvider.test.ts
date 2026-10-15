import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SteamMetadataProvider, setSteamLocalArtCacher } from './SteamMetadataProvider.js';

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

  it('still returns box art and banner when the CDN checks fail or time out', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unreachable'));

    const provider = new SteamMetadataProvider({} as any);
    const result = await provider.getArtwork('steam-1808500');

    expect(result?.boxArtUrl).toContain('/1808500/library_600x900.jpg');
    expect(result?.bannerUrl).toContain('/1808500/library_hero.jpg');
  });

  it('uses the store header image as the banner for a newer game on hashed paths (step 7)', async () => {
    const hashed = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3393110/abc123/header.jpg?t=1';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('store.steampowered.com/api/appdetails')) {
        return {
          ok: true,
          json: async () => ({ '3393110': { success: true, data: { header_image: hashed } } }),
        } as unknown as Response;
      }
      // Legacy CDN paths: confirmed missing for this game.
      return { ok: false, headers: new Headers() } as Response;
    });

    const provider = new SteamMetadataProvider({} as any);
    const result = await provider.getArtwork('steam-3393110');

    expect(result?.bannerUrl).toBe(hashed);
  });

  describe('local library art and the store asset list', () => {
    let steamRoot: string;
    const appDir = (id: string) => join(steamRoot, 'appcache', 'librarycache', id);
    const steamService = () => ({ getSteamPath: () => steamRoot }) as any;
    const legacyMissing = async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('GetItems')) return { ok: false, headers: new Headers() } as Response;
      return { ok: false, headers: new Headers() } as Response;
    };

    beforeEach(() => {
      steamRoot = mkdtempSync(join(tmpdir(), 'onyx-steam-'));
    });

    afterEach(() => {
      rmSync(steamRoot, { recursive: true, force: true });
    });

    it('uses the local library cache files before any network lookup', async () => {
      mkdirSync(appDir('377840'), { recursive: true });
      writeFileSync(join(appDir('377840'), 'library_600x900.jpg'), 'jpg');
      writeFileSync(join(appDir('377840'), 'library_hero.jpg'), 'hero');
      writeFileSync(join(appDir('377840'), 'logo.png'), 'logo');
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(legacyMissing);

      const provider = new SteamMetadataProvider(steamService());
      const result = await provider.getArtwork('steam-377840');

      expect(result?.boxArtUrl).toBe(pathToFileURL(join(appDir('377840'), 'library_600x900.jpg')).href);
      expect(result?.bannerUrl).toBe(pathToFileURL(join(appDir('377840'), 'library_hero.jpg')).href);
      expect(result?.logoUrl).toBe(pathToFileURL(join(appDir('377840'), 'logo.png')).href);
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('finds the box art for a newer game in its hashed library subfolder', async () => {
      mkdirSync(join(appDir('3393110'), 'abc123'), { recursive: true });
      writeFileSync(join(appDir('3393110'), 'abc123', 'library_capsule.jpg'), 'jpg');
      vi.spyOn(globalThis, 'fetch').mockImplementation(legacyMissing);

      const provider = new SteamMetadataProvider(steamService());
      const result = await provider.getArtwork('steam-3393110');

      expect(result?.boxArtUrl).toBe(pathToFileURL(join(appDir('3393110'), 'abc123', 'library_capsule.jpg')).href);
    });

    it('takes the hashed box art from the store asset list when nothing is on disk', async () => {
      const hash = '31dd6ce5538a3064749d769527656f9002a382b0';
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('IStoreBrowseService/GetItems')) {
          return {
            ok: true,
            json: async () => ({
              response: {
                store_items: [{
                  assets: {
                    asset_url_format: 'steam/apps/1867240/${FILENAME}?t=1791928607',
                    library_capsule: `${hash}/library_capsule.jpg`,
                    library_hero: '9e3d0dba457f3d33734990866160be80c399f67c/library_hero.jpg',
                  },
                }],
              },
            }),
          } as unknown as Response;
        }
        return { ok: false, headers: new Headers() } as Response;
      });

      const provider = new SteamMetadataProvider(steamService());
      const result = await provider.getArtwork('steam-1867240');

      expect(result?.boxArtUrl).toBe(
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1867240/${hash}/library_capsule.jpg?t=1791928607`,
      );
      expect(result?.bannerUrl).toBe(
        'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1867240/9e3d0dba457f3d33734990866160be80c399f67c/library_hero.jpg?t=1791928607',
      );
    });

    it('prefers a local file over the store asset list', async () => {
      mkdirSync(appDir('1867240'), { recursive: true });
      writeFileSync(join(appDir('1867240'), 'library_600x900.jpg'), 'jpg');
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('IStoreBrowseService/GetItems')) {
          return {
            ok: true,
            json: async () => ({
              response: {
                store_items: [{ assets: { asset_url_format: 'steam/apps/1867240/${FILENAME}', library_capsule: 'h/library_capsule.jpg' } }],
              },
            }),
          } as unknown as Response;
        }
        return { ok: false, headers: new Headers() } as Response;
      });

      const provider = new SteamMetadataProvider(steamService());
      const result = await provider.getArtwork('steam-1867240');

      expect(result?.boxArtUrl).toBe(pathToFileURL(join(appDir('1867240'), 'library_600x900.jpg')).href);
    });

    it('copies local art into the image cache under the Steam game ID and uses the cache URL', async () => {
      mkdirSync(appDir('377840'), { recursive: true });
      writeFileSync(join(appDir('377840'), 'library_600x900.jpg'), 'jpg');
      vi.spyOn(globalThis, 'fetch').mockImplementation(legacyMissing);
      const cacher = vi.fn(async () => 'onyx-local://steam-377840-boxart');
      setSteamLocalArtCacher(cacher);

      try {
        const provider = new SteamMetadataProvider(steamService());
        const result = await provider.getArtwork('steam-377840');

        expect(cacher).toHaveBeenCalledWith(
          pathToFileURL(join(appDir('377840'), 'library_600x900.jpg')).href,
          'steam-377840',
          'boxart',
        );
        expect(result?.boxArtUrl).toBe('onyx-local://steam-377840-boxart');
      } finally {
        setSteamLocalArtCacher(null);
      }
    });

    it('still uses the network when the Steam folder is missing', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

      const provider = new SteamMetadataProvider({ getSteamPath: () => join(steamRoot, 'does-not-exist') } as any);
      const result = await provider.getArtwork('steam-1808500');

      expect(result?.boxArtUrl).toContain('/1808500/library_600x900.jpg');
    });
  });

  it('does not invent box art when Steam confirms the cover is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
      ok: false,
      headers: new Headers(),
    } as Response));

    const provider = new SteamMetadataProvider({} as any);
    const result = await provider.getArtwork('steam-999999');

    expect(result?.boxArtUrl).toBeUndefined();
  });
});
