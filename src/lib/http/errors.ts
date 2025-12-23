import { ZodError } from 'zod';
import { NextResponse } from 'next/server';

export interface APIError {
  error: string;
  message?: string;
  details?: any;
  requestId?: string;
  timestamp?: string;
}

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, _details?: unknown) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export function formatZodError(error: ZodError): APIError {
  const details = error.issues.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return {
    error: 'Validation Error',
    message: 'Request validation failed',
    details,
  };
}

export function formatError(
  error: Error | AppError | ZodError,
  requestId?: string
): { response: APIError; statusCode: number } {
  const timestamp = new Date().toISOString();
  
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      response: {
        ...formatZodError(error),
        requestId,
        timestamp,
      },
      statusCode: 400,
    };
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    return {
      response: {
        error: error.name,
        message: error.message,
        requestId,
        timestamp,
      },
      statusCode: error.statusCode,
    };
  }

  // Handle generic errors (don't expose internal details in production)
  const isDev = process.env.NODE_ENV === 'development';
  
  return {
    response: {
      error: 'Internal Server Error',
      message: isDev ? error.message : 'An unexpected error occurred',
      details: isDev ? { stack: error.stack } : undefined,
      requestId,
      timestamp,
    },
    statusCode: 500,
  };
}

export function formatErrorResponse(
  message: string,
  statusCode: number = 500,
  details?: any,
  requestId?: string
): NextResponse {
  const errorResponse: APIError = {
    error: message,
    details,
    requestId,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(errorResponse, { status: statusCode });
}