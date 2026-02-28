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
    systemCpuUsage?: number;
  };
}
