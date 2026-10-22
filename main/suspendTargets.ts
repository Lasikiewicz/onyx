import path from 'node:path';

/**
 * Pure helpers for Windows suspend/resume.
 *
 * NtSuspendProcess / NtResumeProcess (one call per process, in ntdll) is the
 * same primitive Process Explorer, System Informer, and Nyrna use. It suspends
 * every thread of that process inside the kernel. Walking threads with
 * SuspendThread from user mode races with threads the game creates mid-walk.
 * Job-object freeze is what Windows uses for UWP, but a game launched by Steam
 * or another client is often already in a job, and AssignProcessToJobObject
 * then fails. So the practical approach is NtSuspendProcess on the game plus
 * the descendants that actually belong to it.
 */

export interface SnapshotProcess {
  pid: number;
  name: string;
  path?: string;
  parentPid?: number;
  startedAtMs?: number;
}

export interface SuspendedProcessTarget {
  pid: number;
  startedAtMs?: number;
}

export interface RunningGameSnapshot {
  gameId: string;
  status: 'running' | 'suspended';
}

/** Shell, launcher, and system processes that must never be frozen. */
export const SHELL_AND_LAUNCHER_PROCESS_NAMES = new Set([
  'applicationframehost',
  'cmd',
  'conhost',
  'csrss',
  'dwm',
  'eadesktop',
  'epicgameslauncher',
  'explorer',
  'fontdrvhost',
  'gamingservices',
  'goggalaxy',
  'lsass',
  'msmpeng',
  'onyx',
  'onyxalpha',
  'origin',
  'powershell',
  'pwsh',
  'registry',
  'runtimebroker',
  'searchhost',
  'searchindexer',
  'securityhealthservice',
  'services',
  'shellexperiencehost',
  'sihost',
  'smss',
  'startmenuexperiencehost',
  'steamservice',
  'steamwebhelper',
  'steam',
  'svchost',
  'system',
  'taskhostw',
  'textinputhost',
  'ubisoftconnect',
  'upc',
  'wininit',
  'winlogon',
  'windowsterminal',
  'wt',
  'battlenet',
]);

/**
 * Anti-cheat processes. Freezing these is more likely to close the game or
 * trip the anti-cheat than to pause it. They are skipped as descendants and
 * refused when they are the process we were about to suspend.
 */
export const ANTICHEAT_PROCESS_NAMES = new Set([
  'battleye',
  'bedaisy',
  'beservice',
  'easyanticheat',
  'easyanticheat_eos',
  'easyanticheatservice',
  'faceitclient',
  'faceitservice',
  'pnkbstra',
  'pnkbstrb',
  'vgc',
  'vgtray',
]);

const HELPER_NAME_PARTS = ['crashpad', 'crashreport', 'unitycrashhandler', 'steamhelper'];
const MAX_SUSPEND_TARGETS = 24;
const MAX_TREE_DEPTH = 6;
const START_TIME_TOLERANCE_MS = 2000;

export function normalizeProcessName(name: string): string {
  return name.toLowerCase().replace(/\.exe$/i, '');
}

export function isHelperExecutable(nameOrPath: string | undefined): boolean {
  if (!nameOrPath) return false;
  const base = basenameWindows(nameOrPath).toLowerCase();
  return HELPER_NAME_PARTS.some((part) => base.includes(part));
}

export function basenameWindows(filePath: string): string {
  return path.win32.basename(filePath.replace(/\//g, '\\'));
}

export function pathsEqual(left: string, right: string): boolean {
  const normalize = (value: string) => value.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
  return normalize(left) === normalize(right);
}

/** True when `candidatePath` is `directory` or a file inside it, on a path-segment boundary. */
export function isPathInsideDirectory(candidatePath: string | undefined, directory: string | undefined): boolean {
  if (!candidatePath || !directory) return false;
  const normalize = (value: string) => value.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
  const dir = normalize(directory);
  const candidate = normalize(candidatePath);
  if (!dir || !candidate) return false;
  return candidate === dir || candidate.startsWith(`${dir}\\`);
}

/**
 * WMI/CIM CreationDate arrives as a .NET `\/Date(ms)\/`, a WMI datetime, or an ISO string
 * depending on the PowerShell version.
 */
export function parseWindowsProcessTime(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const ticks = trimmed.match(/\/Date\((-?\d+)/);
  if (ticks) {
    const ms = Number(ticks[1]);
    return Number.isFinite(ms) ? ms : undefined;
  }

  const wmi = trimmed.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.(\d+))?/);
  if (wmi) {
    const [, year, month, day, hour, minute, second, fraction] = wmi;
    const milliseconds = fraction ? Number(`${fraction}000`.slice(0, 3)) : 0;
    return Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      milliseconds,
    );
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseCimProcessList(stdout: string): SnapshotProcess[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }

  const entries = Array.isArray(parsed) ? parsed : [parsed];
  const processes: SnapshotProcess[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const pid = record.ProcessId;
    if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) continue;

    const name = typeof record.Name === 'string' ? normalizeProcessName(record.Name) : '';
    const executablePath = typeof record.ExecutablePath === 'string' && record.ExecutablePath.length > 0
      ? record.ExecutablePath
      : undefined;
    const parentRaw = record.ParentProcessId;
    const parentPid = typeof parentRaw === 'number' && Number.isInteger(parentRaw) && parentRaw > 0
      ? parentRaw
      : undefined;

    processes.push({
      pid,
      name,
      path: executablePath,
      parentPid,
      startedAtMs: parseWindowsProcessTime(record.CreationDate),
    });
  }
  return processes;
}

