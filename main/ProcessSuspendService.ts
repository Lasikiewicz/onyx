import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'node:path';
import { platform } from 'node:os';

const execAsync = promisify(exec);

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

export class ProcessSuspendService {
  private runningGames: Map<string, ProcessInfo> = new Map();
  private suspendedGames: Set<string> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isWindows: boolean;

  constructor() {
    this.isWindows = platform() === 'win32';
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

    try {
      // Try multiple methods to suspend the process
      // Method 1: PowerShell Suspend-Process
      try {
        const command = `powershell -ExecutionPolicy Bypass -NoProfile -Command "Suspend-Process -Id ${pid} -ErrorAction Stop"`;
        await execAsync(command, { timeout: 5000 });
        return true;
      } catch (psError: any) {
        console.log(`[Suspend] PowerShell method failed, trying alternative: ${psError.message}`);

        // Method 2: Try using wmic (Windows Management Instrumentation)
        try {
          const wmicCommand = `wmic process where processid=${pid} call suspend`;
          await execAsync(wmicCommand, { timeout: 5000 });
          return true;
        } catch (wmicError: any) {
          console.log(`[Suspend] WMIC method failed, trying ntsd: ${wmicError.message}`);

          // Method 3: Try using ntsd (Windows Debugger) - requires admin but very reliable
          try {
            // ntsd approach: use debugger to suspend
            // Note: This is a workaround - ntsd doesn't directly suspend, but we can use it
            // Actually, let's just throw the original error with better message
            throw psError; // Re-throw original PowerShell error
          } catch (ntsdError: any) {
            const errorMessage = psError?.stderr || psError?.message || String(psError);
            console.error(`[Suspend] All methods failed: ${errorMessage}`);

            // Check for permission errors
            if (errorMessage.includes('Access is denied') ||
              errorMessage.includes('permission') ||
              errorMessage.includes('Cannot find a process') ||
              errorMessage.includes('not found')) {
              throw new Error('Access denied. The process may require administrator privileges, or the process may have exited.');
            }

            throw new Error(`Failed to suspend process: ${errorMessage}`);
          }
        }
      }
    } catch (error: any) {
      const errorMessage = error?.stderr || error?.message || String(error);
      console.error(`[Suspend] Failed to suspend process ${pid}:`, errorMessage);
      throw error; // Re-throw to let caller handle
    }
  }

  /**
   * Resume a suspended process by PID
   */
  async resumeProcess(pid: number): Promise<boolean> {
    if (!this.isWindows) {
      throw new Error('Suspend/resume is only supported on Windows');
    }

    try {
      // Try multiple methods to resume the process
      // Method 1: PowerShell Resume-Process
      try {
        const command = `powershell -ExecutionPolicy Bypass -NoProfile -Command "Resume-Process -Id ${pid} -ErrorAction Stop"`;
        await execAsync(command, { timeout: 5000 });
        return true;
      } catch (psError: any) {
        console.log(`[Suspend] PowerShell resume method failed, trying alternative: ${psError.message}`);

        // Method 2: Try using wmic (Windows Management Instrumentation)
        try {
          const wmicCommand = `wmic process where processid=${pid} call resume`;
          await execAsync(wmicCommand, { timeout: 5000 });
          return true;
        } catch (wmicError: any) {
          console.log(`[Suspend] WMIC resume method failed: ${wmicError.message}`);

          // Re-throw original PowerShell error with better message
          const errorMessage = psError?.stderr || psError?.message || String(psError);
          console.error(`[Suspend] All resume methods failed: ${errorMessage}`);

          // Check for permission errors
          if (errorMessage.includes('Access is denied') ||
            errorMessage.includes('permission') ||
            errorMessage.includes('Cannot find a process') ||
            errorMessage.includes('not found')) {
            throw new Error('Access denied. The process may require administrator privileges, or the process may have exited.');
          }

          throw new Error(`Failed to resume process: ${errorMessage}`);
        }
      }
    } catch (error: any) {
      const errorMessage = error?.stderr || error?.message || String(error);
      console.error(`[Suspend] Failed to resume process ${pid}:`, errorMessage);
      throw error; // Re-throw to let caller handle
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

  /**
   * Suspend a game by gameId
   */
  async suspendGame(gameId: string): Promise<{ success: boolean; error?: string }> {
    const gameInfo = this.runningGames.get(gameId);

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
    const isRunning = await this.isProcessRunning(gameInfo.pid);
    if (!isRunning) {
      this.runningGames.delete(gameId);
      this.suspendedGames.delete(gameId);
      return { success: false, error: 'Game process is no longer running' };
    }

    try {
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
    const gameInfo = this.runningGames.get(gameId);

    if (!gameInfo) {
      return { success: false, error: 'Game process not found' };
    }

    if (gameInfo.status !== 'suspended') {
      return { success: false, error: 'Game is not suspended' };
    }

    // Check if process is still running
    const isRunning = await this.isProcessRunning(gameInfo.pid);
    if (!isRunning) {
      this.runningGames.delete(gameId);
      this.suspendedGames.delete(gameId);
      return { success: false, error: 'Game process is no longer running' };
    }

    try {
      const success = await this.resumeProcess(gameInfo.pid);

      if (success) {
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
      const isRunning = await this.isProcessRunning(gameInfo.pid);

      if (!isRunning) {
        this.runningGames.delete(gameId);
        this.suspendedGames.delete(gameId);
        continue;
      }

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

  /**
   * Remove a tracked game (when it closes)
   */
  removeGame(gameId: string): void {
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
          this.runningGames.delete(gameId);
          this.suspendedGames.delete(gameId);
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
    this.runningGames.clear();
    this.suspendedGames.clear();
  }
}
