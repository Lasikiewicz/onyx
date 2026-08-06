import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Tests for the platform seam that Linux support is built on.
 *
 * `IS_WINDOWS` is resolved once at module load, so the only way to exercise both branches is to stub
 * `process.platform` and re-import. `loadForPlatform` does that; every test that cares about the
 * branch loads its own copy rather than sharing one.
 */

type PlatformSupport = typeof import('./platformSupport.js');

async function loadForPlatform(platform: NodeJS.Platform): Promise<PlatformSupport> {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  vi.resetModules();
  try {
    return await import('./platformSupport.js');
  } finally {
    Object.defineProperty(process, 'platform', { value: original, configurable: true });
  }
}

// The extension-less branch reads the executable bit, which does not exist on Windows: fs.access
// with X_OK always resolves there, so those assertions can only be made on a POSIX host.
const itPosixHost = process.platform === 'win32' ? it.skip : it;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('expandPathVariables', () => {
  it('expands %VAR% so the Windows source defaults resolve', async () => {
    const { expandPathVariables } = await loadForPlatform('win32');
    vi.stubEnv('LOCALAPPDATA', 'C:\\Users\\test\\AppData\\Local');

    expect(expandPathVariables('%LOCALAPPDATA%\\itch')).toBe('C:\\Users\\test\\AppData\\Local\\itch');
  });

  it('matches %VAR% case-insensitively, as Windows env lookups do', async () => {
    const { expandPathVariables } = await loadForPlatform('win32');
    vi.stubEnv('ProgramFiles(x86)', 'C:\\PF86');

    expect(expandPathVariables('%PROGRAMFILES(X86)%\\Steam')).toBe('C:\\PF86\\Steam');
  });

  it('leaves an unset variable untouched so the caller\'s existence check fails cleanly', async () => {
    const { expandPathVariables } = await loadForPlatform('win32');

    expect(expandPathVariables('%NOT_A_REAL_VAR%\\x')).toBe('%NOT_A_REAL_VAR%\\x');
  });

  it('does not mangle a real folder name containing percent signs', async () => {
    const { expandPathVariables } = await loadForPlatform('win32');

    // "-off" is not a variable, so the whole span must survive verbatim.
    expect(expandPathVariables('D:\\50%-off%backup\\Steam')).toBe('D:\\50%-off%backup\\Steam');
  });

  it('expands a leading ~ on POSIX', async () => {
    const { expandPathVariables } = await loadForPlatform('linux');

    expect(expandPathVariables('~')).toBe(homedir());
    expect(expandPathVariables('~/.steam/steam')).toBe(join(homedir(), '.steam', 'steam'));
  });

  it('only expands ~ as the first segment', async () => {
    const { expandPathVariables } = await loadForPlatform('linux');

    expect(expandPathVariables('/opt/~/games')).toBe('/opt/~/games');
    expect(expandPathVariables('~games/x')).toBe('~games/x');
  });

  it('expands $VAR and ${VAR} on POSIX and leaves unset ones alone', async () => {
    const { expandPathVariables } = await loadForPlatform('linux');
    vi.stubEnv('XDG_DATA_HOME', '/home/test/.local/share');

    expect(expandPathVariables('$XDG_DATA_HOME/Steam')).toBe('/home/test/.local/share/Steam');
    expect(expandPathVariables('${XDG_DATA_HOME}/Steam')).toBe('/home/test/.local/share/Steam');
    expect(expandPathVariables('$NOT_A_REAL_VAR/x')).toBe('$NOT_A_REAL_VAR/x');
  });

  it('does not treat ~ or $VAR as expandable on Windows', async () => {
    const { expandPathVariables } = await loadForPlatform('win32');
    vi.stubEnv('XDG_DATA_HOME', '/home/test/.local/share');

    expect(expandPathVariables('~/.steam/steam')).toBe('~/.steam/steam');
    expect(expandPathVariables('$XDG_DATA_HOME/Steam')).toBe('$XDG_DATA_HOME/Steam');
  });

  it('passes an empty path straight through', async () => {
    const { expandPathVariables } = await loadForPlatform('linux');

    expect(expandPathVariables('')).toBe('');
  });
});

describe('getGameExecutableExtensions', () => {
  it('recognises only .exe on Windows', async () => {
    const { getGameExecutableExtensions } = await loadForPlatform('win32');

    expect(getGameExecutableExtensions()).toEqual(['.exe']);
  });

  it('recognises native Linux entry points plus .exe for Proton/Wine titles', async () => {
    const { getGameExecutableExtensions } = await loadForPlatform('linux');

    expect(getGameExecutableExtensions()).toContain('.x86_64');
    expect(getGameExecutableExtensions()).toContain('.appimage');
    expect(getGameExecutableExtensions()).toContain('.sh');
    // Steam and Heroic libraries are full of Windows builds run through Proton.
    expect(getGameExecutableExtensions()).toContain('.exe');
  });
});