export function parseNativeActionResults(stdout: string): Map<number, { ok: boolean; error?: string }> {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error('Suspend helper returned no result');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Suspend helper returned unreadable result');
  }

  const entries = Array.isArray(parsed) ? parsed : [parsed];
  const results = new Map<number, { ok: boolean; error?: string }>();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const pid = record.pid;
    if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) continue;
    results.set(pid, {
      ok: record.ok === true,
      error: typeof record.error === 'string' && record.error.length > 0 ? record.error : undefined,
    });
  }
  return results;
}

/** Unknown start times do not fail the check. A known mismatch means the PID was reused. */
export function isSameProcessStart(expected?: number, actual?: number): boolean {
  if (expected == null || actual == null) return true;
  return Math.abs(expected - actual) <= START_TIME_TOLERANCE_MS;
}

export function isDeniedProcessName(name: string | undefined): boolean {
  if (!name) return false;
  const normalized = normalizeProcessName(name);
  return SHELL_AND_LAUNCHER_PROCESS_NAMES.has(normalized) || ANTICHEAT_PROCESS_NAMES.has(normalized);
}

export interface SuspendPlan {
  targets: SnapshotProcess[];
  refusal?: string;
  truncated: boolean;
}

/** Processes Nyrna will not treat as the foreground app, plus system processes that must never be frozen. */
const REFUSED_ROOT_NAMES = new Set([
  'applicationframehost',
  'csrss',
  'dwm',
  'explorer',
  'lsass',
  'services',
  'smss',
  'svchost',
  'system',
  'wininit',
  'winlogon',
]);

function refusalForRoot(name: string): string | undefined {
  const normalized = normalizeProcessName(name);
  if (!normalized) return undefined;
  if (REFUSED_ROOT_NAMES.has(normalized)) {
    return `Refusing to suspend ${normalized} because it is a Windows shell or system process.`;
  }
  return undefined;
}

export type ForegroundSuspendDecision = 'suspend' | 'retry-self' | 'refuse-shell';

/**
 * Same foreground rules Nyrna uses: never suspend Explorer, and if the foreground
 * window is Nyrna itself, hide and look again. In dev, Onyx's process name is electron.
 */
export function foregroundSuspendDecision(
  executable: string,
  pid: number,
  selfPid: number,
): ForegroundSuspendDecision {
  if (pid === selfPid) return 'retry-self';
  const name = normalizeProcessName(executable);
  if (name === 'explorer') return 'refuse-shell';
  if (name === 'onyx' || name === 'onyxalpha' || name === 'electron') return 'retry-self';
  return 'suspend';
}

export interface ForegroundProcess {
  pid: number;
  executable: string;
  path?: string;
}

/**
 * Nyrna suspends the process that owns the focused window. Onyx's launch PID is often
 * the store launcher. Prefer the foreground process when it is actually the game.
 */
export function chooseSuspendRoot(
  trackedPid: number,
  foreground: ForegroundProcess | null,
  game: { exePath?: string; installationDirectory?: string },
): number {
  if (!foreground || foreground.pid <= 4 || foreground.pid === trackedPid) return trackedPid;
  if (foregroundSuspendDecision(foreground.executable, foreground.pid, -1) !== 'suspend') return trackedPid;

  const name = normalizeProcessName(foreground.executable);
  const exeBase = game.exePath ? basenameWindows(game.exePath).toLowerCase() : undefined;
  const exeName = exeBase?.replace(/\.exe$/i, '');
  const pathMatch = Boolean(
    foreground.path
    && game.exePath
    && (pathsEqual(foreground.path, game.exePath)
      || (exeBase && basenameWindows(foreground.path).toLowerCase() === exeBase)),
  );
  const dirMatch = isPathInsideDirectory(foreground.path, game.installationDirectory);
  const nameMatch = Boolean(exeName && name === exeName);
  if (pathMatch || dirMatch || nameMatch) return foreground.pid;
  return trackedPid;
}

