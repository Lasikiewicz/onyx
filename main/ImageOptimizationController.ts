/**
 * Single global controller for all background image optimization (importer and cache).
 * Tracks runs, holds authoritative job list, computes aggregates, and emits status for the renderer.
 */

export type OptimizationRunMode = 'importer' | 'cache';

export type ImageJobPhase = 'queued' | 'downloading' | 'optimizing' | 'done' | 'failed' | 'skipped';

export interface ImageJobStatus {
  jobId: string;
  gameId: string;
  gameTitle: string;
  imageType: string;
  source?: 'importer' | 'cache';
  phase: ImageJobPhase;
  updatedAt?: number;
  sourceExt?: string;
  fileName?: string;
  originalBytes?: number;
  optimizedBytes?: number;
  error?: string;
}

export interface OptimizationStatus {
  mode: OptimizationRunMode | null;
  runId: string | null;
  gamesDone: number;
  gamesQueued: number;
  imagesDone: number;
  imagesQueued: number;
  jobs: ImageJobStatus[];
  hasActivity: boolean;
  runtime?: {
    profile?: 'low' | 'balanced' | 'high';
    cpuCount?: number;
    reserveCores?: number;
    availableWorkers?: number;
    maxWorkers?: number;
    activeWorkers?: number;
    queuedGames?: number;
    allStaticComplete?: boolean;
    systemCpuUsage?: number;
  };
}

type StatusListener = (status: OptimizationStatus) => void;

const LISTENERS: Set<StatusListener> = new Set();
let currentRunId: string | null = null;
let currentMode: OptimizationRunMode | null = null;
let jobs: ImageJobStatus[] = [];
let runtime: OptimizationStatus['runtime'] = undefined;

function nextRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function computeAggregates(): { gamesDone: number; gamesQueued: number; imagesDone: number; imagesQueued: number } {
  const gameSet = new Set<string>();
  const gameDone = new Set<string>();
  let imagesDone = 0;
  let imagesQueued = 0;
  for (const j of jobs) {
    gameSet.add(j.gameId);
    if (j.phase === 'done' || j.phase === 'failed' || j.phase === 'skipped') {
      imagesDone++;
      gameDone.add(j.gameId);
    } else {
      imagesQueued++;
    }
  }
  const gamesDone = gameDone.size;
  const gamesQueued = Math.max(0, gameSet.size - gamesDone);
  return { gamesDone, gamesQueued, imagesDone, imagesQueued };
}

function emit() {
  const { gamesDone, gamesQueued, imagesDone, imagesQueued } = computeAggregates();
  const hasActivity = jobs.some((j) => j.phase !== 'done' && j.phase !== 'failed' && j.phase !== 'skipped');
  const status: OptimizationStatus = {
    mode: currentMode,
    runId: currentRunId,
    gamesDone,
    gamesQueued,
    imagesDone,
    imagesQueued,
    jobs: [...jobs],
    hasActivity,
    runtime,
  };
  LISTENERS.forEach((cb) => {
    try {
      cb(status);
    } catch (e) {
      console.warn('[OptimizationController] Listener error:', e);
    }
  });
}

/**
 * Start a new run. Closes any completed run and resets jobs. Returns the new runId.
 */
export function startRun(mode: OptimizationRunMode): string {
  currentRunId = nextRunId();
  currentMode = mode;
  jobs = [];
  emit();
  return currentRunId;
}

/**
 * Get the current active run id (for which jobs are being added/processed). Null if no run.
 */
export function getCurrentRunId(): string | null {
  return currentRunId;
}

/**
 * Append jobs to the current run. No-op if runId does not match current run.
 * Each job must have jobId, or it will be set to `${gameId}:${imageType}`.
 */
export function addJobs(runId: string, newJobs: (Omit<ImageJobStatus, 'jobId'> & { jobId?: string })[]): void {
  if (runId !== currentRunId) return;
  for (const j of newJobs) {
    const jobId = (j as { jobId?: string }).jobId ?? `${j.gameId}:${j.imageType}`;
    jobs.push({
      jobId,
      gameId: j.gameId,
      gameTitle: j.gameTitle,
      imageType: j.imageType,
      source: j.source ?? (currentMode === 'cache' ? 'cache' : 'importer'),
      phase: 'queued',
      updatedAt: Date.now(),
      sourceExt: j.sourceExt,
      fileName: j.fileName,
      originalBytes: j.originalBytes,
      optimizedBytes: j.optimizedBytes,
      error: j.error,
    });
  }
  emit();
}

/**
 * Update a single job by jobId. No-op if runId does not match.
 */
export function updateJob(
  runId: string,
  jobId: string,
  patch: Partial<Pick<ImageJobStatus, 'phase' | 'sourceExt' | 'fileName' | 'originalBytes' | 'optimizedBytes' | 'error'>>
): void {
  if (runId !== currentRunId) return;
  const job = jobs.find((j) => j.jobId === jobId);
  if (!job) return;
  if (patch.phase !== undefined) job.phase = patch.phase;
  job.updatedAt = Date.now();
  if (patch.sourceExt !== undefined) job.sourceExt = patch.sourceExt;
  if (patch.fileName !== undefined) job.fileName = patch.fileName;
  if (patch.originalBytes !== undefined) job.originalBytes = patch.originalBytes;
  if (patch.optimizedBytes !== undefined) job.optimizedBytes = patch.optimizedBytes;
  if (patch.error !== undefined) job.error = patch.error;
  emit();
}

/**
 * Update a job by gameId + imageType (convenience for queue). No-op if runId does not match.
 * Finds the LATEST matching job by updatedAt timestamp to handle duplicate entries.
 */
export function updateJobByGameAndType(
  runId: string,
  gameId: string,
  imageType: string,
  patch: Partial<Pick<ImageJobStatus, 'phase' | 'sourceExt' | 'fileName' | 'originalBytes' | 'optimizedBytes' | 'error'>>
): void {
  const latestJob = jobs
    .filter((j) => j.gameId === gameId && j.imageType === imageType)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
  if (latestJob) updateJob(runId, latestJob.jobId, patch);
}

/**
 * Mark the run as finished. Keeps completed/failed jobs in status until explicitly cleared
 * so users can review the full optimization report.
 */
export function finishRun(runId: string): void {
  if (runId !== currentRunId) return;
  currentRunId = null;
  currentMode = null;
  emit();
}

export function clearStatus(): void {
  currentRunId = null;
  currentMode = null;
  jobs = [];
  runtime = undefined;
  emit();
}

export function setRuntimeMetrics(metrics: OptimizationStatus['runtime']): void {
  runtime = metrics;
  emit();
}

/**
 * Get current status (for IPC getStatus).
 */
export function getStatus(): OptimizationStatus {
  const { gamesDone, gamesQueued, imagesDone, imagesQueued } = computeAggregates();
  const hasActivity = jobs.some((j) => j.phase !== 'done' && j.phase !== 'failed' && j.phase !== 'skipped');
  return {
    mode: currentMode,
    runId: currentRunId,
    gamesDone,
    gamesQueued,
    imagesDone,
    imagesQueued,
    jobs: [...jobs],
    hasActivity,
    runtime,
  };
}

/**
 * Subscribe to status changes (e.g. main process sends to renderer).
 */
export function onStatusChange(listener: StatusListener): () => void {
  LISTENERS.add(listener);
  return () => LISTENERS.delete(listener);
}
