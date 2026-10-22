import { describe, expect, it } from 'vitest';
import {
  chooseSuspendRoot,
  foregroundSuspendDecision,
  isPathInsideDirectory,
  isSameProcessStart,
  matchTrackedProcess,
  parseCimProcessList,
  parseNativeActionResults,
  parseWindowsProcessTime,
  pickShortcutTarget,
  planSuspendTargets,
  selectResumeTargets,
  type SnapshotProcess,
} from './suspendTargets.js';

function proc(partial: Partial<SnapshotProcess> & Pick<SnapshotProcess, 'pid' | 'name'>): SnapshotProcess {
  return { ...partial };
}

describe('suspend target planning', () => {
  const root = proc({
    pid: 10,
    name: 'game',
    path: 'C:\\Games\\Foo\\game.exe',
    parentPid: 4,
    startedAtMs: 1000,
  });

  it('suspends the game and every descendant, including launchers and anti-cheat it spawned', () => {
    const processes = [
      root,
      proc({ pid: 11, name: 'helper', path: 'C:\\Games\\Foo\\bin\\helper.exe', parentPid: 10 }),
      proc({ pid: 12, name: 'steam', path: 'C:\\Program Files\\Steam\\steam.exe', parentPid: 10 }),
      proc({ pid: 13, name: 'easyanticheat', path: 'C:\\Games\\Foo\\EasyAntiCheat.exe', parentPid: 10 }),
      proc({ pid: 14, name: 'notepad', path: 'C:\\Windows\\notepad.exe', parentPid: 10 }),
      proc({ pid: 15, name: 'crashpad_handler', path: 'C:\\Games\\Foo\\crashpad_handler.exe', parentPid: 11 }),
      proc({ pid: 16, name: 'game', path: 'D:\\Elsewhere\\game.exe', parentPid: 11 }),
    ];

    const plan = planSuspendTargets(10, processes, {
      exePath: 'C:\\Games\\Foo\\game.exe',
      installationDirectory: 'C:\\Games\\Foo',
      selfPid: 99,
    });

    expect(plan.refusal).toBeUndefined();
    expect(plan.targets.map((target) => target.pid)).toEqual([10, 11, 15, 16, 12, 13, 14]);
  });

  it('refuses shell and system roots, and still suspends a store launcher or anti-cheat root', () => {
    expect(planSuspendTargets(20, [proc({ pid: 20, name: 'steam' })], {}).refusal).toBeUndefined();
    expect(planSuspendTargets(20, [proc({ pid: 20, name: 'steam' })], {}).targets.map((target) => target.pid)).toEqual([20]);
    expect(planSuspendTargets(21, [proc({ pid: 21, name: 'vgc.exe' })], {}).refusal).toBeUndefined();
    expect(planSuspendTargets(22, [proc({ pid: 22, name: 'explorer.exe' })], {}).refusal).toMatch(/shell or system/i);
    expect(planSuspendTargets(23, [proc({ pid: 23, name: 'ApplicationFrameHost.exe' })], {}).refusal).toMatch(/shell or system/i);
    expect(planSuspendTargets(24, [proc({ pid: 24, name: 'dwm' })], {}).refusal).toMatch(/shell or system/i);
    expect(planSuspendTargets(99, [proc({ pid: 99, name: 'game' })], { selfPid: 99 }).refusal).toMatch(/Onyx itself/);
    expect(planSuspendTargets(4, [], {}).refusal).toMatch(/system/i);
  });

  it('follows the foreground game instead of a tracked launcher, and leaves the shell alone', () => {
    expect(foregroundSuspendDecision('electron.exe', 50, 9)).toBe('retry-self');
    expect(foregroundSuspendDecision('game.exe', 9, 9)).toBe('retry-self');
    expect(foregroundSuspendDecision('explorer.exe', 80, 9)).toBe('refuse-shell');
    expect(foregroundSuspendDecision('game.exe', 30, 9)).toBe('suspend');

    const game = { exePath: 'C:\\Games\\Foo\\game.exe', installationDirectory: 'C:\\Games\\Foo' };
    expect(chooseSuspendRoot(20, {
      pid: 30,
      executable: 'game.exe',
      path: 'C:\\Games\\Foo\\bin\\game.exe',
    }, game)).toBe(30);
    expect(chooseSuspendRoot(20, {
      pid: 80,
      executable: 'explorer.exe',
      path: 'C:\\Windows\\explorer.exe',
    }, game)).toBe(20);
    expect(chooseSuspendRoot(20, {
      pid: 90,
      executable: 'notepad.exe',
      path: 'C:\\Windows\\notepad.exe',
    }, game)).toBe(20);
  });

  it('resumes only live processes whose creation time still matches', () => {
    const processes = [
      proc({ pid: 10, name: 'game', startedAtMs: 5_000 }),
      proc({ pid: 11, name: 'helper', startedAtMs: 9_000 }),
    ];
    const selected = selectResumeTargets([
      { pid: 10, startedAtMs: 5_000 },
      { pid: 11, startedAtMs: 1_000 },
      { pid: 12, startedAtMs: 1_000 },
    ], processes);
    expect(selected.map((target) => target.pid)).toEqual([10]);
  });
});

