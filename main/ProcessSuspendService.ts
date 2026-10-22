import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { platform } from 'node:os';
import { isProcessAlive } from './processAlive.js';
import { loadWin32SuspendPort, type NativeSuspendPort } from './win32NativeSuspend.js';
import {
  basenameWindows,
  isDeniedProcessName,
  isPathInsideDirectory,
  isSameProcessStart,
  pathsEqual,
  matchTrackedProcess,
  normalizeProcessName,
  parseCimProcessList,
  chooseSuspendRoot,
  foregroundSuspendDecision,
  parseNativeActionResults,
  planSuspendTargets,
  selectResumeTargets,
  SHELL_AND_LAUNCHER_PROCESS_NAMES,
  ANTICHEAT_PROCESS_NAMES,
  type SnapshotProcess,
  type SuspendedProcessTarget,
} from './suspendTargets.js';

type ExecRunner = (command: string, args: string[], opts?: { timeout?: number }) => Promise<{ stdout: string; stderr: string; code: number }>;

export interface ProcessInfo {
  pid: number;
  gameId: string;
  title: string;
  exePath?: string;
  installationDirectory?: string;
  platform?: string;
  source?: string;
  status: 'running' | 'suspended' | 'stopped';
  suspendedAt?: number;
  /** Creation time of `pid`, used to detect PID reuse. */
  startedAtMs?: number;
  /** Processes actually frozen for this game, root first. Resume uses this list, not a fresh tree walk. */
  suspendedTargets?: SuspendedProcessTarget[];
}

export interface RunningGame {
  gameId: string;
  title: string;
  pid: number;
  status: 'running' | 'suspended';
  exePath?: string;
}

interface DiscoverableGame {
  id: string;
  title: string;
  exePath?: string;
  installationDirectory?: string;
}

interface LaunchTrackingOptions {
  gameId: string;
  title: string;
  exePath?: string;
  installationDirectory?: string;
  platform?: string;
  source?: string;
  knownPid?: number;
  baselinePids?: number[];
}

interface PersistedSuspendRecord {
  gameId: string;
  title: string;
  suspendedAt: number;
  exePath?: string;
  installationDirectory?: string;
  platform?: string;
  source?: string;
  targets: SuspendedProcessTarget[];
}

interface ServiceOptions {
  persistencePath?: string;
  /** Nyrna waits 500ms after SW_FORCEMINIMIZE. Tests pass 0. */
  minimizeDelayMs?: number;
  native?: NativeSuspendPort | null;
}

interface ActionOutcome {
  succeeded: SnapshotProcess[];
  error?: string;
}

export class ProcessSuspendService {
  private runningGames: Map<string, ProcessInfo> = new Map();
  private suspendedGames: Set<string> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isWindows: boolean;
  private execRunner: ExecRunner | null = null;
  private launchTrackingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private operationTails: Map<string, Promise<void>> = new Map();
  private persistencePath: string | null;
  private sweepInFlight = false;
  private minimizeDelayMs: number;
  private native: NativeSuspendPort | null;
  /** Hotkey resumes that failed. Kept out of the hotkey slot, still written to the recovery file. */
  private detachedRecoveries: PersistedSuspendRecord[] = [];

