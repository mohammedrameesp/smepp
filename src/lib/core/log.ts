/**
 * @file log.ts
 * @description Simple structured logger for all environments - provides info, warn,
 *              error, and debug levels with request context support.
 *
 * @module lib/core
 *
 * @example
 * ```typescript
 * import logger from '@/lib/core/log';
 *
 * // Simple string message
 * logger.info('Application started');
 *
 * // Structured logging with context
 * logger.info({ userId: '123', action: 'login' }, 'User logged in');
 *
 * // Child logger with persistent context
 * const reqLogger = logger.child({ requestId: 'abc-123' });
 * reqLogger.info('Processing request');
 * reqLogger.error({ error: 'Not found' }, 'Resource missing');
 * ```
 *
 * @security
 * - Logs may contain PII (userEmail, userId) - ensure log storage is secure
 * - Stack traces are logged for errors - do not expose raw logs to end users
 * - In production, only error level logs are written (info/warn/debug suppressed)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Structured log data that can be passed to any log level.
 * Supports common fields for request tracing and error details.
 *
 * @security Fields like `userEmail` contain PII - handle logs appropriately
 */
export interface LogDataObject {
  /** Unique identifier for request tracing */
  requestId?: string;
  /** User ID for audit trail */
  userId?: string;
  /** User email - PII, handle with care in log storage */
  userEmail?: string;
  /** Tenant/organization ID for multi-tenant context */
  tenantId?: string;
  /** HTTP method (GET, POST, etc.) */
  method?: string;
  /** Request URL or endpoint */
  url?: string;
  /** HTTP response status code */
  status?: number;
  /** Request duration in milliseconds */
  duration?: number;
  /** Error message */
  error?: string;
  /** Error stack trace - do not expose to end users */
  stack?: string;
  /** Allow additional arbitrary fields */
  [key: string]: unknown;
}

/**
 * Log data can be either a structured object or a simple string message.
 * This allows both `logger.info({ requestId: '123' }, 'Processing')` and
 * `logger.info('Simple message')` calling conventions.
 */
export type LogData = LogDataObject | string;

/**
 * Context object for child loggers - typically request-scoped data
 * that should be included in all log entries from that logger.
 */
export interface LogContext {
  /** Unique identifier for request tracing */
  requestId?: string;
  /** User ID for audit trail */
  userId?: string;
  /** User email - PII, handle with care */
  userEmail?: string;
  /** Tenant/organization ID */
  tenantId?: string;
  /** Allow additional context fields */
  [key: string]: unknown;
}

/** Return type for normalized log data */
interface NormalizedLogData {
  data: LogDataObject;
  message?: string;
}

/**
 * Child logger interface - same as Logger but without nested child creation.
 */
export type ChildLogger = Omit<Logger, 'child'>;

/**
 * Logger interface with standard log levels plus child logger factory.
 *
 * @example
 * ```typescript
 * // All log levels accept (data, message?) or just (message)
 * logger.info('Simple message');
 * logger.warn({ code: 'RATE_LIMIT' }, 'Too many requests');
 * logger.error({ error: err.message, stack: err.stack }, 'Operation failed');
 * ```
 */
