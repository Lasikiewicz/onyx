import { describe, expect, it } from 'vitest';
import type { Game } from './GameStore.js';
import { findMissingGames } from './missingGames.js';
import type { ScanReport } from './ImportService.js';

const steamGame = (appId: string): Game => ({
  id: `steam-${appId}`,
  title: `Steam ${appId}`,
  platform: 'steam',
  source: 'steam',
  exePath: '',
  boxArtUrl: '',
  bannerUrl: '',
});

const fileGame = (id: string, exePath: string): Game => ({
  id,
  title: id,
  platform: 'other',
  source: 'manual',
  exePath,
  boxArtUrl: '',
  bannerUrl: '',
});

const report = (overrides: Partial<ScanReport> = {}): ScanReport => ({
  results: [],
  sourceStatus: {},
  cancelled: false,
  ...overrides,
});

const everythingExists = async () => true;
const nothingExists = async () => false;

describe('findMissingGames', () => {
  it('flags a Steam game that is absent from a completed Steam scan', async () => {
    const library = [steamGame('1'), steamGame('2')];
    const scan = report({
      results: [{ source: 'steam', appId: '1' } as any],
      sourceStatus: { steam: 'ok' },
    });

    const missing = await findMissingGames(library, scan, everythingExists);

    expect(missing.map(g => g.id)).toEqual(['steam-2']);
  });

  it('does not flag any Steam game when the Steam scan errored', async () => {
    const library = [steamGame('1'), steamGame('2')];
    const scan = report({ sourceStatus: { steam: 'error' } });

    expect(await findMissingGames(library, scan, everythingExists)).toEqual([]);
  });

  it('does not flag any Steam game when the Steam source was skipped (disabled or drive offline)', async () => {
    const library = [steamGame('1')];
    const scan = report({ sourceStatus: { steam: 'skipped' } });

    expect(await findMissingGames(library, scan, everythingExists)).toEqual([]);
  });

  it('does not flag any Steam game when Steam never appeared in the report', async () => {
    const library = [steamGame('1')];

    expect(await findMissingGames(library, report(), everythingExists)).toEqual([]);
  });

  it('reports nothing for a cancelled scan, even when every path is missing', async () => {
    const library = [steamGame('1'), fileGame('custom-1', 'C:\\Games\\a.exe')];
    const scan = report({ cancelled: true, sourceStatus: { steam: 'ok' } });

    expect(await findMissingGames(library, scan, nothingExists)).toEqual([]);
  });

  it('flags a non-Steam game whose exe no longer exists', async () => {
    const library = [fileGame('custom-1', 'C:\\Games\\gone.exe'), fileGame('custom-2', 'C:\\Games\\here.exe')];
    const pathExists = async (path: string) => path.endsWith('here.exe');

    const missing = await findMissingGames(library, report(), pathExists);

    expect(missing.map(g => g.id)).toEqual(['custom-1']);
  });

  it('keeps a non-Steam game that has no exe path to check', async () => {
    const library = [fileGame('custom-1', '   ')];

    expect(await findMissingGames(library, report(), nothingExists)).toEqual([]);
  });
});
