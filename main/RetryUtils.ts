/**
 * Retry utility with exponential backoff
 */
export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.delay ?? 1000;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on authentication errors or rate limits - just throw immediately
      // This allows the caller to move to the next source
      if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 429) {
        if (error.response?.status === 429) {
          console.warn(`[Retry] Rate limited (429), moving to next source`);
        }
        throw error;
      }

      // Retry on network errors only (not rate limits)
      const isNetworkError = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';

      if (isNetworkError && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        if (options.onRetry) {
          options.onRetry(attempt + 1, error);
        } else {
          console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Don't retry on other errors
      throw error;
    }
  }

  throw lastError!;
}
