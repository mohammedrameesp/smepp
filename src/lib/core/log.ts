// Simple logger that works in all environments
const isDev = process.env.NODE_ENV === 'development';

const logger = {
  info: (data: any, message?: string) => {
    if (isDev) {
      console.log(`[INFO] ${message || ''}`, data);
    }
  },
  warn: (data: any, message?: string) => {
    if (isDev) {
      console.warn(`[WARN] ${message || ''}`, data);
    }
  },
  error: (data: any, message?: string) => {
    console.error(`[ERROR] ${message || ''}`, data);
  },
  debug: (data: any, message?: string) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message || ''}`, data);
    }
  },
  child: (context: any) => ({
    info: (data: any, message?: string) => logger.info({ ...context, ...data }, message),
    warn: (data: any, message?: string) => logger.warn({ ...context, ...data }, message),
    error: (data: any, message?: string) => logger.error({ ...context, ...data }, message),
    debug: (data: any, message?: string) => logger.debug({ ...context, ...data }, message),
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