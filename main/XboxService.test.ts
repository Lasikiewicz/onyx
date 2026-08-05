import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { XboxService } from './XboxService.js';
import { XboxScanner } from './scanners/XboxScanner.js';
import { GameFilteringService } from './GameFilteringService.js';

/**
 * Characterisation tests for XboxService.
 *
 * These were written before converting the service from synchronous fs/spawnSync to async, to
 * pin the behaviour the conversion must preserve: which folders are skipped, which executable
 * is chosen as the launch target, how names are derived, and how depth limits apply.
 *
 * They deliberately drive real directories under the OS temp dir rather than mocking `fs`, so
 * they keep working across the sync/async change. PowerShell-backed paths are stubbed out via
 * the injectable seams so no test spawns a shell.
 */

const isWindows = process.platform === 'win32';

// scanGames() throws on non-Windows by design, and the folder-layout assertions below are
// about Windows install shapes, so the suite is Windows-only.
const describeWin = isWindows ? describe : describe.skip;

let root: string;

function makeDir(...segments: string[]): string {
  const dir = join(root, ...segments);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeFile(relativeDir: string[], name: string, contents = ''): string {
  const dir = makeDir(...relativeDir);
  const file = join(dir, name);
  writeFileSync(file, contents, 'utf-8');
  return file;
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'onyx-xbox-'));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/**
 * A service whose PowerShell-backed lookups are stubbed to "nothing found".
 *
 * The stubs use `mockReturnValue`, not `mockResolvedValue`, and every call site here uses
 * `await`. `await` on a plain value is a no-op, so these tests bind to the *behaviour* and not
 * to whether the implementation is synchronous — which is the whole point of writing them
 * before the async conversion.
 */
function makeService(): XboxService {
  const service = new XboxService();
  vi.spyOn(service as any, 'getGamingServicesPackageFamilies').mockReturnValue(new Set<string>());
  return service;
}

describeWin('XboxService name derivation', () => {
  const service = new XboxService();

  it('extracts an app name from a UWP package folder name', () => {
    expect((service as any).extractAppName('Microsoft.XboxGameOverlay_1.0.0.0_x64__8wekyb3d8bbwe'))
      .toBe('XboxGameOverlay');
  });

  it('falls back to the folder name when there is nothing to strip', () => {
    expect((service as any).extractAppName('SomeGame')).toBe('SomeGame');
  });

  it('maps the generic Call of Duty folder to the newest title', () => {
    expect((service as any).mapToNewestGameName('Call of Duty')).toBe('Call of Duty: Black Ops 7');
    expect((service as any).mapToNewestGameName('cod')).toBe('Call of Duty: Black Ops 7');
  });

  it('leaves other folder names untouched', () => {
    expect((service as any).mapToNewestGameName('Forza Horizon 5')).toBe('Forza Horizon 5');
  });

  it('sanitizes id segments to a stable slug', () => {
    expect((service as any).sanitizeIdSegment('Publisher.App_1.0__hash')).toBe('publisher-app_1-0__hash');
    expect((service as any).sanitizeIdSegment('!!!')).toBe('!!!');
    expect((service as any).sanitizeIdSegment('***')).toBe('unknown');
  });
});

