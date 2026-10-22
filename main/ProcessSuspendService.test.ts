import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessSuspendService } from './ProcessSuspendService.js';
import type { NativeSuspendPort } from './win32NativeSuspend.js';

interface CimProcess {
  ProcessId: number;
  Name: string;
  ExecutablePath?: string | null;
  ParentProcessId?: number;
  CreationDate?: string | null;
}

function cim(options: {
  pid: number;
  name: string;
  path?: string;
  parentPid?: number;
  startedAtMs?: number;
}): CimProcess {
  return {
    ProcessId: options.pid,
    Name: options.name.toLowerCase().endsWith('.exe') ? options.name : `${options.name}.exe`,
    ExecutablePath: options.path ?? null,
    ParentProcessId: options.parentPid ?? 1,
    CreationDate: options.startedAtMs != null ? `/Date(${options.startedAtMs})/` : null,
  };
}

function targetPids(script: string): number[] {
  const match = script.match(/\$targetPids = @\(([^)]*)\)/);
  if (!match?.[1]?.trim()) return [];
  return match[1].split(',').map((value) => Number(value.trim()));
}

function createHarness(options?: {
  processes?: CimProcess[];
  persistencePath?: string;
  failNative?: boolean;
  failCmdlet?: boolean;
  holdFirstNative?: { gate: Promise<void>; started: { count: number } };
  native?: NativeSuspendPort | null;
}) {
  const calls: string[] = [];
  const processes = options?.processes ?? [];
  const svc = new ProcessSuspendService(async (_command, args) => {
    const script = args.join(' ');
    calls.push(script);
    if (script.includes('Win32_Process')) {
      return { stdout: JSON.stringify(processes), stderr: '', code: 0 };
    }
    if (script.includes('ShowWindow')) {
      return { stdout: '', stderr: '', code: 0 };
    }
    if (script.includes('NtSuspendProcess') || script.includes('NtResumeProcess')) {
      if (options?.holdFirstNative && script.includes('NtSuspendProcess') && options.holdFirstNative.started.count === 0) {
        options.holdFirstNative.started.count += 1;
        await options.holdFirstNative.gate;
      }
      if (options?.failNative) {
        throw Object.assign(new Error('Command failed'), { stdout: '', stderr: 'Simulated native failure', code: 1 });
      }
      return {
        stdout: JSON.stringify(targetPids(script).map((pid) => ({ pid, ok: true, error: null }))),
        stderr: '',
        code: 0,
      };
    }
    if (script.includes('Suspend-Process') || script.includes('Resume-Process')) {
      if (options?.failCmdlet) {
        throw Object.assign(new Error('Command failed'), { stdout: '', stderr: 'Access is denied', code: 1 });
      }
      return { stdout: 'ok', stderr: '', code: 0 };
    }
    throw new Error(`Unexpected command: ${script.slice(0, 160)}`);
  }, { persistencePath: options?.persistencePath, minimizeDelayMs: 0, native: options?.native });
  (svc as unknown as { isWindows: boolean }).isWindows = true;
  return { svc, calls, processes };
}

