/**
 * @file log.ts
 * @description Simple structured logger for all environments - provides info, warn,
 *              error, and debug levels with request context support
 * @module lib/core
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Structured log data that can be passed to any log level.
 * Supports common fields for request tracing and error details.
 */
export interface LogDataObject {
  requestId?: string;
  userId?: string;
  userEmail?: string;
  tenantId?: string;
  method?: string;
  url?: string;
  status?: number;
  duration?: number;
  error?: string;
  stack?: string;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Log data can be either a structured object or a simple string message.
 * This allows both `logger.info({ requestId: '123' }, 'Processing')` and
 * `logger.info('Simple message')` calling conventions.
 */
export type LogData = LogDataObject | string;

/**
 * Context object for child loggers - typically request-scoped data.
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  userEmail?: string;
  tenantId?: string;
  [key: string]: unknown;
}

/**
 * Logger interface with standard log levels plus child logger factory.
 */
export interface Logger {
  info: (data: LogData, message?: string) => void;
  warn: (data: LogData, message?: string) => void;
  error: (data: LogData, message?: string) => void;
  debug: (data: LogData, message?: string) => void;
  child: (context: LogContext) => Omit<Logger, 'child'>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

// Simple logger that works in all environments
const isDev = process.env.NODE_ENV === 'development';

// Helper to normalize log data - strings become the message, objects stay as data
function normalizeLogData(data: LogData, message?: string): { data: LogDataObject; message?: string } {
  if (typeof data === 'string') {
    return { data: {}, message: data };
  }
  return { data, message };
}

const logger: Logger = {
  info: (data: LogData, message?: string) => {
    if (isDev) {
      const { data: d, message: m } = normalizeLogData(data, message);
      console.log(`[INFO] ${m || ''}`, Object.keys(d).length > 0 ? d : '');
    }
  },
  warn: (data: LogData, message?: string) => {
    if (isDev) {
      const { data: d, message: m } = normalizeLogData(data, message);
      console.warn(`[WARN] ${m || ''}`, Object.keys(d).length > 0 ? d : '');
    }
  },
  error: (data: LogData, message?: string) => {
    const { data: d, message: m } = normalizeLogData(data, message);
    console.error(`[ERROR] ${m || ''}`, Object.keys(d).length > 0 ? d : '');
  },
  debug: (data: LogData, message?: string) => {
    if (isDev) {
      const { data: d, message: m } = normalizeLogData(data, message);
      console.debug(`[DEBUG] ${m || ''}`, Object.keys(d).length > 0 ? d : '');
    }
  },
  child: (context: LogContext) => ({
    info: (data: LogData, message?: string) => {
      const normalized = typeof data === 'string' ? { message: data } : data;
      logger.info({ ...context, ...normalized }, message);
    },
    warn: (data: LogData, message?: string) => {
      const normalized = typeof data === 'string' ? { message: data } : data;
      logger.warn({ ...context, ...normalized }, message);
    },
    error: (data: LogData, message?: string) => {
      const normalized = typeof data === 'string' ? { message: data } : data;
      logger.error({ ...context, ...normalized }, message);
    },
    debug: (data: LogData, message?: string) => {
      const normalized = typeof data === 'string' ? { message: data } : data;
      logger.debug({ ...context, ...normalized }, message);
    },
  }),
};

export default logger;

// Helper to create request-scoped logger
export function createRequestLogger(requestId: string, userId?: string, userEmail?: string) {
  return logger.child({ 
    requestId,
    userId,
    userEmail,
  });
}

// Helper to log API requests
export function logRequest(
  method: string,
  url: string,
  status: number,
  duration: number,
  requestId: string,
  userId?: string,
  userEmail?: string,
  error?: Error
) {
  const logData = {
    requestId,
    method,
    url,
    status,
    duration,
    userId,
    userEmail,
  };

  if (error) {
    logger.error({ ...logData, error: error.message, stack: error.stack }, 'Request failed');
  } else if (status >= 500) {
    logger.error(logData, 'Server error');
  } else if (status >= 400) {
    logger.warn(logData, 'Client error');
  } else {
    logger.info(logData, 'Request completed');
  }
}

// Utility to generate request ID
export function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}