describeWin('XboxService.findExecutables', () => {
  const service = new XboxService();

  it('keeps game executables and gamelaunchhelper, dropping installer-type binaries', async () => {
    makeFile(['exes', 'Game'], 'Game.exe');
    makeFile(['exes', 'Game'], 'gamelaunchhelper.exe');
    makeFile(['exes', 'Game'], 'UnrealInstaller.exe');
    makeFile(['exes', 'Game'], 'setup.exe');
    makeFile(['exes', 'Game'], 'uninstall.exe');
    makeFile(['exes', 'Game'], 'updater.exe');
    makeFile(['exes', 'Game'], 'bootstrapper.exe');
    makeFile(['exes', 'Game'], 'readme.txt');

    const found = await (service as any).findExecutables(join(root, 'exes', 'Game'), 0, 20);
    const names = found.map((p: string) => p.split(/[/\\]/).pop()).sort();

    expect(names).toEqual(['Game.exe', 'gamelaunchhelper.exe']);
  });

  it('skips well-known noise directories', async () => {
    makeFile(['skip', 'node_modules'], 'Dep.exe');
    makeFile(['skip', '.git'], 'Hook.exe');
    makeFile(['skip', 'WinGDK'], 'Gdk.exe');
    makeFile(['skip', 'Real'], 'Real.exe');

    const found = await (service as any).findExecutables(join(root, 'skip'), 0, 20);
    const names = found.map((p: string) => p.split(/[/\\]/).pop());

    expect(names).toEqual(['Real.exe']);
  });

  it('does not descend past maxDepth', async () => {
    makeFile(['depth', 'a', 'b', 'c'], 'Deep.exe');

    const shallow = await (service as any).findExecutables(join(root, 'depth'), 0, 1);
    const deep = await (service as any).findExecutables(join(root, 'depth'), 0, 20);

    expect(shallow).toHaveLength(0);
    expect(deep.map((p: string) => p.split(/[/\\]/).pop())).toEqual(['Deep.exe']);
  });

  it('returns an empty list for a directory it cannot read', async () => {
    const found = await (service as any).findExecutables(join(root, 'does-not-exist'), 0, 20);
    expect(found).toEqual([]);
  });

  it('walks a directory reachable by two paths only once', async () => {
    // Stands in for a directory junction pointing back into the tree: the same real path is
    // reachable twice, and without the visited set the walk re-enters it.
    makeFile(['cycle', 'real'], 'Game.exe');
    const visited = new Set<string>();

    const first = await (service as any).findExecutables(join(root, 'cycle'), 0, 20, visited);
    const second = await (service as any).findExecutables(join(root, 'cycle', 'real'), 0, 20, visited);

    expect(first.map((p: string) => p.split(/[/\\]/).pop())).toEqual(['Game.exe']);
    // Already walked under the shared visited set, so it is not reported a second time.
    expect(second).toEqual([]);
  });
});

