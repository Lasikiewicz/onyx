export type ImageJobPhase = 'queued' | 'downloading' | 'optimizing' | 'done' | 'failed' | 'skipped';

type OptimizationFailureCategory = 'module-not-found' | 'timeout' | 'process-error' | 'exception' | 'no-result' | 'no-gain';

export interface OptimizationStageAttempt {
  attempted: boolean;
  outBytes?: number;
  error?: string;
  durationMs?: number;
  startedAtMs?: number;
  finishedAtMs?: number;
  failureCategory?: OptimizationFailureCategory;
  args?: string[];
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  stderrTail?: string;
  outputExists?: boolean;
  timedOut?: boolean;
}

export interface OptimizationAttemptSummary {
  inputBytes?: number;
  totalDurationMs?: number;
  contentFormat?: string | null;
  detectedContentFormat?: string | null;
  worker?: OptimizationStageAttempt;
  ffmpeg?: OptimizationStageAttempt;
  sharp?: OptimizationStageAttempt;
  selectedPath?: 'worker' | 'ffmpeg' | 'sharp' | 'original';
}

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
  decisionReason?: string;
  attemptSummary?: OptimizationAttemptSummary;
}

export type OptimizationRunMode = 'importer' | 'cache';

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