  private runCommandSafe: ExecRunner = (command: string, args: string[] = [], opts: { timeout?: number } = {}) => {
    if (this.execRunner) return this.execRunner(command, args, opts);

    const timeoutMs = typeof opts.timeout === 'number' && opts.timeout > 0 ? opts.timeout : undefined;
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { shell: false, windowsHide: true });
      let stdout = '';
      let stderr = '';
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        fn();
      };
      const timer = timeoutMs
        ? setTimeout(() => {
          child.kill();
          finish(() => {
            reject(Object.assign(new Error(`Command timed out after ${timeoutMs}ms`), { stdout, stderr, code: null }));
          });
        }, timeoutMs)
        : null;

      child.stdout?.on('data', (data) => { stdout += data.toString(); });
      child.stderr?.on('data', (data) => { stderr += data.toString(); });
      child.on('error', (err) => finish(() => reject(err)));
      child.on('close', (code) => {
        finish(() => {
          if (code === 0) resolve({ stdout, stderr, code: code || 0 });
          else reject(Object.assign(new Error('Command failed'), { stdout, stderr, code }));
        });
      });
    });
  };

  private validatePid(pid: number) {
    if (!Number.isInteger(pid) || pid <= 0 || pid > 2147483647) {
      throw new Error('Invalid PID');
    }
  }

  private async runPowerShell(script: string, timeout: number = 5000): Promise<{ stdout: string; stderr: string; code: number }> {
    const args = ['-ExecutionPolicy', 'Bypass', '-NoProfile', '-Command', script];
    try {
      return await this.runCommandSafe('powershell.exe', args, { timeout });
    } catch (firstError) {
      if ((firstError as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        throw firstError;
      }
      return this.runCommandSafe('powershell', args, { timeout });
    }
  }

  private stopLaunchTrackingSession(gameId: string): void {
    const interval = this.launchTrackingIntervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.launchTrackingIntervals.delete(gameId);
    }
  }

  private scoreProcessCandidate(
    processInfo: SnapshotProcess,
    options: LaunchTrackingOptions,
  ): number {
    const processName = normalizeProcessName(processInfo.name);
    const processPath = processInfo.path?.toLowerCase();
    const exePath = options.exePath?.toLowerCase();
    const installDir = options.installationDirectory?.toLowerCase().replace(/\//g, '\\');
    const exeBaseName = exePath ? basenameWindows(exePath).toLowerCase() : undefined;
    const exeWithoutExt = exeBaseName?.replace(/\.exe$/i, '');
    const isXbox = (options.platform || '').toLowerCase() === 'xbox' || (options.source || '').toLowerCase() === 'xbox';

    let score = 0;

    if (processPath && exePath && processPath === exePath) {
      score += 150;
    }

    if (processPath && exeBaseName && basenameWindows(processPath).toLowerCase() === exeBaseName) {
      score += 120;
    }

    if (exeWithoutExt && processName === exeWithoutExt) {
      score += 110;
    }

    if (processPath && installDir && isPathInsideDirectory(processInfo.path, options.installationDirectory)) {
      score += 130;
    }

    if (isXbox && processPath && processPath.includes('windowsapps')) {
      score += 35;
    }

    const titleTokens = options.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length >= 4)
      .slice(0, 4);

    if (titleTokens.length > 0) {
      const haystack = `${processName} ${processPath || ''}`;
      for (const token of titleTokens) {
        if (haystack.includes(token)) {
          score += 15;
        }
      }
    }

    if (SHELL_AND_LAUNCHER_PROCESS_NAMES.has(processName) || ANTICHEAT_PROCESS_NAMES.has(processName)) {
      score -= 120;
    }

    return score;
  }

  private withGameLock<T>(gameId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.operationTails.get(gameId) ?? Promise.resolve();
    const run = previous.then(fn);
    const tail = run.then(() => undefined, () => undefined);
    this.operationTails.set(gameId, tail);
    void tail.finally(() => {
      if (this.operationTails.get(gameId) === tail) {
        this.operationTails.delete(gameId);
      }
    });
    return run;
  }

  private readPersisted(): PersistedSuspendRecord[] {
    if (!this.persistencePath || !existsSync(this.persistencePath)) return [];
    try {
      const parsed = JSON.parse(readFileSync(this.persistencePath, 'utf8')) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry): entry is PersistedSuspendRecord => {
        if (!entry || typeof entry !== 'object') return false;
        const record = entry as PersistedSuspendRecord;
        return typeof record.gameId === 'string' && typeof record.title === 'string' && Array.isArray(record.targets);
      });
    } catch (error) {
      console.error('[Suspend] Ignoring unreadable suspended-process record:', error);
      return [];
    }
  }

  private writePersisted(records: PersistedSuspendRecord[]): void {
    if (!this.persistencePath) return;
    try {
      mkdirSync(path.dirname(this.persistencePath), { recursive: true });
      const temporary = `${this.persistencePath}.tmp`;
      writeFileSync(temporary, JSON.stringify(records), 'utf8');
      renameSync(temporary, this.persistencePath);
    } catch (error) {
      console.error('[Suspend] Failed to persist suspended processes:', error);
    }
  }

  private recordFromGame(info: ProcessInfo): PersistedSuspendRecord {
    const targets = info.suspendedTargets ?? [{ pid: info.pid, startedAtMs: info.startedAtMs }];
    return {
      gameId: info.gameId,
      title: info.title,
      suspendedAt: info.suspendedAt ?? Date.now(),
      exePath: info.exePath,
      installationDirectory: info.installationDirectory,
      platform: info.platform,
      source: info.source,
      targets,
    };
  }

  private persistSuspendedGames(): void {
    const records: PersistedSuspendRecord[] = [];
    for (const gameId of this.suspendedGames) {
      const info = this.runningGames.get(gameId);
      if (!info) continue;
      records.push(this.recordFromGame(info));
    }
    const held = new Set(records.flatMap((record) => record.targets.map((target) => `${target.pid}:${target.startedAtMs ?? ''}`)));
    for (const detached of this.detachedRecoveries) {
      const novel = detached.targets.some((target) => !held.has(`${target.pid}:${target.startedAtMs ?? ''}`));
      if (novel) records.push(detached);
    }
    this.writePersisted(records);
  }

  private forgetGame(gameId: string): void {
    this.runningGames.delete(gameId);
    this.suspendedGames.delete(gameId);
    this.persistSuspendedGames();
  }

  /**
   * Drop the foreground hotkey slot without deleting its paused processes from the
   * recovery file. The next press is free to pause a different window. A press on
   * one of these processes resumes it instead of suspending it a second time.
   */
  private releaseHotkeySlotKeepRecovery(): void {
    const info = this.runningGames.get('foreground-window');
    if (info?.status === 'suspended') {
      const targets = (info.suspendedTargets ?? [{ pid: info.pid, startedAtMs: info.startedAtMs }])
        .filter((target) => Number.isInteger(target.pid) && target.pid > 0);
      if (targets.length > 0) {
        const record = this.recordFromGame({ ...info, gameId: `foreground-recovery-${info.pid}`, suspendedTargets: targets });
        this.detachedRecoveries = this.detachedRecoveries.filter((entry) =>
          !entry.targets.some((target) => targets.some((kept) => kept.pid === target.pid && kept.startedAtMs === target.startedAtMs)),
        );
        this.detachedRecoveries.push(record);
      }
    }
    this.runningGames.delete('foreground-window');
    this.suspendedGames.delete('foreground-window');
    this.persistSuspendedGames();
  }

  private recordMatchesLivePid(record: PersistedSuspendRecord, pid: number, processes: SnapshotProcess[]): boolean {
    const target = record.targets.find((entry) => entry.pid === pid);
    if (!target) return false;
    if (processes.length === 0) return true;
    const live = processes.find((entry) => entry.pid === pid);
    if (!live) return false;
    return isSameProcessStart(target.startedAtMs, live.startedAtMs);
  }

  private async suspensionRecordingPid(pid: number): Promise<PersistedSuspendRecord | null> {
    const processes = await this.getAllProcesses();
    const records = [...this.detachedRecoveries];
    for (const gameId of this.suspendedGames) {
      const info = this.runningGames.get(gameId);
      if (info?.status === 'suspended') records.push(this.recordFromGame(info));
    }
    return records.find((record) => this.recordMatchesLivePid(record, pid, processes)) ?? null;
  }

  private async resumeRecordedSuspension(record: PersistedSuspendRecord): Promise<{ success: boolean; error?: string }> {
    const inMemory = this.runningGames.get(record.gameId);
    if (inMemory?.status === 'suspended') {
      return this.resumeGameUnlocked(record.gameId);
    }

    this.detachedRecoveries = this.detachedRecoveries.filter((entry) => entry.gameId !== record.gameId);
    const root = record.targets[0];
    this.runningGames.set(record.gameId, {
      pid: root?.pid ?? 0,
      gameId: record.gameId,
      title: record.title,
      exePath: record.exePath,
      installationDirectory: record.installationDirectory,
      platform: record.platform,
      source: record.source,
      status: 'suspended',
      suspendedAt: record.suspendedAt,
      startedAtMs: root?.startedAtMs,
      suspendedTargets: record.targets,
    });
    this.suspendedGames.add(record.gameId);
    const result = await this.resumeGameUnlocked(record.gameId);
    const info = this.runningGames.get(record.gameId);
    if (result.success || info?.status !== 'suspended') {
      this.runningGames.delete(record.gameId);
      this.suspendedGames.delete(record.gameId);
      this.persistSuspendedGames();
      return result;
    }
    this.detachedRecoveries.push(this.recordFromGame(info));
    this.runningGames.delete(record.gameId);
    this.suspendedGames.delete(record.gameId);
    this.persistSuspendedGames();
    return result;
  }

  startLaunchTrackingSession(options: LaunchTrackingOptions): void {
    if (!this.isWindows) {
      return;
    }

    const existing = this.runningGames.get(options.gameId);
    if (existing?.status === 'suspended' && existing.pid !== options.knownPid) {
      console.warn(`[Suspend] ${options.title} is suspended (PID ${existing.pid}); not replacing it with a new process`);
      return;
    }

    this.stopLaunchTrackingSession(options.gameId);

    if (options.knownPid && Number.isInteger(options.knownPid) && options.knownPid > 0) {
      this.trackLaunchedGame(
        options.gameId,
        options.knownPid,
        options.title,
        options.exePath,
        options.installationDirectory,
        options.platform,
        options.source,
      );
    }

    const baselinePids = new Set(options.baselinePids || []);
    let attempts = 0;
    const maxAttempts = 30;

    // Each tick shells out to PowerShell (Get-CimInstance Win32_Process), which routinely
    // takes longer than the 1500ms period on a loaded machine. Without this guard the ticks
    // overlap and PowerShell processes pile up.
    let tickInFlight = false;

    const interval = setInterval(async () => {
      if (tickInFlight) return;
      tickInFlight = true;
      attempts += 1;

      try {
        const processes = await this.getAllProcesses();
        let bestCandidate: (SnapshotProcess & { score: number }) | null = null;

        for (const processInfo of processes) {
          if (baselinePids.has(processInfo.pid)) {
            continue;
          }

          const score = this.scoreProcessCandidate(processInfo, options);
          if (!bestCandidate || score > bestCandidate.score) {
            bestCandidate = { ...processInfo, score };
          }
        }

        if (bestCandidate && bestCandidate.score >= 80 && !isDeniedProcessName(bestCandidate.name)) {
          const tracked = this.trackLaunchedGame(
            options.gameId,
            bestCandidate.pid,
            options.title,
            options.exePath,
            options.installationDirectory,
            options.platform,
            options.source,
            bestCandidate.startedAtMs,
          );
          if (tracked) {
            this.stopLaunchTrackingSession(options.gameId);
            return;
          }
        }
      } catch (error) {
        console.error(`[Suspend] Launch tracking error for ${options.title}:`, error);
      } finally {
        tickInFlight = false;
      }

      if (attempts >= maxAttempts) {
        this.stopLaunchTrackingSession(options.gameId);
      }
    }, 1500);

    this.launchTrackingIntervals.set(options.gameId, interval);
  }

  private buildNativeActionScript(pids: number[], action: 'suspend' | 'resume'): string {
    const methodName = action === 'suspend' ? 'NtSuspendProcess' : 'NtResumeProcess';
    const pidLiteral = pids.join(',');
    return `
$ProgressPreference = 'SilentlyContinue'
$targetPids = @(${pidLiteral})
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class OnyxNativeSuspend {
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern IntPtr OpenProcess(uint processAccess, bool bInheritHandle, int processId);

  [DllImport("kernel32.dll", SetLastError = true)]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool CloseHandle(IntPtr hObject);

  [DllImport("ntdll.dll")]
  public static extern int NtSuspendProcess(IntPtr processHandle);

  [DllImport("ntdll.dll")]
  public static extern int NtResumeProcess(IntPtr processHandle);
}
"@

# Nyrna opens the process with PROCESS_SUSPEND_RESUME only. Adding query rights
# makes OpenProcess fail when suspend is allowed but query is not.
$PROCESS_SUSPEND_RESUME = 0x0800
$accessMask = $PROCESS_SUSPEND_RESUME
$results = @()
foreach ($procId in $targetPids) {
  $ok = $false
  $errorText = $null
  $handle = [IntPtr]::Zero
  try {
    $handle = [OnyxNativeSuspend]::OpenProcess($accessMask, $false, [int]$procId)
    if ($handle -eq [IntPtr]::Zero) {
      $code = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
      if ($code -eq 5) {
        throw "OpenProcess failed: Access is denied (Win32 error 5)"
      }
      throw "OpenProcess failed with Win32 error $code"
    }
    $status = [OnyxNativeSuspend]::${methodName}($handle)
    if ($status -ne 0) {
      throw "${methodName} failed with NTSTATUS $status"
    }
    $ok = $true
  } catch {
    $errorText = $_.Exception.Message
  } finally {
    if ($handle -ne [IntPtr]::Zero) {
      [OnyxNativeSuspend]::CloseHandle($handle) | Out-Null
    }
  }
  $results += [pscustomobject]@{ pid = [int]$procId; ok = [bool]$ok; error = $errorText }
}
$results | ConvertTo-Json -Compress
`;
  }

  private async runNativeAction(
    pids: number[],
    action: 'suspend' | 'resume',
  ): Promise<Map<number, { ok: boolean; error?: string }>> {
    for (const pid of pids) this.validatePid(pid);
    const { stdout } = await this.runPowerShell(this.buildNativeActionScript(pids, action), 15000);
    return parseNativeActionResults(stdout);
  }

  private async setProcessWindowState(pid: number, state: 'minimize' | 'restore'): Promise<void> {
    // 11 = SW_FORCEMINIMIZE, 9 = SW_RESTORE. Nyrna uses these, not SW_MINIMIZE (6):
    // FORCEMINIMIZE still works when the game thread is busy or fullscreen.
    const cmd = state === 'minimize' ? 11 : 9;
    const shouldForeground = state === 'restore';
    const script = `
$pidArg = ${pid}
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class OnyxUser32 {
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

$proc = Get-Process -Id $pidArg -ErrorAction SilentlyContinue
if (-not $proc) { exit 0 }

$hWnd = [IntPtr]$proc.MainWindowHandle
if ($hWnd -eq [IntPtr]::Zero) { exit 0 }

[OnyxUser32]::ShowWindow($hWnd, ${cmd}) | Out-Null
${shouldForeground ? '[OnyxUser32]::SetForegroundWindow($hWnd) | Out-Null' : ''}
`;

    try {
      await this.runPowerShell(script, 4000);
    } catch {
      // no-op: window operations are best-effort only
    }
  }

  private async releaseOrphanedTargets(gameInfo: ProcessInfo, processes: SnapshotProcess[] | null): Promise<void> {
    if (gameInfo.status !== 'suspended') return;
    const children = (gameInfo.suspendedTargets ?? []).filter((target) => target.pid !== gameInfo.pid);
    if (children.length === 0) return;

    const reliable = processes != null && processes.length > 0;
    const stillFrozen = reliable
      ? selectResumeTargets(children, processes)
      : [];

    const targets: SnapshotProcess[] = reliable ? stillFrozen : [];
    if (!reliable) {
      for (const target of children) {
        if (await this.isProcessRunning(target.pid)) {
          targets.push({ pid: target.pid, name: '', startedAtMs: target.startedAtMs });
        }
      }
    }

    for (const target of targets) {
      try {
        await this.resumeProcess(target.pid);
        console.log(`[Suspend] Resumed orphaned process ${target.pid} for ${gameInfo.title}`);
      } catch (error) {
        console.error(`[Suspend] Failed to resume orphaned process ${target.pid} for ${gameInfo.title}:`, error);
      }
    }
  }

  private async rediscoverReplacement(gameInfo: ProcessInfo): Promise<ProcessInfo | null> {
    if (!gameInfo.exePath && !gameInfo.installationDirectory) return null;
    const pid = await this.discoverGameProcess(
      gameInfo.gameId,
      gameInfo.exePath,
      gameInfo.title,
      gameInfo.installationDirectory,
      gameInfo.platform,
      gameInfo.source,
    );
    if (!pid) return null;
    return this.runningGames.get(gameInfo.gameId) ?? null;
  }

  /**
   * Drop a tracked PID that has exited or been reused. A replacement process is tracked as
   * running: it is not the process we suspended.
   */
  private async dropStaleGame(gameInfo: ProcessInfo, processes: SnapshotProcess[] | null): Promise<ProcessInfo | null> {
    await this.releaseOrphanedTargets(gameInfo, processes);
    this.runningGames.delete(gameInfo.gameId);
    this.suspendedGames.delete(gameInfo.gameId);
    this.persistSuspendedGames();
    return this.rediscoverReplacement(gameInfo);
  }

  constructor(execRunner?: ExecRunner | null, options?: ServiceOptions) {
    this.isWindows = platform() === 'win32';
    this.execRunner = execRunner || null;
    this.persistencePath = options?.persistencePath ?? null;
    this.minimizeDelayMs = options?.minimizeDelayMs ?? 500;
    this.native = options?.native ?? null;
    // A test-injected PowerShell runner must not also call the real ntdll.
    if (!this.native && !execRunner && this.isWindows) {
      this.native = loadWin32SuspendPort();
    }
    if (!this.isWindows) {
      console.warn('ProcessSuspendService: Only Windows is currently supported');
    }
  }

  isEnabled(): boolean {
    return this.isWindows;
  }

  hasSuspendedGames(): boolean {
    return this.suspendedGames.size > 0;
  }

  private mapActionError(action: 'suspend' | 'resume', errorMessage: string): Error {
    if (errorMessage.includes('Access is denied') ||
      errorMessage.includes('permission') ||
      errorMessage.includes('OpenProcess failed') ||
      errorMessage.includes('Cannot find a process') ||
      errorMessage.includes('not found')) {
      return new Error('Access denied. The process may require administrator privileges, or the process may have exited.');
    }
    const verb = action === 'suspend' ? 'suspend' : 'resume';
    return new Error(`Failed to ${verb} process: ${errorMessage}`);
  }

  /**
   * Suspend one process. Native NtSuspendProcess first, then the Suspend-Process cmdlet
   * when a host has that cmdlet installed.
   */
  async suspendProcess(pid: number): Promise<boolean> {
    if (!this.isWindows) {
      throw new Error('Suspend/resume is only supported on Windows');
    }
    this.validatePid(pid);

    if (this.native) {
      try {
        this.native.suspend(pid);
        return true;
      } catch (error) {
        console.log(`[Suspend] Direct ntdll suspend failed, trying PowerShell: ${this.errorText(error)}`);
      }
    }

    try {
      const results = await this.runNativeAction([pid], 'suspend');
      const result = results.get(pid);
      if (result?.ok) return true;
      throw new Error(result?.error || 'NtSuspendProcess failed');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.log(`[Suspend] Native API suspend failed, trying cmdlet fallback: ${message}`);
    }

    try {
      await this.runPowerShell(`Suspend-Process -Id ${pid} -ErrorAction Stop`, 5000);
      return true;
    } catch (cmdletError: unknown) {
      const errorMessage = this.errorText(cmdletError);
      console.error(`[Suspend] All methods failed: ${errorMessage}`);
      throw this.mapActionError('suspend', errorMessage);
    }
  }

  /**
   * Resume a suspended process by PID
   */
  async resumeProcess(pid: number): Promise<boolean> {
    if (!this.isWindows) {
      throw new Error('Suspend/resume is only supported on Windows');
    }
    this.validatePid(pid);

    if (this.native) {
      try {
        this.native.resume(pid);
        return true;
      } catch (error) {
        console.log(`[Suspend] Direct ntdll resume failed, trying PowerShell: ${this.errorText(error)}`);
      }
    }

    try {
      const results = await this.runNativeAction([pid], 'resume');
      const result = results.get(pid);
      if (result?.ok) return true;
      throw new Error(result?.error || 'NtResumeProcess failed');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.log(`[Suspend] Native API resume failed, trying cmdlet fallback: ${message}`);
    }

    try {
      await this.runPowerShell(`Resume-Process -Id ${pid} -ErrorAction Stop`, 5000);
      return true;
    } catch (cmdletError: unknown) {
      const errorMessage = this.errorText(cmdletError);
      console.error(`[Suspend] All resume methods failed: ${errorMessage}`);
      throw this.mapActionError('resume', errorMessage);
    }
  }

  private errorText(error: unknown): string {
    if (error && typeof error === 'object') {
      const record = error as { stderr?: string; message?: string };
      return record.stderr || record.message || String(error);
    }
    return String(error ?? 'Unknown error');
  }

  private async applyAction(targets: SnapshotProcess[], action: 'suspend' | 'resume'): Promise<ActionOutcome> {
    if (targets.length === 0) return { succeeded: [] };

    // Direct ntdll when the port loaded. The PowerShell Add-Type batch is the fallback
    // for tests and for machines where koffi cannot load. Compiling that script on every
    // hotkey is what made suspend land after the game had already painted again.
    if (this.native) {
      const succeeded: SnapshotProcess[] = [];
      let firstError: string | undefined;
      const rootPid = targets[0]?.pid;
      for (const target of targets) {
        try {
          if (action === 'suspend') await this.suspendProcess(target.pid);
          else await this.resumeProcess(target.pid);
          succeeded.push(target);
        } catch (error) {
          firstError ??= this.errorText(error);
          if (action === 'suspend' && target.pid === rootPid) break;
        }
      }
      return { succeeded, error: firstError };
    }

    let native: Map<number, { ok: boolean; error?: string }> | null = null;
    try {
      native = await this.runNativeAction(targets.map((target) => target.pid), action);
    } catch (error) {
      console.log(`[Suspend] Native ${action} batch failed, trying per-process fallback: ${this.errorText(error)}`);
    }

    const succeeded: SnapshotProcess[] = [];
    let firstError: string | undefined;
    const rootPid = targets[0]?.pid;
    for (const target of targets) {
      const nativeResult = native?.get(target.pid);
      if (nativeResult?.ok) {
        succeeded.push(target);
        continue;
      }
      if (nativeResult?.error) firstError ??= nativeResult.error;
      try {
        if (action === 'suspend') await this.suspendProcess(target.pid);
        else await this.resumeProcess(target.pid);
        succeeded.push(target);
      } catch (error) {
        firstError ??= this.errorText(error);
        if (action === 'suspend' && target.pid === rootPid) break;
      }
    }
    return { succeeded, error: firstError };
  }

  private async rollbackSuspended(targets: SnapshotProcess[]): Promise<void> {
    for (const target of [...targets].reverse()) {
      try {
        await this.resumeProcess(target.pid);
      } catch (error) {
        console.error(`[Suspend] Failed to roll back PID ${target.pid}:`, error);
      }
    }
  }

  /**
   * Check if a process is still running.
   * A suspended process is still alive. PID reuse is handled by comparing creation time
   * at the suspend/resume boundary, where a process list is available.
   */
  async isProcessRunning(pid: number): Promise<boolean> {
    if (!this.isWindows) {
      return false;
    }
    try {
      this.validatePid(pid);
    } catch {
      return false;
    }
    return isProcessAlive(pid);
  }

  /**
   * Get all running processes (Windows only)
   */
  async getAllProcesses(): Promise<SnapshotProcess[]> {
    if (!this.isWindows) {
      return [];
    }

    try {
      const { stdout } = await this.runPowerShell(
        'Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CreationDate | ConvertTo-Json -Compress',
        15000,
      );
      return parseCimProcessList(stdout);
    } catch (error) {
      console.error('Failed to get process list:', error);
      return [];
    }
  }

  /**
   * Track a launched game process.
   * Returns false when a different PID is already suspended for this game. Replacing it
   * would leak the frozen process.
   */
  trackLaunchedGame(
    gameId: string,
    pid: number,
    title: string,
    exePath?: string,
    installationDirectory?: string,
    platform?: string,
    source?: string,
    startedAtMs?: number,
  ): boolean {
    const existing = this.runningGames.get(gameId);
    if (existing?.status === 'suspended' && existing.pid !== pid) {
      console.warn(`[Suspend] Not replacing suspended ${existing.title} (PID ${existing.pid}) with PID ${pid}`);
      return false;
    }

    const sameProcess = existing?.pid === pid;
    this.runningGames.set(gameId, {
      pid,
      gameId,
      title,
      exePath,
      installationDirectory,
      platform,
      source,
      status: sameProcess && existing?.status === 'suspended' ? 'suspended' : 'running',
      suspendedAt: sameProcess && existing?.status === 'suspended' ? existing.suspendedAt : undefined,
      suspendedTargets: sameProcess && existing?.status === 'suspended' ? existing.suspendedTargets : undefined,
      startedAtMs: startedAtMs ?? (sameProcess ? existing?.startedAtMs : undefined),
    });
    console.log(`Tracking game: ${title} (${gameId}) - PID: ${pid}`);
    return true;
  }

  /**
   * Discover a game process by executable path
   */
  async discoverGameProcess(
    gameId: string,
    exePath: string | undefined,
    title: string,
    installationDirectory?: string,
    platform?: string,
    source?: string,
  ): Promise<number | null> {
    if (!exePath && !installationDirectory) {
      return null;
    }

    try {
      const processes = await this.getAllProcesses();
      const matchingProcess = matchTrackedProcess(processes, { exePath, installationDirectory, title });
      if (!matchingProcess || isDeniedProcessName(matchingProcess.name)) {
        return null;
      }
      const tracked = this.trackLaunchedGame(
        gameId,
        matchingProcess.pid,
        title,
        exePath,
        installationDirectory,
        platform,
        source,
        matchingProcess.startedAtMs,
      );
      return tracked ? matchingProcess.pid : null;
    } catch (error) {
      console.error(`Failed to discover process for ${title}:`, error);
      return null;
    }
  }

  /**
   * Discover and track a game process by executable path with retry
   */
  async discoverAndTrackGame(gameId: string, title: string, exePath: string, retries: number = 5): Promise<boolean> {
    if (!exePath) return false;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < retries; i++) {
      const pid = await this.discoverGameProcess(gameId, exePath, title);
      if (pid) {
        return true;
      }
      await sleep(2000);
    }

    return false;
  }

  async discoverRunningGamesFromLibrary(games: DiscoverableGame[]): Promise<number> {
    if (!this.isWindows) {
      return 0;
    }

    const processes = await this.getAllProcesses();
    if (processes.length === 0) {
      return 0;
    }

    let trackedCount = 0;
    for (const game of games) {
      if ((!game.exePath && !game.installationDirectory) || this.runningGames.has(game.id)) {
        continue;
      }

      const matchedProcess = matchTrackedProcess(processes, {
        exePath: game.exePath,
        installationDirectory: game.installationDirectory,
      });
      if (!matchedProcess || isDeniedProcessName(matchedProcess.name)) continue;

      if (this.trackLaunchedGame(
        game.id,
        matchedProcess.pid,
        game.title,
        game.exePath,
        game.installationDirectory,
        undefined,
        undefined,
        matchedProcess.startedAtMs,
      )) {
        trackedCount += 1;
      }
    }

    return trackedCount;
  }

  private async resolveLiveGame(gameInfo: ProcessInfo): Promise<{ game: ProcessInfo | null; processes: SnapshotProcess[] }> {
    const processes = await this.getAllProcesses();
    const reliable = processes.length > 0;
    const live = reliable ? processes.find((proc) => proc.pid === gameInfo.pid) : undefined;

    if (reliable && live) {
      if (gameInfo.startedAtMs == null) {
        gameInfo.startedAtMs = live.startedAtMs;
        return { game: gameInfo, processes };
      }
      if (isSameProcessStart(gameInfo.startedAtMs, live.startedAtMs)) {
        return { game: gameInfo, processes };
      }

      const restarted = live.path
        ? (gameInfo.exePath && (pathsEqual(live.path, gameInfo.exePath) || basenameWindows(live.path).toLowerCase() === basenameWindows(gameInfo.exePath).toLowerCase()))
          || isPathInsideDirectory(live.path, gameInfo.installationDirectory)
        : false;
      await this.releaseOrphanedTargets(gameInfo, processes);
      this.suspendedGames.delete(gameInfo.gameId);
      gameInfo.status = 'running';
      delete gameInfo.suspendedAt;
      delete gameInfo.suspendedTargets;
      if (restarted) {
        gameInfo.startedAtMs = live.startedAtMs;
        this.persistSuspendedGames();
        return { game: gameInfo, processes };
      }
      const replacement = await this.dropStaleGame(gameInfo, processes);
      return { game: replacement, processes: await this.getAllProcesses() };
    }

    const alive = await this.isProcessRunning(gameInfo.pid);
    if (alive && !reliable) {
      return { game: gameInfo, processes };
    }
    if (alive && reliable && !live) {
      // Enumerated snapshot can miss a protected process that is still alive.
      return { game: gameInfo, processes };
    }

    const replacement = await this.dropStaleGame(gameInfo, reliable ? processes : null);
    return { game: replacement, processes: reliable ? processes : await this.getAllProcesses() };
  }

  /**
   * Suspend a game by gameId
   */
  async suspendGame(gameId: string): Promise<{ success: boolean; error?: string }> {
    return this.withGameLock(gameId, () => this.suspendGameUnlocked(gameId));
  }

  private async suspendGameUnlocked(gameId: string): Promise<{ success: boolean; error?: string }> {
    let gameInfo = this.runningGames.get(gameId);

    if (!gameInfo) {
      return { success: false, error: 'Game process not found. Try launching the game first.' };
    }

    if (gameInfo.status === 'suspended') {
      return { success: false, error: 'Game is already suspended' };
    }

    if (gameInfo.status === 'stopped') {
      return { success: false, error: 'Game process has stopped' };
    }

    const resolved = await this.resolveLiveGame(gameInfo);
    gameInfo = resolved.game ?? undefined;
    if (!gameInfo) {
      return { success: false, error: 'Game process is no longer running' };
    }
    if (gameInfo.status === 'suspended') {
      return { success: false, error: 'Game is already suspended' };
    }

    let foregroundHwnd: number | undefined;
    if (this.native) {
      const foreground = this.native.foreground();
      const chosen = chooseSuspendRoot(
        gameInfo.pid,
        foreground ? { pid: foreground.pid, executable: foreground.executable, path: foreground.path } : null,
        gameInfo,
      );
      if (chosen !== gameInfo.pid) {
        const live = resolved.processes.find((proc) => proc.pid === chosen);
        console.log(`[Suspend] Using foreground PID ${chosen} for ${gameInfo.title} instead of tracked PID ${gameInfo.pid}`);
        gameInfo.pid = chosen;
        gameInfo.startedAtMs = live?.startedAtMs;
      }
      if (foreground?.pid === gameInfo.pid) foregroundHwnd = foreground.hwnd;
    }

    const plan = planSuspendTargets(gameInfo.pid, resolved.processes, {
      exePath: gameInfo.exePath,
      installationDirectory: gameInfo.installationDirectory,
      selfPid: process.pid,
    });
    if (plan.refusal) {
      return { success: false, error: plan.refusal };
    }
    if (plan.truncated) {
      console.warn(`[Suspend] ${gameInfo.title} has more child processes than will be suspended`);
    }

    await this.minimizeForSuspend(gameInfo.pid, foregroundHwnd);
    // Suspend the window process first, then its children, matching Nyrna.
    // Children are read after the parent is frozen when a direct process snapshot is available.
    const rootTarget = plan.targets[0] ?? { pid: gameInfo.pid, name: '' };
    const rootOutcome = await this.applyAction([rootTarget], 'suspend');
    const rootSuspended = rootOutcome.succeeded.some((target) => target.pid === gameInfo!.pid);
    let childTargets = plan.targets.filter((target) => target.pid !== gameInfo!.pid);
    if (rootSuspended && this.native?.childPids) {
      const liveChildren = this.descendantPids(gameInfo.pid);
      if (liveChildren) {
        const byPid = new Map(resolved.processes.map((proc) => [proc.pid, proc]));
        childTargets = liveChildren.map((pid) => byPid.get(pid) ?? { pid, name: '' });
      }
    }
    const childOutcome = rootSuspended && childTargets.length > 0
      ? await this.applyAction(childTargets, 'suspend')
      : { succeeded: [] as SnapshotProcess[], error: undefined as string | undefined };
    const outcome: ActionOutcome = {
      succeeded: [...rootOutcome.succeeded, ...childOutcome.succeeded],
      error: rootOutcome.error ?? childOutcome.error,
    };
    if (rootSuspended && outcome.error) {
      console.warn(`[Suspend] ${gameInfo.title} paused, but a helper process could not be suspended: ${outcome.error}`);
    }
    if (!rootSuspended) {
      await this.rollbackSuspended(outcome.succeeded);
      await this.setProcessWindowState(gameInfo.pid, 'restore');
      return { success: false, error: this.suspendFailureMessage(gameId, outcome.error) };
    }

    const suspendedTargets = outcome.succeeded.map((target) => ({
      pid: target.pid,
      startedAtMs: target.startedAtMs ?? (target.pid === gameInfo!.pid ? gameInfo!.startedAtMs : undefined),
    }));
    const suspendedRoot = suspendedTargets.find((target) => target.pid === gameInfo!.pid);
    gameInfo.status = 'suspended';
    gameInfo.suspendedAt = Date.now();
    gameInfo.suspendedTargets = suspendedTargets;
    if (suspendedRoot?.startedAtMs != null) gameInfo.startedAtMs = suspendedRoot.startedAtMs;
    this.suspendedGames.add(gameId);
    this.persistSuspendedGames();
    console.log(`Suspended game: ${gameInfo.title} (PID: ${gameInfo.pid}, processes: ${suspendedTargets.length})`);
    return { success: true };
  }

  private suspendFailureMessage(gameId: string, errorMessage: string | undefined): string {
    if (!errorMessage) {
      return 'Failed to suspend process. The process may have exited or requires administrator privileges.';
    }
    if (errorMessage.includes('Access is denied') || errorMessage.includes('Access denied')) {
      return 'Access denied. Please run Onyx as Administrator to suspend processes.';
    }
    if (errorMessage.includes('Cannot find a process') || errorMessage.includes('not found') || errorMessage.includes('no longer')) {
      this.forgetGame(gameId);
      return 'Process no longer exists. It may have exited.';
    }
    return `Failed to suspend game: ${errorMessage}`;
  }

  /**
   * Hotkey behavior from Nyrna: toggle the foreground window, not the launch PID.
   * If Onyx itself is in front, hide it and look again. A saved suspend is resumed
   * on the next press. A failed resume clears the hotkey slot but leaves the paused
   * processes in the recovery file. A later press resumes a recorded process instead
   * of suspending it again, so the Windows suspend count does not climb.
   */
  async toggleForeground(hideSelf?: () => void): Promise<{ success: boolean; error?: string; title?: string; action?: 'suspend' | 'resume' }> {
    return this.withGameLock('foreground-window', () => this.toggleForegroundUnlocked(hideSelf));
  }

  private async toggleForegroundUnlocked(hideSelf?: () => void): Promise<{ success: boolean; error?: string; title?: string; action?: 'suspend' | 'resume' }> {
    const existing = this.runningGames.get('foreground-window');
    if (existing?.status === 'suspended') {
      const result = await this.resumeGameUnlocked('foreground-window');
      if (!result.success) {
        this.releaseHotkeySlotKeepRecovery();
      }
      return { ...result, title: existing.title, action: 'resume' };
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const foreground = await this.readForeground();
      if (!foreground || foreground.pid <= 0) continue;
      const decision = foregroundSuspendDecision(foreground.executable, foreground.pid, process.pid);
      if (decision === 'retry-self') {
        hideSelf?.();
        await this.delay(this.minimizeDelayMs);
        continue;
      }
      if (decision === 'refuse-shell') {
        return { success: false, error: 'The foreground window is File Explorer, not a game.', title: foreground.executable };
      }

      const recorded = await this.suspensionRecordingPid(foreground.pid);
      if (recorded) {
        const result = await this.resumeRecordedSuspension(recorded);
        return { ...result, title: recorded.title || foreground.executable, action: 'resume' };
      }

      this.trackLaunchedGame(
        'foreground-window',
        foreground.pid,
        foreground.executable || 'Foreground window',
        foreground.path,
      );
      const tracked = this.runningGames.get('foreground-window');
      if (tracked && foreground.path) tracked.exePath = foreground.path;
      const result = await this.suspendGameUnlocked('foreground-window');
      return { ...result, title: foreground.executable || 'Foreground window', action: 'suspend' };
    }

    return { success: false, error: 'Could not find a foreground window to suspend.' };
  }

  private async readForeground(): Promise<{ pid: number; hwnd: number; executable: string; path?: string } | null> {
    if (this.native) {
      try {
        return this.native.foreground();
      } catch (error) {
        console.error('[Suspend] Foreground window lookup failed:', error);
        return null;
      }
    }
    return null;
  }

  private descendantPids(rootPid: number): number[] | null {
    if (!this.native?.childPids) return null;
    const result: number[] = [];
    const queue = [rootPid];
    const seen = new Set<number>([rootPid, process.pid]);
    while (queue.length > 0 && result.length < 24) {
      const parent = queue.shift();
      if (parent == null) break;
      let children: number[];
      try {
        children = this.native.childPids(parent);
      } catch (error) {
        console.warn('[Suspend] Child process snapshot failed:', error);
        return null;
      }
      for (const child of children) {
        if (!Number.isInteger(child) || child <= 4 || seen.has(child)) continue;
        seen.add(child);
        result.push(child);
        queue.push(child);
      }
    }
    return result;
  }

  private async minimizeForSuspend(pid: number, hwnd?: number): Promise<void> {
    if (hwnd && this.native) {
      try {
        this.native.showWindow(hwnd, 11);
      } catch (error) {
        console.warn('[Suspend] SW_FORCEMINIMIZE failed, trying the process main window:', error);
        await this.setProcessWindowState(pid, 'minimize');
      }
    } else {
      await this.setProcessWindowState(pid, 'minimize');
    }
    await this.delay(this.minimizeDelayMs);
  }

  private delay(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Resume a suspended game by gameId
   */
  async resumeGame(gameId: string): Promise<{ success: boolean; error?: string }> {
    return this.withGameLock(gameId, () => this.resumeGameUnlocked(gameId));
  }

  private async resumeGameUnlocked(gameId: string): Promise<{ success: boolean; error?: string }> {
    const gameInfo = this.runningGames.get(gameId);

    if (!gameInfo) {
      return { success: false, error: 'Game process not found' };
    }

    if (gameInfo.status !== 'suspended') {
      return { success: false, error: 'Game is not suspended' };
    }

    const processes = await this.getAllProcesses();
    const recorded = gameInfo.suspendedTargets ?? [{ pid: gameInfo.pid, startedAtMs: gameInfo.startedAtMs }];
    const toResume: SnapshotProcess[] = processes.length > 0
      ? selectResumeTargets(recorded, processes)
      : [];
    if (processes.length === 0) {
      for (const target of recorded) {
        if (await this.isProcessRunning(target.pid)) {
          toResume.push({ pid: target.pid, name: '', startedAtMs: target.startedAtMs });
        }
      }
    }

    if (toResume.length === 0) {
      this.forgetGame(gameId);
      return { success: false, error: 'Game process is no longer running' };
    }

    // Nyrna on Windows resumes the parent, then its children.
    const outcome = await this.applyAction(toResume, 'resume');
    const resumedIds = new Set(outcome.succeeded.map((target) => target.pid));
    const remaining = recorded.filter((target) => {
      const wasAlive = toResume.some((live) => live.pid === target.pid);
      return wasAlive && !resumedIds.has(target.pid);
    });

    const rootWasAlive = toResume.some((target) => target.pid === gameInfo.pid);
    const rootResumed = resumedIds.has(gameInfo.pid);

    if (remaining.length > 0) {
      gameInfo.suspendedTargets = remaining;
      this.suspendedGames.add(gameId);
      this.persistSuspendedGames();
      return { success: false, error: `Failed to resume game: ${outcome.error || 'one or more processes stayed suspended'}` };
    }

    if (!rootWasAlive) {
      this.forgetGame(gameId);
      return { success: false, error: 'Game process is no longer running' };
    }

    if (rootResumed) {
      await this.setProcessWindowState(gameInfo.pid, 'restore');
    }
    gameInfo.status = 'running';
    delete gameInfo.suspendedAt;
    delete gameInfo.suspendedTargets;
    this.suspendedGames.delete(gameId);
    this.persistSuspendedGames();
    console.log(`Resumed game: ${gameInfo.title} (PID: ${gameInfo.pid})`);
    return { success: true };
  }

  /**
   * Get list of running games
   */
  async getRunningGames(): Promise<RunningGame[]> {
    await this.refreshTrackedGames();
    const runningGames: RunningGame[] = [];
    for (const gameInfo of this.runningGames.values()) {
      if (gameInfo.status === 'stopped') continue;
      runningGames.push({
        gameId: gameInfo.gameId,
        title: gameInfo.title,
        pid: gameInfo.pid,
        status: gameInfo.status === 'suspended' ? 'suspended' : 'running',
        exePath: gameInfo.exePath,
      });
    }
    return runningGames;
  }

  private async refreshTrackedGames(): Promise<void> {
    if (!this.isWindows) return;
    const processes = await this.getAllProcesses();
    const reliable = processes.length > 0;
    for (const gameInfo of [...this.runningGames.values()]) {
      const live = reliable ? processes.find((proc) => proc.pid === gameInfo.pid) : undefined;
      const identityMatches = !live || isSameProcessStart(gameInfo.startedAtMs, live.startedAtMs);
      const alive = reliable
        ? Boolean(live) && identityMatches
        : await this.isProcessRunning(gameInfo.pid);
      if (alive) {
        if (live && gameInfo.startedAtMs == null) gameInfo.startedAtMs = live.startedAtMs;
        continue;
      }
      await this.dropStaleGame(gameInfo, reliable ? processes : null);
    }
  }

  /**
   * Remove a tracked game (when it closes)
   */
  removeGame(gameId: string): void {
    this.stopLaunchTrackingSession(gameId);
    this.forgetGame(gameId);
  }

  /**
   * Start monitoring processes (optional, for auto-detection)
   */
  startProcessMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(async () => {
      if (this.sweepInFlight) return;
      this.sweepInFlight = true;
      try {
        await this.refreshTrackedGames();
      } catch (error) {
        console.error('[Suspend] Process monitoring sweep failed:', error);
      } finally {
        this.sweepInFlight = false;
      }
    }, intervalMs);
  }

  /**
   * Stop process monitoring
   */
  stopProcessMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Resume processes that were still suspended when a previous session ended.
   * PIDs are resumed only when the creation time matches, so a reused PID is left alone.
   */
  async recoverOrphanedSuspensions(): Promise<void> {
    if (!this.isWindows) return;
    const records = this.readPersisted();
    if (records.length === 0) return;

    const processes = await this.getAllProcesses();
    const reliable = processes.length > 0;
    const remaining: PersistedSuspendRecord[] = [];

    for (const record of records) {
      const targets = record.targets.filter((target) => Number.isInteger(target.pid) && target.pid > 0);
      let toResume: SnapshotProcess[] = [];
      if (reliable) {
        toResume = selectResumeTargets(targets, processes);
      } else {
        for (const target of targets) {
          if (await this.isProcessRunning(target.pid)) {
            toResume.push({ pid: target.pid, name: '', startedAtMs: target.startedAtMs });
          }
        }
      }

      if (toResume.length === 0) continue;

      const outcome = await this.applyAction(toResume, 'resume');
      const resumedIds = new Set(outcome.succeeded.map((target) => target.pid));
      const stillFrozen = toResume
        .filter((target) => !resumedIds.has(target.pid))
        .map((target) => ({ pid: target.pid, startedAtMs: target.startedAtMs }));

      if (stillFrozen.length > 0) {
        remaining.push({ ...record, targets: stillFrozen });
        this.runningGames.set(record.gameId, {
          pid: stillFrozen[0].pid,
          gameId: record.gameId,
          title: record.title,
          exePath: record.exePath,
          installationDirectory: record.installationDirectory,
          platform: record.platform,
          source: record.source,
          status: 'suspended',
          suspendedAt: record.suspendedAt,
          startedAtMs: stillFrozen[0].startedAtMs,
          suspendedTargets: stillFrozen,
        });
        this.suspendedGames.add(record.gameId);
        continue;
      }

      const root = targets[0];
      const rootLive = root
        && toResume.some((target) => target.pid === root.pid)
        && resumedIds.has(root.pid);
      if (root && rootLive) {
        this.trackLaunchedGame(
          record.gameId,
          root.pid,
          record.title,
          record.exePath,
          record.installationDirectory,
          record.platform,
          record.source,
          root.startedAtMs,
        );
      }
      console.log(`[Suspend] Resumed ${record.title} after the previous session ended while it was suspended`);
    }

    if (this.suspendedGames.size === 0) {
      this.writePersisted([]);
    } else {
      this.writePersisted(remaining);
    }
  }

  /**
   * Resume everything this session suspended. Used on quit so closing Onyx does not
   * leave games frozen. Crash recovery is `recoverOrphanedSuspensions`.
   */
  async shutdown(): Promise<void> {
    this.stopProcessMonitoring();
    for (const gameId of [...this.launchTrackingIntervals.keys()]) {
      this.stopLaunchTrackingSession(gameId);
    }
    for (const gameId of [...this.suspendedGames]) {
      try {
        await this.resumeGame(gameId);
      } catch (error) {
        console.error(`[Suspend] Failed to resume ${gameId} during shutdown:`, error);
      }
    }
    for (const record of [...this.detachedRecoveries]) {
      try {
        await this.resumeRecordedSuspension(record);
      } catch (error) {
        console.error(`[Suspend] Failed to resume ${record.title} during shutdown:`, error);
      }
    }
  }

  /**
   * Stop timers. Does not resume processes and does not delete the crash-recovery file.
   */
  cleanup(): void {
    this.stopProcessMonitoring();
    for (const gameId of [...this.launchTrackingIntervals.keys()]) {
      this.stopLaunchTrackingSession(gameId);
    }
  }
}