describeWin('XboxService package family lookup', () => {
  it('enumerates installed packages once and serves later lookups from the table', async () => {
    const service = new XboxService();
    const load = vi.spyOn(service as any, 'loadPackageFamilyNames').mockResolvedValue(
      new Map([['contoso.game', 'Contoso.Game_8wekyb3d8bbwe']]),
    );

    await expect((service as any).getPackageFamilyName('Contoso.Game')).resolves.toBe('Contoso.Game_8wekyb3d8bbwe');
    await expect((service as any).getPackageFamilyName('Contoso.Game')).resolves.toBe('Contoso.Game_8wekyb3d8bbwe');
    await expect((service as any).getPackageFamilyName('Not.Installed')).resolves.toBeNull();

    // One PowerShell enumeration for the whole scan, not one per game folder.
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('re-queries installed packages on the next scan', async () => {
    const service = new XboxService();
    const load = vi.spyOn(service as any, 'loadPackageFamilyNames').mockResolvedValue(new Map());
    vi.spyOn(service as any, 'getGamingServicesPackageFamilies').mockReturnValue(new Set<string>());

    await (service as any).getPackageFamilyName('Anything');
    await service.scanGames(join(root, 'XboxGames-missing'));
    await (service as any).getPackageFamilyName('Anything');

    expect(load).toHaveBeenCalledTimes(2);
  });
});

describeWin('XboxService.scanGames over an XboxGames folder', () => {
  it('skips DLC, pack, stub, tracker and launcher folders', async () => {
    const base = makeDir('XboxGames-skip');
    for (const folder of ['Some DLC Pack', 'Game Pass Bundle', 'Pre-Order Pack', 'Game Stub', 'Achievement Tracker', 'Epic Launcher']) {
      makeFile(['XboxGames-skip', folder], 'Thing.exe');
    }
    makeFile(['XboxGames-skip', 'Real Game'], 'RealGame.exe');

    const games = await makeService().scanGames(base);

    expect(games.map((g) => g.name)).toEqual(['Real Game']);
  });

  it('prefers an executable under Content over one at the root', async () => {
    const base = makeDir('XboxGames-content');
    makeFile(['XboxGames-content', 'Halo', 'Content'], 'Halo.exe');
    makeFile(['XboxGames-content', 'Halo'], 'RootThing.exe');

    const games = await makeService().scanGames(base);

    expect(games).toHaveLength(1);
    expect(games[0].type).toBe('pc');
    // No gamelaunchhelper present, so the chosen Content exe is also the launch target.
    expect(games[0].installPath.toLowerCase()).toContain('content');
    expect(games[0].installPath).toMatch(/Halo\.exe$/);
  });

  it('uses gamelaunchhelper.exe as the launch target when present', async () => {
    const base = makeDir('XboxGames-helper');
    makeFile(['XboxGames-helper', 'Forza', 'Content'], 'Forza.exe');
    makeFile(['XboxGames-helper', 'Forza'], 'gamelaunchhelper.exe');

    const games = await makeService().scanGames(base);

    expect(games).toHaveLength(1);
    expect(games[0].installPath).toMatch(/gamelaunchhelper\.exe$/);
  });

  it('derives a readable name from the executable when the folder is a UUID', async () => {
    const base = makeDir('XboxGames-uuid');
    makeFile(['XboxGames-uuid', '0f3a1b2c-4d5e-6f70-8192-a3b4c5d6e7f8', 'Content'], 'SuperCoolGame.exe');

    const games = await makeService().scanGames(base);

    expect(games).toHaveLength(1);
    expect(games[0].name).toBe('Super Cool Game');
  });

  it('applies the newest-title mapping to generic folder names', async () => {
    const base = makeDir('XboxGames-cod');
    makeFile(['XboxGames-cod', 'Call of Duty', 'Content'], 'cod.exe');

    const games = await makeService().scanGames(base);

    expect(games.map((g) => g.name)).toEqual(['Call of Duty: Black Ops 7']);
  });

  it('reports no games for a folder whose only executables are helpers', async () => {
    const base = makeDir('XboxGames-empty');
    makeFile(['XboxGames-empty', 'Broken', 'Content'], 'setup.exe');

    const games = await makeService().scanGames(base);

    expect(games).toEqual([]);
  });

  it('returns an empty list when the XboxGames folder does not exist', async () => {
    const games = await makeService().scanGames(join(root, 'XboxGames-missing'));
    expect(games).toEqual([]);
  });
});

describeWin('XboxService.scanGames over a WindowsApps folder', () => {
  it('returns nothing when the GamingServices registry lists no packages', async () => {
    const base = makeDir('WindowsApps');
    makeFile(['WindowsApps', 'Publisher.Game_1.0_x64__abc'], 'Game.exe');

    const games = await makeService().scanGames(base);

    expect(games).toEqual([]);
  });

  it('includes only packages the GamingServices registry validates', async () => {
    const base = makeDir('WindowsApps-validated');
    makeFile(['WindowsApps-validated', 'Publisher.Game_1.0_x64__abc'], 'Game.exe');
    makeFile(['WindowsApps-validated', 'Publisher.NotAGame_1.0_x64__abc'], 'Other.exe');

    const service = new XboxService();
    vi.spyOn(service as any, 'getGamingServicesPackageFamilies')
      .mockReturnValue(new Set(['publisher.game_1.0_x64__abc']));

    const games = await service.scanGames(base);

    expect(games).toHaveLength(1);
    expect(games[0].type).toBe('uwp');
    expect(games[0].packageFamilyName).toBe('Publisher.Game_1.0_x64__abc');
  });
});

describeWin('XboxScanner maps service results onto scan results', () => {
  it('splits the exe path into installPath and exePath for PC games', async () => {
    const base = makeDir('XboxGames-scanner-pc');
    makeFile(['XboxGames-scanner-pc', 'Starfield', 'Content'], 'Starfield.exe');

    const service = makeService();
    const scanner = new XboxScanner(service, new GameFilteringService());

    const results = await scanner.scan(base);

    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('xbox');
    expect(results[0].xboxKind).toBe('pc');
    expect(results[0].title).toBe('Starfield');
    expect(results[0].exePath).toMatch(/Starfield\.exe$/);
    expect(results[0].installPath).not.toMatch(/\.exe$/);
    // Paths are normalised to forward slashes for the renderer.
    expect(results[0].installPath).not.toContain('\\');
  });

  it('returns an empty list rather than throwing when the scan fails', async () => {
    const service = new XboxService();
    vi.spyOn(service as any, 'scanXboxGames').mockImplementation(() => { throw new Error('boom'); });
    vi.spyOn(service as any, 'getGamingServicesPackageFamilies').mockReturnValue(new Set<string>());

    const scanner = new XboxScanner(service, new GameFilteringService());
    const results = await scanner.scan(join(root, 'XboxGames'));

    expect(results).toEqual([]);
  });
});