describe('ProcessSuspendService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'onyx-suspend-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('rejects an invalid pid before invoking PowerShell', async () => {
    const { svc, calls } = createHarness();
    await expect(svc.suspendProcess(-1)).rejects.toThrow('Invalid PID');
    expect(calls).toHaveLength(0);
  });

  it('falls back to the Suspend-Process and Resume-Process cmdlets when the native call fails', async () => {
    const { svc, calls } = createHarness({ failNative: true });
    await expect(svc.suspendProcess(12345)).resolves.toBe(true);
    await expect(svc.resumeProcess(12345)).resolves.toBe(true);
    expect(calls.some((call) => call.includes('NtSuspendProcess'))).toBe(true);
    expect(calls.some((call) => call.includes('Suspend-Process -Id 12345'))).toBe(true);
    expect(calls.some((call) => call.includes('NtResumeProcess'))).toBe(true);
    expect(calls.some((call) => call.includes('Resume-Process -Id 12345'))).toBe(true);
  });

  it('suspends the game and its own child process, and records them for recovery', async () => {
    const started = 1_700_000_000_000;
    const persistencePath = path.join(tempDir, 'suspended-processes.json');
    const { svc, calls } = createHarness({
      persistencePath,
      processes: [
        cim({ pid: 10, name: 'game', path: 'C:\\Games\\Foo\\game.exe', parentPid: 4, startedAtMs: started }),
        cim({ pid: 11, name: 'helper', path: 'C:\\Games\\Foo\\helper.exe', parentPid: 10, startedAtMs: started + 5 }),
        cim({ pid: 12, name: 'steam', path: 'C:\\Program Files\\Steam\\steam.exe', parentPid: 10, startedAtMs: started }),
        cim({ pid: 13, name: 'EasyAntiCheat', path: 'C:\\Games\\Foo\\EasyAntiCheat.exe', parentPid: 10, startedAtMs: started }),
        cim({ pid: 14, name: 'notepad', path: 'C:\\Windows\\notepad.exe', parentPid: 10, startedAtMs: started }),
      ],
    });
    svc.trackLaunchedGame('g', 10, 'Foo', 'C:\\Games\\Foo\\game.exe', 'C:\\Games\\Foo', undefined, undefined, started);

    const suspended = await svc.suspendGame('g');
    expect(suspended).toEqual({ success: true });
    const nativePids = calls
      .filter((call) => call.includes('NtSuspendProcess'))
      .flatMap((call) => targetPids(call));
    expect(nativePids).toEqual([10, 11, 12, 13, 14]);

    const running = await svc.getRunningGames();
    expect(running).toEqual([expect.objectContaining({ gameId: 'g', pid: 10, status: 'suspended' })]);

    const persisted = JSON.parse(readFileSync(persistencePath, 'utf8')) as Array<{ targets: Array<{ pid: number }> }>;
    expect(persisted[0].targets.map((target) => target.pid)).toEqual([10, 11, 12, 13, 14]);
  });

  it('does not suspend File Explorer', async () => {
    const { svc, calls } = createHarness({
      processes: [cim({ pid: 20, name: 'explorer', path: 'C:\\Windows\\explorer.exe', startedAtMs: 50 })],
    });
    svc.trackLaunchedGame('shell', 20, 'Explorer', 'C:\\Windows\\explorer.exe', undefined, undefined, undefined, 50);
    const result = await svc.suspendGame('shell');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/shell or system/i);
    expect(calls.some((call) => call.includes('NtSuspendProcess'))).toBe(false);
  });

  it('does not suspend or resume a pid that has been reused', async () => {
    const processes = [
      cim({ pid: 10, name: 'game', path: 'C:\\Games\\Foo\\game.exe', startedAtMs: 1_000 }),
    ];
    const { svc, calls } = createHarness({ processes });
    svc.trackLaunchedGame('g', 10, 'Foo', 'C:\\Games\\Foo\\game.exe', 'C:\\Games\\Foo', undefined, undefined, 1_000);
    expect((await svc.suspendGame('g')).success).toBe(true);

    processes.splice(0, processes.length, cim({
      pid: 10,
      name: 'notepad',
      path: 'C:\\Windows\\notepad.exe',
      startedAtMs: 9_000_000,
    }));
    const resumed = await svc.resumeGame('g');
    expect(resumed).toEqual({ success: false, error: 'Game process is no longer running' });
    expect(calls.some((call) => call.includes('::NtResumeProcess'))).toBe(false);
    expect(await svc.getRunningGames()).toEqual([]);
  });

  it('resumes a still-frozen child when the suspended root has exited', async () => {
    const started = 5_000;
    const processes = [
      cim({ pid: 10, name: 'game', path: 'C:\\Games\\Foo\\game.exe', parentPid: 4, startedAtMs: started }),
      cim({ pid: 11, name: 'helper', path: 'C:\\Games\\Foo\\helper.exe', parentPid: 10, startedAtMs: started }),
    ];
    const { svc, calls } = createHarness({ processes });
    svc.trackLaunchedGame('g', 10, 'Foo', 'C:\\Games\\Foo\\game.exe', 'C:\\Games\\Foo', undefined, undefined, started);
    expect((await svc.suspendGame('g')).success).toBe(true);

    processes.splice(0, processes.length, processes[1]);
    const resumed = await svc.resumeGame('g');
    expect(resumed.success).toBe(false);
    expect(resumed.error).toMatch(/no longer running/);
    const resumeScript = calls.filter((call) => call.includes('NtResumeProcess')).at(-1) ?? '';
    expect(targetPids(resumeScript)).toEqual([11]);
    expect(svc.hasSuspendedGames()).toBe(false);
  });

  it('resumes suspended processes on shutdown and clears the recovery file', async () => {
    const persistencePath = path.join(tempDir, 'suspended-processes.json');
    const started = 8_000;
    const { svc } = createHarness({
      persistencePath,
      processes: [
        cim({ pid: 10, name: 'game', path: 'C:\\Games\\Foo\\game.exe', parentPid: 4, startedAtMs: started }),
        cim({ pid: 11, name: 'helper', path: 'C:\\Games\\Foo\\helper.exe', parentPid: 10, startedAtMs: started }),
      ],
    });
    svc.trackLaunchedGame('g', 10, 'Foo', 'C:\\Games\\Foo\\game.exe', 'C:\\Games\\Foo', undefined, undefined, started);
    expect((await svc.suspendGame('g')).success).toBe(true);
    expect(svc.hasSuspendedGames()).toBe(true);

    await svc.shutdown();
    expect(svc.hasSuspendedGames()).toBe(false);
    expect(JSON.parse(readFileSync(persistencePath, 'utf8'))).toEqual([]);
    const running = await svc.getRunningGames();
    expect(running[0]).toEqual(expect.objectContaining({ status: 'running', pid: 10 }));
  });

  it('resumes a matching process from the previous session and skips a reused pid', async () => {
    const persistencePath = path.join(tempDir, 'suspended-processes.json');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(persistencePath, JSON.stringify([
      {
        gameId: 'g',
        title: 'Foo',
        suspendedAt: 1,
        exePath: 'C:\\Games\\Foo\\game.exe',
        targets: [
          { pid: 10, startedAtMs: 4_000 },
          { pid: 99, startedAtMs: 1 },
        ],
      },
    ]));
    const { svc, calls } = createHarness({
      persistencePath,
      processes: [
        cim({ pid: 10, name: 'game', path: 'C:\\Games\\Foo\\game.exe', startedAtMs: 4_000 }),
        cim({ pid: 99, name: 'other', path: 'C:\\Windows\\other.exe', startedAtMs: 9_000 }),
      ],
    });

    await svc.recoverOrphanedSuspensions();
    const resumeScript = calls.find((call) => call.includes('NtResumeProcess')) ?? '';
    expect(targetPids(resumeScript)).toEqual([10]);
    expect(JSON.parse(readFileSync(persistencePath, 'utf8'))).toEqual([]);
    expect(await svc.getRunningGames()).toEqual([
      expect.objectContaining({ gameId: 'g', pid: 10, status: 'running' }),
    ]);
  });

  it('does not replace a suspended game with a different process id', async () => {
    const started = 3_000;
    const { svc } = createHarness({
      processes: [cim({ pid: 10, name: 'game', path: 'C:\\Games\\Foo\\game.exe', startedAtMs: started })],
    });
    svc.trackLaunchedGame('g', 10, 'Foo', 'C:\\Games\\Foo\\game.exe', 'C:\\Games\\Foo', undefined, undefined, started);
    expect((await svc.suspendGame('g')).success).toBe(true);
    expect(svc.trackLaunchedGame('g', 77, 'Foo', 'C:\\Games\\Foo\\game.exe', 'C:\\Games\\Foo')).toBe(false);
    expect((await svc.getRunningGames())[0]).toEqual(expect.objectContaining({ pid: 10, status: 'suspended' }));
  });

  it('serializes a second suspend so the process is not suspended twice', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = { count: 0 };
    const { svc } = createHarness({
      processes: [cim({ pid: 50, name: 'game', path: 'C:\\Games\\Foo\\game.exe', startedAtMs: 10 })],
      holdFirstNative: { gate, started },
    });
    svc.trackLaunchedGame('g', 50, 'Foo', 'C:\\Games\\Foo\\game.exe', 'C:\\Games\\Foo', undefined, undefined, 10);

    const first = svc.suspendGame('g');
    for (let attempt = 0; attempt < 20 && started.count < 1; attempt += 1) {
      await Promise.resolve();
    }
    expect(started.count).toBe(1);
    const second = svc.suspendGame('g');
    release();
    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toEqual({ success: true });
    expect(secondResult).toEqual({ success: false, error: 'Game is already suspended' });
  });

  it('restores the window when suspend fails', async () => {
    const { svc, calls } = createHarness({
      failNative: true,
      failCmdlet: true,
      processes: [cim({ pid: 10, name: 'game', path: 'C:\\Games\\Foo\\game.exe', startedAtMs: 10 })],
    });
    svc.trackLaunchedGame('g', 10, 'Foo', 'C:\\Games\\Foo\\game.exe', 'C:\\Games\\Foo', undefined, undefined, 10);
    const result = await svc.suspendGame('g');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Administrator/);
    expect(calls.filter((call) => call.includes('ShowWindow'))).toHaveLength(2);
    expect(svc.hasSuspendedGames()).toBe(false);
  });

  it('tracks a game from its install directory when the stored executable name is not running', async () => {
    const { svc } = createHarness({
      processes: [
        cim({ pid: 1, name: 'crashpad_handler', path: 'C:\\Games\\Foo\\crashpad_handler.exe' }),
        cim({ pid: 2, name: 'realgame', path: 'C:\\Games\\Foo\\bin\\realgame.exe', startedAtMs: 20 }),
      ],
    });
    const tracked = await svc.discoverRunningGamesFromLibrary([
      { id: 'g', title: 'Foo', exePath: 'C:\\Games\\Foo\\GameLauncher.exe', installationDirectory: 'C:\\Games\\Foo' },
    ]);
    expect(tracked).toBe(1);
    expect(await svc.getRunningGames()).toEqual([
      expect.objectContaining({ gameId: 'g', pid: 2, status: 'running' }),
    ]);
  });

  it('times out a hung command instead of waiting forever', async () => {
    const svc = new ProcessSuspendService();
    const result = await (svc as unknown as {
      runCommandSafe: (command: string, args: string[], opts?: { timeout?: number }) => Promise<{ stdout: string }>;
    }).runCommandSafe(process.execPath, ['-e', 'process.stdout.write("ok")'], { timeout: 5000 });
    expect(result.stdout).toBe('ok');

    await expect((svc as unknown as {
      runCommandSafe: (command: string, args: string[], opts?: { timeout?: number }) => Promise<unknown>;
    }).runCommandSafe(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { timeout: 300 })).rejects.toThrow(/timed out/);
  });

  it('suspends the foreground window with a direct ntdll call, then its children, and the next press resumes them', async () => {
    const suspended: number[] = [];
    const resumed: number[] = [];
    const windows: Array<{ hwnd: number; command: number }> = [];
    let foreground = { pid: process.pid, hwnd: 1, executable: 'electron.exe', path: process.execPath };
    const native: NativeSuspendPort = {
      suspend(pid) { suspended.push(pid); },
      resume(pid) { resumed.push(pid); },
      childPids(parentPid) { return parentPid === 42 ? [43] : []; },
      foreground() { return foreground; },
      showWindow(hwnd, command) { windows.push({ hwnd, command }); },
    };
    const { svc, calls } = createHarness({
      native,
      processes: [
        cim({ pid: 42, name: 'game', path: 'C:\\Games\\Foo\\game.exe', parentPid: 4, startedAtMs: 100 }),
        cim({ pid: 43, name: 'helper', path: 'C:\\Games\\Foo\\helper.exe', parentPid: 42, startedAtMs: 120 }),
      ],
    });

    let hidden = 0;
    const first = await svc.toggleForeground(() => {
      hidden += 1;
      foreground = { pid: 42, hwnd: 7, executable: 'game.exe', path: 'C:\\Games\\Foo\\game.exe' };
    });
    expect(hidden).toBe(1);
    expect(first).toEqual(expect.objectContaining({ success: true, action: 'suspend' }));
    expect(windows).toEqual([{ hwnd: 7, command: 11 }]);
    expect(suspended).toEqual([42, 43]);
    expect(calls.some((call) => call.includes('NtSuspendProcess'))).toBe(false);

    const second = await svc.toggleForeground();
    expect(second).toEqual(expect.objectContaining({ success: true, action: 'resume' }));
    expect(resumed).toEqual([42, 43]);
    expect(svc.hasSuspendedGames()).toBe(false);
  });

  it('refuses to suspend Explorer from the foreground hotkey', async () => {
    const suspended: number[] = [];
    const native: NativeSuspendPort = {
      suspend(pid) { suspended.push(pid); },
      resume() {},
      childPids() { return []; },
      foreground() { return { pid: 80, hwnd: 3, executable: 'explorer.exe', path: 'C:\\Windows\\explorer.exe' }; },
      showWindow() {},
    };
    const { svc } = createHarness({ native });
    const result = await svc.toggleForeground();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/File Explorer/);
    expect(suspended).toEqual([]);
  });

  it('keeps a failed hotkey resume in the recovery file and does not suspend that process again', async () => {
    const suspended: number[] = [];
    let foregroundPid = 42;
    const native: NativeSuspendPort = {
      suspend(pid) { suspended.push(pid); },
      resume() { throw new Error('Access is denied'); },
      childPids() { return []; },
      foreground() { return { pid: foregroundPid, hwnd: 7, executable: 'game.exe', path: 'C:\\Games\\Foo\\game.exe' }; },
      showWindow() {},
    };
    const persistencePath = path.join(tempDir, 'suspended-processes.json');
    const processes = [cim({ pid: 42, name: 'game', path: 'C:\\Games\\Foo\\game.exe', startedAtMs: 100 })];
    const { svc } = createHarness({
      native,
      persistencePath,
      failNative: true,
      failCmdlet: true,
      processes,
    });
    expect((await svc.toggleForeground()).success).toBe(true);
    expect(suspended).toEqual([42]);
    const resumed = await svc.toggleForeground();
    expect(resumed.success).toBe(false);
    expect(resumed.action).toBe('resume');
    expect(svc.hasSuspendedGames()).toBe(false);
    expect(await svc.getRunningGames()).toEqual([]);

    const persisted = JSON.parse(readFileSync(persistencePath, 'utf8')) as Array<{ gameId: string; targets: Array<{ pid: number }> }>;
    expect(persisted.map((record) => record.gameId)).not.toContain('foreground-window');
    expect(persisted.flatMap((record) => record.targets.map((target) => target.pid))).toEqual([42]);

    const again = await svc.toggleForeground();
    expect(again.action).toBe('resume');
    expect(again.success).toBe(false);
    expect(suspended).toEqual([42]);

    foregroundPid = 77;
    processes.push(cim({ pid: 77, name: 'other', path: 'C:\\Games\\Other\\other.exe', startedAtMs: 200 }));
    const other = await svc.toggleForeground();
    expect(other).toEqual(expect.objectContaining({ success: true, action: 'suspend' }));
    expect(suspended).toEqual([42, 77]);

    const recovered = new ProcessSuspendService(async (_command, args) => {
      const script = args.join(' ');
      if (script.includes('Win32_Process')) {
        return { stdout: JSON.stringify(processes), stderr: '', code: 0 };
      }
      if (script.includes('NtResumeProcess')) {
        return {
          stdout: JSON.stringify(targetPids(script).map((pid) => ({ pid, ok: true, error: null }))),
          stderr: '',
          code: 0,
        };
      }
      throw new Error(`Unexpected recovery command: ${script.slice(0, 160)}`);
    }, { persistencePath, minimizeDelayMs: 0, native: null });
    (recovered as unknown as { isWindows: boolean }).isWindows = true;
    await recovered.recoverOrphanedSuspensions();
    const afterRecovery = JSON.parse(readFileSync(persistencePath, 'utf8')) as Array<{ targets: Array<{ pid: number }> }>;
    expect(afterRecovery.flatMap((record) => record.targets.map((target) => target.pid))).not.toContain(42);
  });

  it('resumes a tracked suspended game from the hotkey instead of suspending it again', async () => {
    const suspended: number[] = [];
    const resumed: number[] = [];
    const native: NativeSuspendPort = {
      suspend(pid) { suspended.push(pid); },
      resume(pid) { resumed.push(pid); },
      childPids() { return []; },
      foreground() { return { pid: 42, hwnd: 7, executable: 'game.exe', path: 'C:\\Games\\Foo\\game.exe' }; },
      showWindow() {},
    };
    const { svc } = createHarness({
      native,
      processes: [cim({ pid: 42, name: 'game', path: 'C:\\Games\\Foo\\game.exe', startedAtMs: 100 })],
    });
    svc.trackLaunchedGame('g', 42, 'Foo', 'C:\\Games\\Foo\\game.exe', 'C:\\Games\\Foo', undefined, undefined, 100);
    expect((await svc.suspendGame('g')).success).toBe(true);
    expect(suspended).toEqual([42]);
    const hotkey = await svc.toggleForeground();
    expect(hotkey).toEqual(expect.objectContaining({ success: true, action: 'resume' }));
    expect(suspended).toEqual([42]);
    expect(resumed).toEqual([42]);
    expect(svc.hasSuspendedGames()).toBe(false);
  });

  it('keeps the CIM child list when the process snapshot fails', async () => {
    const suspended: number[] = [];
    const native: NativeSuspendPort = {
      suspend(pid) { suspended.push(pid); },
      resume() {},
      childPids() { throw new Error('snapshot failed'); },
      foreground() { return null; },
      showWindow() {},
    };
    const { svc } = createHarness({
      native,
      processes: [
        cim({ pid: 10, name: 'game', path: 'C:\\Games\\Foo\\game.exe', parentPid: 4, startedAtMs: 100 }),
        cim({ pid: 11, name: 'helper', path: 'C:\\Games\\Foo\\helper.exe', parentPid: 10, startedAtMs: 110 }),
      ],
    });
    svc.trackLaunchedGame('g', 10, 'Foo', 'C:\\Games\\Foo\\game.exe', 'C:\\Games\\Foo', undefined, undefined, 100);
    expect((await svc.suspendGame('g')).success).toBe(true);
    expect(suspended).toEqual([10, 11]);
  });

  it('switches a tracked launcher pid to the foreground game before suspending', async () => {
    const suspended: number[] = [];
    const native: NativeSuspendPort = {
      suspend(pid) { suspended.push(pid); },
      resume() {},
      childPids() { return []; },
      foreground() {
        return { pid: 30, hwnd: 9, executable: 'game.exe', path: 'C:\\Games\\Foo\\game.exe' };
      },
      showWindow() {},
    };
    const { svc } = createHarness({
      native,
      processes: [
        cim({ pid: 20, name: 'steam', path: 'C:\\Program Files\\Steam\\steam.exe', startedAtMs: 50 }),
        cim({ pid: 30, name: 'game', path: 'C:\\Games\\Foo\\game.exe', parentPid: 20, startedAtMs: 80 }),
      ],
    });
    svc.trackLaunchedGame('g', 20, 'Foo', 'C:\\Games\\Foo\\game.exe', 'C:\\Games\\Foo', undefined, undefined, 50);
    expect((await svc.suspendGame('g')).success).toBe(true);
    expect(suspended).toEqual([30]);
    expect((await svc.getRunningGames())[0]).toEqual(expect.objectContaining({ pid: 30, status: 'suspended' }));
  });
});
