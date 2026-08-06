import { describe, expect, it, afterEach, vi } from 'vitest';
import { getLibrarySourceDefinitions, resolveHostPlatform } from './librarySourceDefaults';

/**
 * The Windows source list is the one that already shipped, so it is pinned exactly: adding Linux
 * support must not reorder, rename or re-path a single Windows entry.
 */
const WINDOWS_IDS = [
  'steam', 'epic', 'ea', 'gog', 'ubisoft', 'battle', 'xbox', 'humble', 'itch', 'rockstar',
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getLibrarySourceDefinitions', () => {
  it('lists the shipped Windows sources, in the shipped order', () => {
    expect(getLibrarySourceDefinitions('win32').map((source) => source.id)).toEqual(WINDOWS_IDS);
  });

  it('keeps the Windows default paths and display names unchanged', () => {
    const byId = new Map(getLibrarySourceDefinitions('win32').map((source) => [source.id, source]));

    expect(byId.get('steam')).toMatchObject({
      name: 'Steam',
      defaultPaths: ['C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam'],
      placeholder: 'C:\\Program Files (x86)\\Steam',
    });
    expect(byId.get('xbox')).toMatchObject({
      name: 'Xbox Game Pass',
      defaultPaths: ['C:\\XboxGames', 'C:\\Program Files\\WindowsApps'],
    });
    expect(byId.get('itch')?.defaultPaths[0]).toBe('%LOCALAPPDATA%\\itch');
    expect(byId.get('ea')?.name).toBe('EA App / Origin');
  });

  it('omits the Windows-only stores on Linux rather than offering rows that can never match', () => {
    const linuxIds = getLibrarySourceDefinitions('linux').map((source) => source.id);

    // No Linux client exists for any of these.
    for (const id of ['xbox', 'ea', 'ubisoft', 'battle', 'humble', 'rockstar']) {
      expect(linuxIds).not.toContain(id);
    }
  });

  it('offers the Linux sources, including the launchers that front Epic and GOG there', () => {
    const linuxIds = getLibrarySourceDefinitions('linux').map((source) => source.id);

    expect(linuxIds).toEqual(['steam', 'epic', 'gog', 'lutris', 'bottles', 'itch']);
  });

  it('points Epic and GOG at the Heroic config root on Linux', () => {
    const byId = new Map(getLibrarySourceDefinitions('linux').map((source) => [source.id, source]));

    expect(byId.get('epic')?.defaultPaths[0]).toBe('~/.config/heroic');
    expect(byId.get('gog')?.defaultPaths[0]).toBe('~/.config/heroic');
    // Native GOG installers write outside Heroic, so that folder is the documented fallback.
    expect(byId.get('gog')?.defaultPaths).toContain('~/GOG Games');
  });

  it('uses only variable-prefixed or absolute paths the main process can expand', () => {
    for (const source of getLibrarySourceDefinitions('linux')) {
      for (const path of source.defaultPaths) {
        expect(path.startsWith('~/') || path.startsWith('/')).toBe(true);
      }
    }
  });

  it('gives every source a non-empty placeholder drawn from its own defaults', () => {
    for (const platform of ['win32', 'linux'] as const) {
      for (const source of getLibrarySourceDefinitions(platform)) {
        expect(source.placeholder).not.toBe('');
        expect(source.defaultPaths.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('resolveHostPlatform', () => {
  it('returns the platform reported by the preload bridge', async () => {
    vi.stubGlobal('window', { electronAPI: { getPlatform: () => Promise.resolve('linux') } });

    expect(await resolveHostPlatform()).toBe('linux');
  });

  it('falls back to Windows when the bridge predates getPlatform', async () => {
    // A stale dist-electron/preload.js in dev: the list must still render rather than come up empty.
    vi.stubGlobal('window', { electronAPI: {} });

    expect(await resolveHostPlatform()).toBe('win32');
  });

  it('falls back to Windows when the bridge throws', async () => {
    vi.stubGlobal('window', {
      electronAPI: { getPlatform: () => Promise.reject(new Error('no handler registered')) },
    });

    expect(await resolveHostPlatform()).toBe('win32');
  });
});