/**
 * Root first, then every descendant. This matches Nyrna's Windows repository:
 * NtSuspendProcess on the target, then every process whose parent is that pid, recursively.
 * Children are not filtered by install directory. A helper outside the game folder is
 * often the process that keeps running when a launch stub is all that gets frozen.
 */
export function planSuspendTargets(
  rootPid: number,
  processes: SnapshotProcess[],
  options: { exePath?: string; installationDirectory?: string; selfPid?: number },
): SuspendPlan {
  if (!Number.isInteger(rootPid) || rootPid <= 4) {
    return { targets: [], refusal: 'Refusing to suspend a system process.', truncated: false };
  }
  if (options.selfPid && rootPid === options.selfPid) {
    return { targets: [], refusal: 'Refusing to suspend Onyx itself.', truncated: false };
  }

  const byPid = new Map(processes.map((proc) => [proc.pid, proc]));
  const root = byPid.get(rootPid);
  const refusal = root ? refusalForRoot(root.name) : undefined;
  if (refusal) {
    return { targets: [], refusal, truncated: false };
  }

  const children = new Map<number, SnapshotProcess[]>();
  for (const proc of processes) {
    if (!proc.parentPid || proc.parentPid <= 0) continue;
    const list = children.get(proc.parentPid) ?? [];
    list.push(proc);
    children.set(proc.parentPid, list);
  }

  const targets: SnapshotProcess[] = [];
  const seen = new Set<number>();
  let truncated = false;

  const visit = (proc: SnapshotProcess | undefined, pid: number, depth: number, isRoot: boolean) => {
    if (seen.has(pid) || depth > MAX_TREE_DEPTH) return;
    if (targets.length >= MAX_SUSPEND_TARGETS) {
      truncated = true;
      return;
    }
    if (pid <= 4 || (options.selfPid && pid === options.selfPid)) return;
    seen.add(pid);
    if (!isRoot && !proc) return;

    targets.push(proc ?? { pid, name: '' });
    for (const child of children.get(pid) ?? []) {
      visit(child, child.pid, depth + 1, false);
    }
  };

  visit(root, rootPid, 0, true);
  return { targets, truncated };
}

export function selectResumeTargets(
  targets: SuspendedProcessTarget[],
  processes: SnapshotProcess[],
): SnapshotProcess[] {
  const byPid = new Map(processes.map((proc) => [proc.pid, proc]));
  const selected: SnapshotProcess[] = [];
  for (const target of targets) {
    const live = byPid.get(target.pid);
    if (!live) continue;
    if (!isSameProcessStart(target.startedAtMs, live.startedAtMs)) continue;
    selected.push(live);
  }
  return selected;
}

export interface MatchableGame {
  exePath?: string;
  installationDirectory?: string;
  title?: string;
}

/**
 * Prefer the exact executable, then the same file name, then the same process name,
 * then a non-helper process inside the install directory. Title tokens are only a last resort.
 */
export function matchTrackedProcess(
  processes: SnapshotProcess[],
  game: MatchableGame,
): SnapshotProcess | undefined {
  const exePath = game.exePath;
  const exeBase = exePath ? basenameWindows(exePath).toLowerCase() : undefined;
  const exeName = exeBase?.replace(/\.exe$/i, '');

  const exact = processes.find((proc) => exePath && proc.path && pathsEqual(proc.path, exePath));
  if (exact) return exact;

  const byBase = processes.find((proc) =>
    Boolean(exeBase && proc.path && basenameWindows(proc.path).toLowerCase() === exeBase && !isDeniedProcessName(proc.name)),
  );
  if (byBase) return byBase;

  const byName = processes.find((proc) =>
    Boolean(exeName && normalizeProcessName(proc.name) === exeName && !isDeniedProcessName(proc.name)),
  );
  if (byName) return byName;

  const byInstall = processes.find((proc) =>
    isPathInsideDirectory(proc.path, game.installationDirectory)
    && !isDeniedProcessName(proc.name)
    && !isHelperExecutable(proc.path || proc.name),
  );
  if (byInstall) return byInstall;

  const titleTokens = (game.title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .slice(0, 4);
  if (titleTokens.length === 0) return undefined;

  return processes.find((proc) => {
    if (isDeniedProcessName(proc.name) || isHelperExecutable(proc.path || proc.name)) return false;
    const haystack = `${proc.name} ${proc.path?.toLowerCase() ?? ''}`;
    return titleTokens.some((token) => haystack.includes(token));
  });
}

/** Newest suspended game wins; otherwise the newest running game. Map order is oldest first. */
export function pickShortcutTarget<T extends RunningGameSnapshot>(
  games: T[],
): { action: 'suspend' | 'resume'; game: T } | null {
  const suspended = [...games].reverse().find((game) => game.status === 'suspended');
  if (suspended) return { action: 'resume', game: suspended };
  const running = [...games].reverse().find((game) => game.status === 'running');
  if (running) return { action: 'suspend', game: running };
  return null;
}
