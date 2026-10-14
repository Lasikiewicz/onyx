import { execFile } from 'node:child_process';

export interface ProcessInfo {
  pid: number;
  exePath: string;
}

/**
 * Helper and overlay executables that run from a game's folder but are not the game itself.
 * Matched as substrings of the executable file name, lowercased.
 */
const IGNORED_EXE_NAME_PARTS = ['steamhelper', 'overlay', 'crashreport', 'launcher'];

/**
 * Parse the JSON from `Get-CimInstance Win32_Process | Select ProcessId, ExecutablePath | ConvertTo-Json`.
 * PowerShell emits a bare object, not an array, when there is only one process, so both shapes
 * are accepted. Entries without a usable PID or path are skipped.
 */
export function parseProcessList(json: string): ProcessInfo[] {
  const trimmed = json.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }

  const entries = Array.isArray(parsed) ? parsed : [parsed];
  const processes: ProcessInfo[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const { ProcessId, ExecutablePath } = entry as Record<string, unknown>;
    if (typeof ProcessId !== 'number' || !Number.isInteger(ProcessId) || ProcessId <= 0) continue;
    if (typeof ExecutablePath !== 'string' || ExecutablePath.length === 0) continue;
    processes.push({ pid: ProcessId, exePath: ExecutablePath });
  }
  return processes;
}

/**
 * The PID of the first process that runs from `installDir`, skipping helpers and overlays.
 * Matching is case-insensitive and treats both slash styles as equal. The install directory must
 * match whole path segments, so `C:\Games\Foo` does not match `C:\Games\Foo2\game.exe`.
 */
export function findProcessByInstallDir(processes: ProcessInfo[], installDir: string): number | undefined {
  const normalize = (value: string) => value.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
  const dir = normalize(installDir);
  if (!dir) return undefined;

  for (const processInfo of processes) {
    const exe = normalize(processInfo.exePath);
    if (!exe.startsWith(dir + '\\')) continue;

    const exeName = exe.split('\\').pop() ?? '';
    if (IGNORED_EXE_NAME_PARTS.some((part) => exeName.includes(part))) continue;

    return processInfo.pid;
  }
  return undefined;
}

/**
 * Snapshot of running processes with their executable paths. Uses CIM rather than `wmic`, which
 * is removed from current Windows 11 builds (A7). Returns an empty list on failure.
 */
export function listProcesses(): Promise<ProcessInfo[]> {
  if (process.platform !== 'win32') return Promise.resolve([]);

  const script = 'Get-CimInstance Win32_Process | Select-Object ProcessId, ExecutablePath | ConvertTo-Json -Compress';
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          console.error('[ProcessLookup] Process listing failed:', error.message);
          resolve([]);
          return;
        }
        resolve(parseProcessList(stdout));
      },
    );
  });
}