export interface Logger {
  /** Log informational messages (dev only) */
  info: (data: LogData, message?: string) => void;
  /** Log warning messages (dev only) */
  warn: (data: LogData, message?: string) => void;
  /** Log error messages (always, all environments) */
  error: (data: LogData, message?: string) => void;
  /** Log debug messages (dev only) */
  debug: (data: LogData, message?: string) => void;
  /** Create a child logger with persistent context */
  child: (context: LogContext) => ChildLogger;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Whether we're in development mode - controls log output */
const isDev = process.env.NODE_ENV === 'development';

/**
 * Normalizes log data to a consistent format.
 * String inputs become the message with empty data object.
 * Object inputs pass through with optional separate message.
 *
 * @param data - Log data (string message or structured object)
 * @param message - Optional message when data is an object
 * @returns Normalized object with data and message separated
 */
function normalizeLogData(data: LogData, message?: string): NormalizedLogData {
  if (typeof data === 'string') {
    return { data: {}, message: data };
  }
  return { data, message };
}

/**
 * Formats log data for console output.
 * Returns empty string if data object has no keys to avoid cluttering logs.
 *
 * @param data - The structured log data
 * @returns The data object or empty string if no fields
 */
function formatLogData(data: LogDataObject): LogDataObject | string {
  return Object.keys(data).length > 0 ? data : '';
}

/**
 * Main logger instance.
 *
 * Behavior by environment:
 * - Development: All log levels output to console
 * - Production: Only `error` level outputs (info/warn/debug suppressed)
 *
 * @security Error logs always output regardless of environment.
 * Ensure production log aggregation handles PII appropriately.
 */
const logger: Logger = {
  info: (data: LogData, message?: string): void => {
    if (isDev) {
      const { data: d, message: m } = normalizeLogData(data, message);
      console.log(`[INFO] ${m || ''}`, formatLogData(d));
    }
  },

  warn: (data: LogData, message?: string): void => {
    if (isDev) {
      const { data: d, message: m } = normalizeLogData(data, message);
      console.warn(`[WARN] ${m || ''}`, formatLogData(d));
    }
  },

  error: (data: LogData, message?: string): void => {
    // Errors always log regardless of environment
    const { data: d, message: m } = normalizeLogData(data, message);
    console.error(`[ERROR] ${m || ''}`, formatLogData(d));
  },

  debug: (data: LogData, message?: string): void => {
    if (isDev) {
      const { data: d, message: m } = normalizeLogData(data, message);
      console.debug(`[DEBUG] ${m || ''}`, formatLogData(d));
    }
  },

  child: (context: LogContext): ChildLogger => ({
    info: (data: LogData, message?: string): void => {
      const { data: d, message: m } = normalizeLogData(data, message);
      logger.info({ ...context, ...d }, m);
    },
    warn: (data: LogData, message?: string): void => {
      const { data: d, message: m } = normalizeLogData(data, message);
      logger.warn({ ...context, ...d }, m);
    },
    error: (data: LogData, message?: string): void => {
      const { data: d, message: m } = normalizeLogData(data, message);
      logger.error({ ...context, ...d }, m);
    },
    debug: (data: LogData, message?: string): void => {
      const { data: d, message: m } = normalizeLogData(data, message);
      logger.debug({ ...context, ...d }, m);
    },
  }),
};

export default logger;

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST LOGGING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/** HTTP status code threshold for server errors */
const HTTP_SERVER_ERROR = 500;
/** HTTP status code threshold for client errors */
const HTTP_CLIENT_ERROR = 400;

/**
 * Logs an API request with appropriate log level based on status code.
 *
 * Log level selection:
 * - Error object provided → error level with stack trace
 * - Status >= 500 → error level (server error)
 * - Status >= 400 → warn level (client error)
 * - Otherwise → info level (success)
 *
 * @param method - HTTP method (GET, POST, etc.)
 * @param url - Request URL or endpoint path
 * @param status - HTTP response status code
 * @param duration - Request duration in milliseconds
 * @param requestId - Unique request identifier for tracing
 * @param userId - Optional user ID for audit trail
 * @param userEmail - Optional user email (PII - logged for debugging)
 * @param error - Optional error object if request failed
 *
 * @security
 * - userEmail is PII - ensure log storage complies with privacy requirements
 * - error.stack may contain sensitive paths - do not expose to end users
 *
 * @example
 * ```typescript
 * // Successful request
 * logRequest('GET', '/api/users', 200, 45, 'req-123', 'user-456');
 *
 * // Failed request with error
 * logRequest('POST', '/api/orders', 500, 120, 'req-789', 'user-456', undefined, error);
 * ```
 */
export function logRequest(
  method: string,
  url: string,
  status: number,
  duration: number,
  requestId: string,
  userId?: string,
  userEmail?: string,
  error?: Error
): void {
  const logData: LogDataObject = {
    requestId,
    method,
    url,
    status,
    duration,
    userId,
    userEmail,
  };

  if (error) {
    logger.error(
      { ...logData, error: error.message, stack: error.stack },
      'Request failed'
    );
  } else if (status >= HTTP_SERVER_ERROR) {
    logger.error(logData, 'Server error');
  } else if (status >= HTTP_CLIENT_ERROR) {
    logger.warn(logData, 'Client error');
  } else {
    logger.info(logData, 'Request completed');
  }
}

/**
 * Generates a unique request ID for request tracing.
 * Uses crypto.randomUUID() for cryptographically secure, standards-compliant UUIDs.
 *
 * @returns A UUID v4 string (e.g., '550e8400-e29b-41d4-a716-446655440000')
 *
 * @example
 * ```typescript
 * const requestId = generateRequestId();
 * // Returns: '550e8400-e29b-41d4-a716-446655440000'
 * ```
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
