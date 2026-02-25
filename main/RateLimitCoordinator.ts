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
    ['giantbomb', 250], // Giant Bomb: 4 req/sec
    ['steam', 500],     // Steam Store API: more conservative
    ['search', 100],    // General search: 100ms
    ['artwork', 100],   // Artwork fetch: 100ms
    ['description', 100], // Description fetch: 100ms
  ]);
  private activeRequestsCount = 0;
  private serviceActiveRequests = new Map<string, number>();
  private readonly MAX_CONCURRENT_PER_SERVICE = 2; // Allow 2 parallel requests per service

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
        const now = Date.now();

        // Find the first request in the queue that can be executed based on rate limits
        let executableIndex = -1;

        for (let i = 0; i < this.globalQueue.length; i++) {
          const request = this.globalQueue[i];

          // Check global minimum interval
          const timeSinceLastRequest = now - this.lastRequestTime;
          if (timeSinceLastRequest < this.MIN_GLOBAL_INTERVAL) continue;

          // Check service-specific interval
          const serviceInterval = this.serviceMinIntervals.get(request.service) || this.MIN_GLOBAL_INTERVAL;
          const serviceLastTime = this.serviceLastRequestTime.get(request.service) || 0;
          const timeSinceServiceRequest = now - serviceLastTime;
          if (timeSinceServiceRequest < serviceInterval) continue;

          // Check service-specific concurrency limit
          const activeForService = this.serviceActiveRequests.get(request.service) || 0;
          if (activeForService >= this.MAX_CONCURRENT_PER_SERVICE) continue;

          executableIndex = i;
          break;
        }

        if (executableIndex === -1) {
          // No requests can be executed right now, wait a bit and try again
          await new Promise(resolve => setTimeout(resolve, 50));
          continue;
        }

        // Remove the executable request from the queue
        const [queuedRequest] = this.globalQueue.splice(executableIndex, 1);

        this.lastRequestTime = Date.now();
        this.serviceLastRequestTime.set(queuedRequest.service, Date.now());

        // Track active requests for this service
        this.activeRequestsCount++;
        const currentActive = this.serviceActiveRequests.get(queuedRequest.service) || 0;
        this.serviceActiveRequests.set(queuedRequest.service, currentActive + 1);

        // Execute without awaiting so the loop can continue to next requests
        queuedRequest.execute()
          .then(result => queuedRequest.resolve(result))
          .catch(error => queuedRequest.reject(error))
          .finally(() => {
            this.activeRequestsCount--;
            const active = this.serviceActiveRequests.get(queuedRequest.service) || 1;
            this.serviceActiveRequests.set(queuedRequest.service, active - 1);

            // Trigger another queue process check
            setImmediate(() => this.processQueue());
          });
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