describe('process list parsing', () => {
  it('parses a single CIM object and common CreationDate shapes', () => {
    expect(parseWindowsProcessTime('/Date(1700000000000)/')).toBe(1700000000000);
    expect(parseWindowsProcessTime('20241022120000.000000+000')).toBe(Date.UTC(2024, 9, 22, 12, 0, 0));
    expect(parseWindowsProcessTime('2024-10-22T12:00:00.000Z')).toBe(Date.parse('2024-10-22T12:00:00.000Z'));

    const processes = parseCimProcessList(JSON.stringify({
      ProcessId: 10,
      Name: 'Game.exe',
      ExecutablePath: 'C:\\Games\\Foo\\Game.exe',
      ParentProcessId: 4,
      CreationDate: '/Date(1700000000000)/',
    }));
    expect(processes).toEqual([{
      pid: 10,
      name: 'game',
      path: 'C:\\Games\\Foo\\Game.exe',
      parentPid: 4,
      startedAtMs: 1700000000000,
    }]);
  });

  it('returns an empty list for blank or invalid CIM output and skips unusable rows', () => {
    expect(parseCimProcessList('')).toEqual([]);
    expect(parseCimProcessList('not-json')).toEqual([]);
    expect(parseCimProcessList(JSON.stringify([
      { ProcessId: 0, Name: 'system' },
      { ProcessId: 8, Name: 'ok.exe' },
    ]))).toEqual([expect.objectContaining({ pid: 8, name: 'ok' })]);
  });

  it('parses native suspend results from either a JSON object or an array', () => {
    expect(parseNativeActionResults('{"pid":10,"ok":true,"error":null}')).toEqual(new Map([[10, { ok: true }]]));
    const parsed = parseNativeActionResults('[{"pid":10,"ok":false,"error":"Access is denied"}]');
    expect(parsed.get(10)).toEqual({ ok: false, error: 'Access is denied' });
  });
});

describe('library process matching', () => {
  const processes = [
    proc({ pid: 1, name: 'crashpad_handler', path: 'C:\\Games\\Foo\\crashpad_handler.exe' }),
    proc({ pid: 2, name: 'realgame', path: 'C:\\Games\\Foo\\bin\\realgame.exe' }),
    proc({ pid: 3, name: 'game', path: 'D:\\Other\\game.exe' }),
    proc({ pid: 4, name: 'steam', path: 'C:\\Games\\Foo\\steam.exe' }),
    proc({ pid: 5, name: 'other', path: 'C:\\Games\\Foo2\\other.exe' }),
  ];

  it('prefers the executable name over a different process in the install directory', () => {
    const match = matchTrackedProcess(processes, { exePath: 'C:\\Games\\Foo\\game.exe', installationDirectory: 'C:\\Games\\Foo' });
    expect(match?.pid).toBe(3);
  });

  it('falls through to the install directory when the stored executable is not running, skipping helpers and launchers', () => {
    const match = matchTrackedProcess(processes, {
      exePath: 'C:\\Games\\Foo\\GameLauncher.exe',
      installationDirectory: 'C:\\Games\\Foo',
    });
    expect(match?.pid).toBe(2);
  });

  it('does not treat a directory prefix as the install directory', () => {
    expect(isPathInsideDirectory('C:\\Games\\Foo2\\other.exe', 'C:\\Games\\Foo')).toBe(false);
    expect(isPathInsideDirectory('C:\\Games\\Foo\\bin\\realgame.exe', 'C:\\Games\\Foo')).toBe(true);
  });
});

describe('shortcut target', () => {
  it('resumes the newest suspended game before suspending another', () => {
    const games = [
      { gameId: 'old', status: 'suspended' as const },
      { gameId: 'running', status: 'running' as const },
      { gameId: 'newest', status: 'suspended' as const },
    ];
    expect(pickShortcutTarget(games)?.game.gameId).toBe('newest');
  });

  it('suspends the most recently tracked running game', () => {
    const games = [
      { gameId: 'old', status: 'running' as const },
      { gameId: 'newest', status: 'running' as const },
    ];
    expect(pickShortcutTarget(games)).toEqual({ action: 'suspend', game: games[1] });
  });

  it('returns null when nothing is tracked', () => {
    expect(pickShortcutTarget([])).toBeNull();
  });
});

describe('process identity', () => {
  it('treats missing start times as not a mismatch and rejects a reused pid', () => {
    expect(isSameProcessStart(undefined, 10)).toBe(true);
    expect(isSameProcessStart(1_000, undefined)).toBe(true);
    expect(isSameProcessStart(1_000, 1_500)).toBe(true);
    expect(isSameProcessStart(1_000, 5_000)).toBe(false);
  });
});
