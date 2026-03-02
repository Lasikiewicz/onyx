export type ImageJobPhase = 'queued' | 'downloading' | 'optimizing' | 'done' | 'failed' | 'skipped';

export interface OptimizationAttemptSummary {
  worker?: { attempted: boolean; outBytes?: number; error?: string };
  ffmpeg?: { attempted: boolean; outBytes?: number; error?: string };
  sharp?: { attempted: boolean; outBytes?: number; error?: string };
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
