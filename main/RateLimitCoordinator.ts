/**
 * Global rate limiting coordinator for all API services
 * Ensures all API calls across all services respect rate limits
 */
interface QueuedRequest<T> {
  service: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

export class RateLimitCoordinator {
  private globalQueue: QueuedRequest<any>[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private readonly MIN_GLOBAL_INTERVAL = 100; // 100ms minimum between any API calls
  private serviceLastRequestTime = new Map<string, number>();
  private serviceMinIntervals = new Map<string, number>([
    ['igdb', 250],      // IGDB: 4 req/sec
    ['steamgriddb', 250], // SteamGridDB: 4 req/sec
    ['rawg', 250],      // RAWG: 4 req/sec
    ['steam', 500],     // Steam Store API: more conservative
    ['search', 100],    // General search: 100ms
    ['artwork', 100],   // Artwork fetch: 100ms
    ['description', 100], // Description fetch: 100ms
  ]);

  /**
   * Queue a request with rate limiting
   */
  async queueRequest<T>(service: string, execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.globalQueue.push({ service, execute, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.globalQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.globalQueue.length > 0) {
        // Check global minimum interval
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_GLOBAL_INTERVAL) {
          await new Promise(resolve =>
            setTimeout(resolve, this.MIN_GLOBAL_INTERVAL - timeSinceLastRequest)
          );
        }

        // Check service-specific interval
        const request = this.globalQueue[0];
        const serviceInterval = this.serviceMinIntervals.get(request.service) || this.MIN_GLOBAL_INTERVAL;
        const serviceLastTime = this.serviceLastRequestTime.get(request.service) || 0;
        const timeSinceServiceRequest = Date.now() - serviceLastTime;

        if (timeSinceServiceRequest < serviceInterval) {
          await new Promise(resolve =>
            setTimeout(resolve, serviceInterval - timeSinceServiceRequest)
          );
        }

        // Remove from queue and execute
        const queuedRequest = this.globalQueue.shift();
        if (!queuedRequest) break;

        this.lastRequestTime = Date.now();
        this.serviceLastRequestTime.set(queuedRequest.service, Date.now());

        try {
          const result = await queuedRequest.execute();
          queuedRequest.resolve(result);
        } catch (error) {
          queuedRequest.reject(error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.globalQueue.length;
  }

  /**
   * Clear the queue (useful for error recovery)
   */
  clearQueue(): void {
    this.globalQueue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.globalQueue = [];
  }
}

// Singleton instance
let rateLimitCoordinatorInstance: RateLimitCoordinator | null = null;

export function getRateLimitCoordinator(): RateLimitCoordinator {
  if (!rateLimitCoordinatorInstance) {
    rateLimitCoordinatorInstance = new RateLimitCoordinator();
  }
  return rateLimitCoordinatorInstance;
}
