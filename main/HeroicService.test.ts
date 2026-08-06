import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readHeroicInstalledGames } from './HeroicService.js';

/**
 * Heroic is how an Epic or GOG library exists on Linux, and Onyx reads its install records as plain
 * JSON rather than driving Heroic itself. The parsing is therefore the part that can go wrong, so
 * these tests drive real fixture trees under the OS temp dir via the `configRootOverride` seam.
 */

let root: string;
let configRoot: string;
let gamesRoot: string;

function writeJson(relativePath: string[], value: unknown): void {
  const filePath = join(configRoot, ...relativePath);
  mkdirSync(join(filePath, '..'), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value), 'utf-8');
}

/** Create an installed-game directory and return its absolute path. */
function makeInstallDir(name: string): string {
  const dir = join(gamesRoot, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeLegendaryRecords(records: Record<string, unknown>): void {
  writeJson(['legendaryConfig', 'legendary', 'installed.json'], records);
}

function writeGogRecords(installed: unknown[]): void {
  writeJson(['gog_store', 'installed.json'], { installed });
}

function writeGogLibrary(games: unknown[]): void {
  writeJson(['store_cache', 'gog_library.json'], { games });
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'onyx-heroic-'));
  configRoot = join(root, 'heroic');
  gamesRoot = join(root, 'games');
  mkdirSync(configRoot, { recursive: true });
  mkdirSync(gamesRoot, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('readHeroicInstalledGames - Epic via Legendary', () => {
  it('maps an installed game onto the epic source with a Heroic launch URI', async () => {
    const installPath = makeInstallDir('Dead Cells');
    writeLegendaryRecords({
      DeadCells: {
        app_name: 'DeadCells',
        title: 'Dead Cells',
        install_path: installPath,
      },
    });

    const games = await readHeroicInstalledGames(['legendary'], configRoot);

    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      appName: 'DeadCells',
      title: 'Dead Cells',
      installPath,
      runner: 'legendary',
      source: 'epic',
      // Routing through Heroic is what preserves the per-game Wine/Proton prefix.
      launchUri: 'heroic://launch/legendary/DeadCells',
    });
  });

  it('resolves the recorded executable against the install path when it exists', async () => {
    const installPath = makeInstallDir('Hades');
    mkdirSync(join(installPath, 'bin'), { recursive: true });
    writeFileSync(join(installPath, 'bin', 'Hades'), 'x', 'utf-8');

    writeLegendaryRecords({
      Hades: {
        app_name: 'Hades',
        title: 'Hades',
        install_path: installPath,
        executable: 'bin/Hades',
      },
    });

    const [game] = await readHeroicInstalledGames(['legendary'], configRoot);

    expect(game.exePath).toBe(join(installPath, 'bin', 'Hades'));
  });

  it('leaves exePath undefined when the recorded executable is missing or absent', async () => {
    const withMissingExe = makeInstallDir('Missing Exe');
    const withNoExeField = makeInstallDir('No Exe Field');

    writeLegendaryRecords({
      MissingExe: { app_name: 'MissingExe', title: 'Missing Exe', install_path: withMissingExe, executable: 'bin/Gone' },
      NoExeField: { app_name: 'NoExeField', title: 'No Exe Field', install_path: withNoExeField },
    });

    const games = await readHeroicInstalledGames(['legendary'], configRoot);

    expect(games).toHaveLength(2);
    expect(games.every((game) => game.exePath === undefined)).toBe(true);
  });

  it('skips DLC, which shares its parent install directory and would import as a duplicate', async () => {
    const installPath = makeInstallDir('Base Game');

    writeLegendaryRecords({
      BaseGame: { app_name: 'BaseGame', title: 'Base Game', install_path: installPath },
      BaseGameDlc: { app_name: 'BaseGameDlc', title: 'Base Game DLC', install_path: installPath, is_dlc: true },
    });

    const games = await readHeroicInstalledGames(['legendary'], configRoot);

    expect(games.map((game) => game.appName)).toEqual(['BaseGame']);
  });

  it('skips records whose install path no longer exists', async () => {
    writeLegendaryRecords({
      Uninstalled: {
        app_name: 'Uninstalled',
        title: 'Uninstalled',
        install_path: join(gamesRoot, 'deleted-by-the-user'),
      },
    });

    expect(await readHeroicInstalledGames(['legendary'], configRoot)).toEqual([]);
  });

  it('falls back to the record key and folder name when app_name or title are absent', async () => {
    const installPath = makeInstallDir('Celeste');
    writeLegendaryRecords({
      CelesteKey: { install_path: installPath },
    });

    const [game] = await readHeroicInstalledGames(['legendary'], configRoot);

    expect(game.appName).toBe('CelesteKey');
    expect(game.title).toBe('Celeste');
  });

  it('encodes an app name that is not URI-safe', async () => {
    const installPath = makeInstallDir('Spaced Game');
    writeLegendaryRecords({
      'Spaced Name': { app_name: 'Spaced Name', title: 'Spaced Game', install_path: installPath },
    });

    const [game] = await readHeroicInstalledGames(['legendary'], configRoot);

    expect(game.launchUri).toBe('heroic://launch/legendary/Spaced%20Name');
  });
});

