import { spawn, exec } from 'child_process';
import path from 'node:path';
import { platform } from 'node:os';
import { promisify } from 'util';
const execAsync = promisify(exec);

type ExecRunner = (command: string, args: string[], opts?: any) => Promise<{ stdout: string; stderr: string; code: number }>;

export interface ProcessInfo {
  pid: number;
  gameId: string;
  title: string;
  exePath?: string;
  status: 'running' | 'suspended' | 'stopped';
  suspendedAt?: number;
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

export class ProcessSuspendService {
  private runningGames: Map<string, ProcessInfo> = new Map();
  private suspendedGames: Set<string> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isWindows: boolean;
  private execRunner: ExecRunner | null = null;
  private launchTrackingIntervals: Map<string, NodeJS.Timeout> = new Map();

  private runCommandSafe: ExecRunner = (command: string, args: string[] = [], opts: any = {}) => {
    // If an injected execRunner is provided (in tests), use it
    if (this.execRunner) return this.execRunner(command, args, opts);

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { shell: false, ...opts });
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (data) => { stdout += data.toString(); });
      child.stderr?.on('data', (data) => { stderr += data.toString(); });
      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        if (code === 0) resolve({ stdout, stderr, code: code || 0 });
        else reject(Object.assign(new Error('Command failed'), { stdout, stderr, code }));
      });
    });
  };

  private validatePid(pid: number) {
    if (!Number.isInteger(pid) || pid <= 0 || pid > 2147483647) {
      throw new Error('Invalid PID');
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
    processInfo: { pid: number; name: string; path?: string },
    options: LaunchTrackingOptions
  ): number {
    const processName = processInfo.name.toLowerCase();
    const processPath = processInfo.path?.toLowerCase();
    const exePath = options.exePath?.toLowerCase();
    const installDir = options.installationDirectory?.toLowerCase().replace(/\//g, '\\');
    const exeBaseName = exePath ? path.basename(exePath) : undefined;
    const exeWithoutExt = exeBaseName?.replace('.exe', '');
    const isXbox = (options.platform || '').toLowerCase() === 'xbox' || (options.source || '').toLowerCase() === 'xbox';

    let score = 0;

    if (processPath && exePath && processPath === exePath) {
      score += 150;
    }

    if (processPath && exeBaseName && path.basename(processPath) === exeBaseName) {
      score += 120;
    }

    if (exeWithoutExt && processName === exeWithoutExt) {
      score += 110;
    }

    if (processPath && installDir && processPath.includes(installDir)) {
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

    const launcherProcessNames = new Set([
      'explorer',
      'steam',
      'steamwebhelper',
      'epicgameslauncher',
      'eadesktop',
      'origin',
      'goggalaxy',
      'ubisoftconnect',
      'battlenet',
      'gamingservices',
      'startmenuexperiencehost',
      'applicationframehost',
      'searchhost',
      'shellexperiencehost',
      'onyx',
    ]);

    if (launcherProcessNames.has(processName)) {
      score -= 120;
    }

    return score;
  }

  startLaunchTrackingSession(options: LaunchTrackingOptions): void {
    if (!this.isWindows) {
      return;
    }

    this.stopLaunchTrackingSession(options.gameId);

    if (options.knownPid && Number.isInteger(options.knownPid) && options.knownPid > 0) {
      this.trackLaunchedGame(options.gameId, options.knownPid, options.title, options.exePath);
    }

    const baselinePids = new Set(options.baselinePids || []);
    let attempts = 0;
    const maxAttempts = 30;

    const interval = setInterval(async () => {
      attempts += 1;

      try {
        const processes = await this.getAllProcesses();
        let bestCandidate: { pid: number; name: string; path?: string; score: number } | null = null;

        for (const processInfo of processes) {
          if (baselinePids.has(processInfo.pid)) {
            continue;
          }

          const score = this.scoreProcessCandidate(processInfo, options);
          if (!bestCandidate || score > bestCandidate.score) {
            bestCandidate = { ...processInfo, score };
          }
        }

        if (bestCandidate && bestCandidate.score >= 80) {
          this.trackLaunchedGame(options.gameId, bestCandidate.pid, options.title, options.exePath);
          this.stopLaunchTrackingSession(options.gameId);
          return;
        }
      } catch (error) {
        console.error(`[Suspend] Launch tracking error for ${options.title}:`, error);
      }

      if (attempts >= maxAttempts) {
        this.stopLaunchTrackingSession(options.gameId);
      }
    }, 1500);

    this.launchTrackingIntervals.set(options.gameId, interval);
  }

  private async runNativeSuspendResume(pid: number, action: 'suspend' | 'resume'): Promise<void> {
    const methodName = action === 'suspend' ? 'NtSuspendProcess' : 'NtResumeProcess';

    const script = `
$pidArg = ${pid}
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

$PROCESS_SUSPEND_RESUME = 0x0800
$PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
$accessMask = $PROCESS_SUSPEND_RESUME -bor $PROCESS_QUERY_LIMITED_INFORMATION

$handle = [OnyxNativeSuspend]::OpenProcess($accessMask, $false, [int]$pidArg)
if ($handle -eq [IntPtr]::Zero) {
  $code = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
  throw "OpenProcess failed with Win32 error $code"
}

try {
  $result = [OnyxNativeSuspend]::${methodName}($handle)
  if ($result -ne 0) {
    throw "${methodName} failed with NTSTATUS $result"
  }
} finally {
  [OnyxNativeSuspend]::CloseHandle($handle) | Out-Null
}
`;

    await this.runCommandSafe('powershell', ['-ExecutionPolicy', 'Bypass', '-NoProfile', '-Command', script], { timeout: 10000 });
  }

  private async setProcessWindowState(pid: number, state: 'minimize' | 'restore'): Promise<void> {
    const cmd = state === 'minimize' ? 6 : 9;
    const shouldForeground = state === 'restore';
    const script = `
$pidArg = ${pid}
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class OnyxUser32 {
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

$proc = Get-Process -Id $pidArg -ErrorAction SilentlyContinue
if (-not $proc) { exit 0 }

$hWnd = [IntPtr]$proc.MainWindowHandle
if ($hWnd -eq [IntPtr]::Zero) { exit 0 }

[OnyxUser32]::ShowWindowAsync($hWnd, ${cmd}) | Out-Null
${shouldForeground ? '[OnyxUser32]::SetForegroundWindow($hWnd) | Out-Null' : ''}
`;

    try {
      await this.runCommandSafe('powershell', ['-ExecutionPolicy', 'Bypass', '-NoProfile', '-Command', script], { timeout: 4000 });
    } catch {
      // no-op: window operations are best-effort only
    }
  }

  private async tryRediscoverTrackedGame(gameInfo: ProcessInfo): Promise<boolean> {
    if (!gameInfo.exePath) {
      return false;
    }

    const rediscoveredPid = await this.discoverGameProcess(gameInfo.gameId, gameInfo.exePath, gameInfo.title);
    if (!rediscoveredPid) {
      return false;
    }

    const rediscoveredGame = this.runningGames.get(gameInfo.gameId);
    if (rediscoveredGame && gameInfo.status === 'suspended') {
      rediscoveredGame.status = 'suspended';
      rediscoveredGame.suspendedAt = gameInfo.suspendedAt;
      this.suspendedGames.add(gameInfo.gameId);
    }

    return true;
  }

  constructor(execRunner?: any) {
    this.isWindows = platform() === 'win32';
    // Allow injection of an exec runner for testing (should implement spawn-like API)
    this.execRunner = execRunner || null;
    if (!this.isWindows) {
      console.warn('ProcessSuspendService: Only Windows is currently supported');
    }
  }

  /**
   * Check if the service is enabled and functional
   */
  isEnabled(): boolean {
    return this.isWindows;
  }

  /**
   * Suspend a process by PID using Windows API
   */
  async suspendProcess(pid: number): Promise<boolean> {
    if (!this.isWindows) {
      throw new Error('Suspend/resume is only supported on Windows');
    }

    this.validatePid(pid);

    // Method 1: Native API via PowerShell Add-Type (works even when Suspend-Process cmdlet is unavailable)
    try {
      await this.runNativeSuspendResume(pid, 'suspend');
      return true;
    } catch (e: any) {
      console.log(`[Suspend] Native API suspend failed, trying cmdlet fallback: ${e.message}`);
    }

    // Method 2: PowerShell cmdlet fallback
    try {
      await this.runCommandSafe('powershell', ['-ExecutionPolicy', 'Bypass', '-NoProfile', '-Command', `Suspend-Process -Id ${pid} -ErrorAction Stop`], { timeout: 5000 });
      return true;
    } catch (cmdletError: any) {
      const errorMessage = cmdletError?.stderr || cmdletError?.message || String(cmdletError || 'Unknown error');
      console.error(`[Suspend] All methods failed: ${errorMessage}`);

      if (errorMessage.includes('Access is denied') ||
        errorMessage.includes('permission') ||
        errorMessage.includes('OpenProcess failed') ||
        errorMessage.includes('Cannot find a process') ||
        errorMessage.includes('not found')) {
        throw new Error('Access denied. The process may require administrator privileges, or the process may have exited.');
      }

      throw new Error(`Failed to suspend process: ${errorMessage}`);
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

    // Method 1: Native API via PowerShell Add-Type
    try {
      await this.runNativeSuspendResume(pid, 'resume');
      return true;
    } catch (e: any) {
      console.log(`[Suspend] Native API resume failed, trying cmdlet fallback: ${e.message}`);
    }

    // Method 2: PowerShell cmdlet fallback
    try {
      await this.runCommandSafe('powershell', ['-ExecutionPolicy', 'Bypass', '-NoProfile', '-Command', `Resume-Process -Id ${pid} -ErrorAction Stop`], { timeout: 5000 });
      return true;
    } catch (cmdletError: any) {
      const errorMessage = cmdletError?.stderr || cmdletError?.message || String(cmdletError || 'Unknown error');
      console.error(`[Suspend] All resume methods failed: ${errorMessage}`);

      if (errorMessage.includes('Access is denied') ||
        errorMessage.includes('permission') ||
        errorMessage.includes('OpenProcess failed') ||
        errorMessage.includes('Cannot find a process') ||
        errorMessage.includes('not found')) {
        throw new Error('Access denied. The process may require administrator privileges, or the process may have exited.');
      }

      throw new Error(`Failed to resume process: ${errorMessage}`);
    }
  }

  /**
   * Check if a process is still running
   */
  async isProcessRunning(pid: number): Promise<boolean> {
    if (!this.isWindows) {
      return false;
    }

    try {
      const command = `powershell -Command "Get-Process -Id ${pid} -ErrorAction SilentlyContinue"`;
      const { stdout } = await execAsync(command);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get all running processes (Windows only)
   */
  async getAllProcesses(): Promise<Array<{ pid: number; name: string; path?: string }>> {
    if (!this.isWindows) {
      return [];
    }

    try {
      const command = `powershell -Command "Get-Process | Select-Object Id, ProcessName, Path | ConvertTo-Json"`;
      const { stdout } = await execAsync(command);
      const processes = JSON.parse(stdout);

      // Handle both single object and array
      const processList = Array.isArray(processes) ? processes : [processes];

      return processList.map((p: any) => ({
        pid: p.Id,
        name: p.ProcessName,
        path: p.Path || undefined,
      }));
    } catch (error) {
      console.error('Failed to get process list:', error);
      return [];
    }
  }

  /**
   * Track a launched game process
   */
  trackLaunchedGame(gameId: string, pid: number, title: string, exePath?: string): void {
    this.runningGames.set(gameId, {
      pid,
      gameId,
      title,
      exePath,
      status: 'running',
    });
    console.log(`Tracking game: ${title} (${gameId}) - PID: ${pid}`);
  }

  /**
   * Discover a game process by executable path
   */
  async discoverGameProcess(gameId: string, exePath: string, title: string): Promise<number | null> {
    if (!exePath) {
      return null;
    }

    try {
      const processes = await this.getAllProcesses();
      const exeName = path.basename(exePath).toLowerCase();

      // Try exact match first
      let matchingProcess = processes.find(p => {
        if (p.path) {
          return path.basename(p.path).toLowerCase() === exeName;
        }
        return p.name.toLowerCase() === exeName.replace('.exe', '');
      });

      // If no exact match, try process name match
      if (!matchingProcess) {
        const processName = exeName.replace('.exe', '');
        matchingProcess = processes.find(p =>
          p.name.toLowerCase() === processName
        );
      }

      if (matchingProcess) {
        this.trackLaunchedGame(gameId, matchingProcess.pid, title, exePath);
        return matchingProcess.pid;
      }

      return null;
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

    // Helper to sleep
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < retries; i++) {
      const pid = await this.discoverGameProcess(gameId, exePath, title);
      if (pid) {
        return true;
      }
      await sleep(2000); // Check every 2 seconds
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
    const normalizedProcesses = processes.map((processInfo) => ({
      ...processInfo,
      pathLower: processInfo.path?.toLowerCase(),
      nameLower: processInfo.name.toLowerCase(),
    }));

    for (const game of games) {
      if ((!game.exePath && !game.installationDirectory) || this.runningGames.has(game.id)) {
        continue;
      }

      const normalizedExePath = game.exePath?.toLowerCase();
      const exeBaseName = game.exePath ? path.basename(game.exePath).toLowerCase() : undefined;
      const exeWithoutExtension = exeBaseName ? exeBaseName.replace('.exe', '') : undefined;
      const normalizedInstallDir = game.installationDirectory?.toLowerCase().replace(/\//g, '\\');

      const matchedProcess = normalizedProcesses.find((processInfo) => {
        if (normalizedExePath && processInfo.pathLower && processInfo.pathLower === normalizedExePath) {
          return true;
        }
        if (exeBaseName && processInfo.pathLower) {
          return path.basename(processInfo.pathLower) === exeBaseName;
        }
        if (exeWithoutExtension && processInfo.nameLower === exeWithoutExtension) {
          return true;
        }
        if (normalizedInstallDir && processInfo.pathLower) {
          return processInfo.pathLower.includes(normalizedInstallDir);
        }
        return false;
      });

      if (matchedProcess) {
        this.trackLaunchedGame(game.id, matchedProcess.pid, game.title, game.exePath);
        trackedCount += 1;
      }
    }

    return trackedCount;
  }

  /**
   * Suspend a game by gameId
   */
  async suspendGame(gameId: string): Promise<{ success: boolean; error?: string }> {
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

    // Check if process is still running
    let isRunning = await this.isProcessRunning(gameInfo.pid);
    if (!isRunning) {
      const rediscovered = await this.tryRediscoverTrackedGame(gameInfo);
      if (!rediscovered) {
        this.runningGames.delete(gameId);
        this.suspendedGames.delete(gameId);
        return { success: false, error: 'Game process is no longer running' };
      }

      gameInfo = this.runningGames.get(gameId);
      if (!gameInfo) {
        return { success: false, error: 'Game process could not be rediscovered' };
      }

      isRunning = await this.isProcessRunning(gameInfo.pid);
      if (!isRunning) {
        return { success: false, error: 'Game process is no longer running' };
      }
    }

    try {
      await this.setProcessWindowState(gameInfo.pid, 'minimize');
      const success = await this.suspendProcess(gameInfo.pid);

      if (success) {
        gameInfo.status = 'suspended';
        gameInfo.suspendedAt = Date.now();
        this.suspendedGames.add(gameId);
        console.log(`Suspended game: ${gameInfo.title} (PID: ${gameInfo.pid})`);
        return { success: true };
      } else {
        return { success: false, error: 'Failed to suspend process. The process may have exited or requires administrator privileges.' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Suspend] Error suspending game ${gameInfo.title}:`, errorMessage);

      // Provide more helpful error messages
      if (errorMessage.includes('Access is denied') || errorMessage.includes('Access denied')) {
        return { success: false, error: 'Access denied. Please run Onyx as Administrator to suspend processes.' };
      } else if (errorMessage.includes('Cannot find a process') || errorMessage.includes('not found')) {
        // Process may have exited
        this.runningGames.delete(gameId);
        this.suspendedGames.delete(gameId);
        return { success: false, error: 'Process no longer exists. It may have exited.' };
      }

      return { success: false, error: `Failed to suspend game: ${errorMessage}` };
    }
  }

  /**
   * Resume a suspended game by gameId
   */
  async resumeGame(gameId: string): Promise<{ success: boolean; error?: string }> {
    let gameInfo = this.runningGames.get(gameId);

    if (!gameInfo) {
      return { success: false, error: 'Game process not found' };
    }

    if (gameInfo.status !== 'suspended') {
      return { success: false, error: 'Game is not suspended' };
    }

    // Check if process is still running
    let isRunning = await this.isProcessRunning(gameInfo.pid);
    if (!isRunning) {
      const rediscovered = await this.tryRediscoverTrackedGame(gameInfo);
      if (!rediscovered) {
        this.runningGames.delete(gameId);
        this.suspendedGames.delete(gameId);
        return { success: false, error: 'Game process is no longer running' };
      }

      gameInfo = this.runningGames.get(gameId);
      if (!gameInfo) {
        return { success: false, error: 'Game process could not be rediscovered' };
      }

      isRunning = await this.isProcessRunning(gameInfo.pid);
      if (!isRunning) {
        return { success: false, error: 'Game process is no longer running' };
      }
    }

    try {
      const success = await this.resumeProcess(gameInfo.pid);

      if (success) {
        await this.setProcessWindowState(gameInfo.pid, 'restore');
        gameInfo.status = 'running';
        delete gameInfo.suspendedAt;
        this.suspendedGames.delete(gameId);
        console.log(`Resumed game: ${gameInfo.title} (PID: ${gameInfo.pid})`);
        return { success: true };
      } else {
        return { success: false, error: 'Failed to resume process. May require administrator privileges.' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to resume game: ${errorMessage}` };
    }
  }

  /**
   * Get list of running games
   */
  async getRunningGames(): Promise<RunningGame[]> {
    const runningGames: RunningGame[] = [];

    // Clean up stopped processes
    for (const [gameId, gameInfo] of this.runningGames.entries()) {
      let isRunning = await this.isProcessRunning(gameInfo.pid);

      if (!isRunning) {
        const rediscovered = await this.tryRediscoverTrackedGame(gameInfo);
        if (!rediscovered) {
          this.runningGames.delete(gameId);
          this.suspendedGames.delete(gameId);
          continue;
        }

        const updatedGameInfo = this.runningGames.get(gameId);
        if (!updatedGameInfo) {
          continue;
        }

        isRunning = await this.isProcessRunning(updatedGameInfo.pid);
        if (!isRunning) {
          this.runningGames.delete(gameId);
          this.suspendedGames.delete(gameId);
          continue;
        }
      }

      const currentGameInfo = this.runningGames.get(gameId);
      if (!currentGameInfo) {
        continue;
      }

      runningGames.push({
        gameId: currentGameInfo.gameId,
        title: currentGameInfo.title,
        pid: currentGameInfo.pid,
        status: currentGameInfo.status === 'suspended' ? 'suspended' : 'running',
        exePath: currentGameInfo.exePath,
      });
    }

    return runningGames;
  }

  /**
   * Remove a tracked game (when it closes)
   */
  removeGame(gameId: string): void {
    this.stopLaunchTrackingSession(gameId);
    this.runningGames.delete(gameId);
    this.suspendedGames.delete(gameId);
  }

  /**
   * Start monitoring processes (optional, for auto-detection)
   */
  startProcessMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(async () => {
      // Clean up stopped processes
      for (const [gameId, gameInfo] of this.runningGames.entries()) {
        const isRunning = await this.isProcessRunning(gameInfo.pid);
        if (!isRunning) {
          const rediscovered = await this.tryRediscoverTrackedGame(gameInfo);
          if (!rediscovered) {
            this.runningGames.delete(gameId);
            this.suspendedGames.delete(gameId);
          }
        }
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
   * Cleanup on service shutdown
   */
  cleanup(): void {
    this.stopProcessMonitoring();
    for (const gameId of this.launchTrackingIntervals.keys()) {
      this.stopLaunchTrackingSession(gameId);
    }
    this.runningGames.clear();
    this.suspendedGames.clear();
  }
}