describe('describeGameExecutableCandidate', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'onyx-platform-'));
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function makeFile(name: string, mode?: number): string {
    const filePath = join(root, name);
    writeFileSync(filePath, 'x', 'utf-8');
    if (mode !== undefined) {
      chmodSync(filePath, mode);
    }
    return filePath;
  }

  it('strips the extension to give the base name the exclusion filters compare against', async () => {
    const { describeGameExecutableCandidate } = await loadForPlatform('win32');
    const filePath = makeFile('Game.exe');

    expect(await describeGameExecutableCandidate(filePath, 'Game.exe')).toEqual({
      lowerName: 'game.exe',
      baseName: 'game',
    });
  });

  it('strips only the trailing extension, not an earlier occurrence', async () => {
    const { describeGameExecutableCandidate } = await loadForPlatform('win32');
    const filePath = makeFile('MyGame.exec.exe');

    expect(await describeGameExecutableCandidate(filePath, 'MyGame.exec.exe')).toEqual({
      lowerName: 'mygame.exec.exe',
      baseName: 'mygame.exec',
    });
  });

  it('rejects Linux entry points on Windows, so a Windows scan finds exactly what it did before', async () => {
    const { describeGameExecutableCandidate } = await loadForPlatform('win32');

    for (const name of ['Game.x86_64', 'Game.sh', 'Game.AppImage', 'Game']) {
      const filePath = makeFile(name);
      expect(await describeGameExecutableCandidate(filePath, name)).toBeNull();
    }
  });

  it('accepts the native Linux extensions', async () => {
    const { describeGameExecutableCandidate } = await loadForPlatform('linux');

    const cases: Array<[string, string]> = [
      ['Game.x86_64', 'game'],
      ['Game.x64', 'game'],
      ['Game.x86', 'game'],
      ['Game.AppImage', 'game'],
      ['start.sh', 'start'],
      ['Game.exe', 'game'],
    ];

    for (const [name, baseName] of cases) {
      const filePath = makeFile(name);
      expect(await describeGameExecutableCandidate(filePath, name)).toEqual({
        lowerName: name.toLowerCase(),
        baseName,
      });
    }
  });

  it('rejects data files rather than stat-ing them', async () => {
    const { describeGameExecutableCandidate } = await loadForPlatform('linux');

    // A dot in the name that is not a known executable extension means the exec-bit branch is
    // skipped entirely, which is what keeps large asset trees off the extra I/O.
    for (const name of ['data.pak', 'libfoo.so.1', 'save.dat']) {
      const filePath = makeFile(name);
      expect(await describeGameExecutableCandidate(filePath, name)).toBeNull();
    }
  });

  itPosixHost('accepts an extension-less file that carries the executable bit', async () => {
    const { describeGameExecutableCandidate } = await loadForPlatform('linux');
    const filePath = makeFile('NativeGame', 0o755);

    expect(await describeGameExecutableCandidate(filePath, 'NativeGame')).toEqual({
      lowerName: 'nativegame',
      baseName: 'nativegame',
    });
  });

  itPosixHost('rejects an extension-less file without the executable bit', async () => {
    const { describeGameExecutableCandidate } = await loadForPlatform('linux');
    const filePath = makeFile('README', 0o644);

    expect(await describeGameExecutableCandidate(filePath, 'README')).toBeNull();
  });
});

describe('Linux launcher roots', () => {
  it('covers the native, legacy, Flatpak and Snap Steam locations, in that order', async () => {
    const { getLinuxSteamRootCandidates } = await loadForPlatform('linux');
    const roots = getLinuxSteamRootCandidates();

    expect(roots[0]).toBe(join(homedir(), '.steam', 'steam'));
    expect(roots).toContain(join(homedir(), '.local', 'share', 'Steam'));
    expect(roots.some((root) => root.includes('com.valvesoftware.Steam'))).toBe(true);
    expect(roots.some((root) => root.includes(join('snap', 'steam')))).toBe(true);
  });

  it('covers the native and Flatpak Heroic config roots', async () => {
    const { getLinuxHeroicConfigRoots } = await loadForPlatform('linux');
    const roots = getLinuxHeroicConfigRoots();

    expect(roots[0]).toBe(join(homedir(), '.config', 'heroic'));
    expect(roots.some((root) => root.includes('com.heroicgameslauncher.hgl'))).toBe(true);
  });

  it('covers the native and Flatpak Lutris and Bottles roots', async () => {
    const { getLinuxLutrisRoots, getLinuxBottlesRoots } = await loadForPlatform('linux');

    expect(getLinuxLutrisRoots()[0]).toBe(join(homedir(), '.local', 'share', 'lutris'));
    expect(getLinuxLutrisRoots().some((root) => root.includes('net.lutris.Lutris'))).toBe(true);
    expect(getLinuxBottlesRoots()[0]).toBe(join(homedir(), '.local', 'share', 'bottles'));
    expect(getLinuxBottlesRoots().some((root) => root.includes('com.usebottles.bottles'))).toBe(true);
  });
});

describe('findFirstExistingPath', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'onyx-firstpath-'));
    writeFileSync(join(root, 'present'), 'x', 'utf-8');
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('returns the first candidate that exists, preserving preference order', async () => {
    const { findFirstExistingPath } = await loadForPlatform(process.platform);

    expect(await findFirstExistingPath([join(root, 'missing'), join(root, 'present')]))
      .toBe(join(root, 'present'));
  });

  it('returns undefined when nothing exists', async () => {
    const { findFirstExistingPath } = await loadForPlatform(process.platform);

    expect(await findFirstExistingPath([join(root, 'a'), join(root, 'b')])).toBeUndefined();
  });
});
