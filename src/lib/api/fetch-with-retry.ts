/**
 * @file fetch-with-retry.ts
 * @description Fetch wrapper with automatic retry and exponential backoff
 * @module lib/api
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in ms between retries (default: 10000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
  retryStatusCodes?: number[];
  /** Whether to retry on network errors (default: true) */
  retryOnNetworkError?: boolean;
  /** Callback fired before each retry attempt */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> & { onRetry?: RetryOptions['onRetry'] } = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryStatusCodes: DEFAULT_RETRY_STATUS_CODES,
  retryOnNetworkError: true,
  onRetry: undefined,
};

/**
 * Check if an error is a network error (fetch failed)
 */
function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    (error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network request failed'))
  );
}

/**
 * Calculate delay for next retry attempt with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'onRetry'>>): number {
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with automatic retry and exponential backoff
 *
 * @example
 * ```ts
 * // Basic usage
 * const response = await fetchWithRetry('/api/data');
 *
 * // With custom options
 * const response = await fetchWithRetry('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * }, {
 *   maxRetries: 5,
 *   onRetry: (attempt, error, delay) => {
 *     console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
 *   },
 * });
 * ```
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const options = { ...DEFAULT_OPTIONS, ...retryOptions };
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= options.maxRetries) {
    try {
      const response = await fetch(input, init);

      // Check if response status should trigger retry
      if (options.retryStatusCodes.includes(response.status) && attempt < options.maxRetries) {
        const delay = calculateDelay(attempt + 1, options);
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);

        options.onRetry?.(attempt + 1, error, delay);
        await sleep(delay);
        attempt++;
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry on network error
      if (options.retryOnNetworkError && isNetworkError(error) && attempt < options.maxRetries) {
        const delay = calculateDelay(attempt + 1, options);

        options.onRetry?.(attempt + 1, lastError, delay);
        await sleep(delay);
        attempt++;
        continue;
      }

      throw lastError;
    }
  }

  // Should not reach here, but just in case
  throw lastError ?? new Error('Max retries exceeded');
}

/**
 * API Error class with status code and details
 */
export class ApiError extends Error {
  status: number;
  details?: unknown;
  isRetryable: boolean;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.isRetryable = DEFAULT_RETRY_STATUS_CODES.includes(status);
  }
}