describe('readHeroicInstalledGames - GOG', () => {
  it('takes the title from Heroic\'s library cache', async () => {
    const installPath = makeInstallDir('baldurs_gate_3');
    writeGogRecords([{ appName: '1207658930', install_path: installPath }]);
    writeGogLibrary([{ app_name: '1207658930', title: "Baldur's Gate 3" }]);

    const [game] = await readHeroicInstalledGames(['gog'], configRoot);

    expect(game).toMatchObject({
      appName: '1207658930',
      title: "Baldur's Gate 3",
      runner: 'gog',
      source: 'gog',
      launchUri: 'heroic://launch/gog/1207658930',
    });
  });

  it('falls back to the install folder name when the library cache has no entry', async () => {
    const installPath = makeInstallDir('Cyberpunk 2077');
    writeGogRecords([{ appName: '1423049311', install_path: installPath }]);

    const [game] = await readHeroicInstalledGames(['gog'], configRoot);

    expect(game.title).toBe('Cyberpunk 2077');
  });

  it('skips records missing an appName or an existing install path', async () => {
    const installPath = makeInstallDir('Valid');
    writeGogRecords([
      { appName: '1', install_path: installPath },
      { appName: '', install_path: installPath },
      { appName: '2', install_path: join(gamesRoot, 'gone') },
      { install_path: installPath },
    ]);

    const games = await readHeroicInstalledGames(['gog'], configRoot);

    expect(games.map((game) => game.appName)).toEqual(['1']);
  });
});

describe('readHeroicInstalledGames - resilience and runner selection', () => {
  it('returns an empty list when Heroic is not installed', async () => {
    expect(await readHeroicInstalledGames(['legendary', 'gog'], join(root, 'no-heroic-here'))).toEqual([]);
  });

  it('returns an empty list rather than throwing on malformed records', async () => {
    // A partial write while Heroic is running produces exactly this.
    mkdirSync(join(configRoot, 'legendaryConfig', 'legendary'), { recursive: true });
    writeFileSync(join(configRoot, 'legendaryConfig', 'legendary', 'installed.json'), '{"broken":', 'utf-8');

    expect(await readHeroicInstalledGames(['legendary'], configRoot)).toEqual([]);
  });

  it('ignores a library cache that is not the expected shape', async () => {
    const installPath = makeInstallDir('Some Game');
    writeGogRecords([{ appName: '99', install_path: installPath }]);
    writeJson(['store_cache', 'gog_library.json'], { games: 'not-an-array' });

    const [game] = await readHeroicInstalledGames(['gog'], configRoot);

    expect(game.title).toBe('Some Game');
  });

  it('reads only the requested runners', async () => {
    const epicPath = makeInstallDir('Epic Game');
    const gogPath = makeInstallDir('Gog Game');
    writeLegendaryRecords({ E: { app_name: 'E', title: 'Epic Game', install_path: epicPath } });
    writeGogRecords([{ appName: 'G', install_path: gogPath }]);

    expect((await readHeroicInstalledGames(['legendary'], configRoot)).map((g) => g.source)).toEqual(['epic']);
    expect((await readHeroicInstalledGames(['gog'], configRoot)).map((g) => g.source)).toEqual(['gog']);
    expect((await readHeroicInstalledGames(['legendary', 'gog'], configRoot)).map((g) => g.source))
      .toEqual(['epic', 'gog']);
  });
});
