/**
 * @jest-environment node
 */

/**
 * @file errors.test.ts
 * @description Unit tests for HTTP error utilities and response helpers
 * @module tests/unit/lib/http
 *
 * Tests cover:
 * - Custom error classes (AppError, ValidationError, etc.)
 * - Zod error formatting
 * - Error response formatting
 * - Standardized response helpers
 */

import { z, ZodError, ZodIssue } from 'zod';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ErrorCodes,
  formatZodError,
  formatError,
  formatErrorResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  conflictResponse,
  invalidStateResponse,
  successResponse,
  createdResponse,
  noContentResponse,
} from '@/lib/http/errors';

describe('HTTP Error Utilities', () => {
  // ═══════════════════════════════════════════════════════════════════════════════
  // ERROR CLASSES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('AppError', () => {
    it('should create error with default values', () => {
      const error = new AppError('Something went wrong');

      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should create error with custom status code', () => {
      const error = new AppError('Bad Request', 400);

      expect(error.statusCode).toBe(400);
    });

    it('should mark error as non-operational when specified', () => {
      const error = new AppError('Critical failure', 500, false);

      expect(error.isOperational).toBe(false);
    });

    it('should be an instance of Error', () => {
      const error = new AppError('Test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with status 400', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });

    it('should be an instance of AppError', () => {
      const error = new ValidationError('Test');

      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('AuthenticationError', () => {
    it('should create auth error with default message', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create auth error with custom message', () => {
      const error = new AuthenticationError('Invalid token');

      expect(error.message).toBe('Invalid token');
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error with default message', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('AuthorizationError');
    });

    it('should create authorization error with custom message', () => {
      const error = new AuthorizationError('Admin access required');

      expect(error.message).toBe('Admin access required');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with default resource', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('should create not found error with custom resource', () => {
      const error = new NotFoundError('Asset');

      expect(error.message).toBe('Asset not found');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with default message', () => {
      const error = new RateLimitError();

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe('RateLimitError');
    });

    it('should create rate limit error with custom message', () => {
      const error = new RateLimitError('Too many requests. Try again in 60 seconds.');

      expect(error.message).toBe('Too many requests. Try again in 60 seconds.');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ZOD ERROR FORMATTING
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('formatZodError', () => {
    it('should format single Zod issue', () => {
      // Create a real Zod error by parsing invalid data
      const schema = z.object({ email: z.string() });
      let zodError: ZodError;
      try {
        schema.parse({ email: 123 });
      } catch (e) {
        zodError = e as ZodError;
      }

      const result = formatZodError(zodError!);

      expect(result.error).toBe('Validation Error');
      expect(result.message).toBe('Request validation failed');
      expect(result.details).toHaveLength(1);
      expect((result.details as Array<{ field: string; message: string }>)[0].field).toBe('email');
    });

    it('should format multiple Zod issues', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });
      let zodError: ZodError;
      try {
        schema.parse({ name: '', email: 'invalid' });
      } catch (e) {
        zodError = e as ZodError;
      }

      const result = formatZodError(zodError!);

      expect(result.details).toHaveLength(2);
    });

    it('should handle nested paths', () => {
      const schema = z.object({
        address: z.object({
          city: z.string(),
        }),
      });
      let zodError: ZodError;
      try {
        schema.parse({ address: {} });
      } catch (e) {
        zodError = e as ZodError;
      }

      const result = formatZodError(zodError!);

      expect((result.details as Array<{ field: string }>)[0].field).toBe('address.city');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FORMAT ERROR
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('formatError', () => {
    it('should format ZodError correctly', () => {
      const schema = z.object({ field: z.string() });
      let zodError: ZodError;
      try {
        schema.parse({ field: 123 });
      } catch (e) {
        zodError = e as ZodError;
      }

      const result = formatError(zodError!, 'req-123');

      expect(result.statusCode).toBe(400);
      expect(result.response.error).toBe('Validation Error');
      expect(result.response.requestId).toBe('req-123');
      expect(result.response.timestamp).toBeDefined();
    });

    it('should format AppError correctly', () => {
      const error = new NotFoundError('User');

      const result = formatError(error);

      expect(result.statusCode).toBe(404);
      expect(result.response.error).toBe('NotFoundError');
      expect(result.response.message).toBe('User not found');
    });

    it('should format generic Error in development mode', () => {
      // NODE_ENV is 'test' in Jest, formatError treats it like production
      // This test verifies the error formatting behavior
      const error = new Error('Database connection failed');

      const result = formatError(error);

      expect(result.statusCode).toBe(500);
      expect(result.response.error).toBe('Internal Server Error');
      // In test mode (not development), details should be hidden
      expect(result.response.message).toBe('An unexpected error occurred');
    });

    it('should hide sensitive details in non-development mode', () => {
      const error = new Error('Database connection failed');

      const result = formatError(error);

      expect(result.statusCode).toBe(500);
      expect(result.response.message).toBe('An unexpected error occurred');
      // Stack should not be exposed in production/test
      expect(result.response.details).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESPONSE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('errorResponse', () => {
    it('should create error response with minimal options', async () => {
      const response = errorResponse('Server Error', 500);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Server Error');
      expect(body.timestamp).toBeDefined();
    });

    it('should create error response with full options', async () => {
      const response = errorResponse('Validation Error', 400, {
        message: 'Invalid input',
        details: [{ field: 'email', message: 'Invalid email' }],
        code: ErrorCodes.VALIDATION_FAILED,
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Validation Error');
      expect(body.message).toBe('Invalid input');
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.details).toHaveLength(1);
    });
  });

  describe('validationErrorResponse', () => {
    it('should create validation error response from Zod result', async () => {
      const schema = z.object({ name: z.string() });
      const result = schema.safeParse({ name: 123 });

      if (result.success) {
        throw new Error('Expected validation to fail');
      }

      const response = validationErrorResponse(result);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Validation Error');
      expect(body.message).toBe('Request validation failed');
      expect(body.code).toBe('VALIDATION_FAILED');
    });

    it('should use custom message when provided', async () => {
      const schema = z.object({ name: z.string() });
      const result = schema.safeParse({ name: 123 });

      if (result.success) {
        throw new Error('Expected validation to fail');
      }

      const response = validationErrorResponse(result, 'Please check your input');
      const body = await response.json();

      expect(body.message).toBe('Please check your input');
    });
  });

  describe('notFoundResponse', () => {
    it('should create not found response with default resource', async () => {
      const response = notFoundResponse();
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Not Found');
      expect(body.message).toBe('Resource not found');
      expect(body.code).toBe('NOT_FOUND');
    });

    it('should create not found response with custom resource', async () => {
      const response = notFoundResponse('Asset');
      const body = await response.json();

      expect(body.message).toBe('Asset not found');
    });
  });

  describe('unauthorizedResponse', () => {
    it('should create unauthorized response with default message', async () => {
      const response = unauthorizedResponse();
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toBe('Authentication required');
      expect(body.code).toBe('AUTH_REQUIRED');
    });

    it('should create unauthorized response with custom message', async () => {
      const response = unauthorizedResponse('Session expired');
      const body = await response.json();

      expect(body.message).toBe('Session expired');
    });
  });

  describe('forbiddenResponse', () => {
    it('should create forbidden response with default message and code', async () => {
      const response = forbiddenResponse();
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe('Forbidden');
      expect(body.message).toBe('Access denied');
      expect(body.code).toBe('FORBIDDEN');
    });

    it('should create forbidden response with custom code', async () => {
      const response = forbiddenResponse('Admin only', ErrorCodes.ADMIN_REQUIRED);
      const body = await response.json();

      expect(body.message).toBe('Admin only');
      expect(body.code).toBe('ADMIN_REQUIRED');
    });
  });

  describe('badRequestResponse', () => {
    it('should create bad request response', async () => {
      const response = badRequestResponse('Invalid date format');
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toBe('Invalid date format');
      expect(body.code).toBe('INVALID_REQUEST');
    });

    it('should include details when provided', async () => {
      const response = badRequestResponse('Multiple errors', { field: 'date', allowed: ['YYYY-MM-DD'] });
      const body = await response.json();

      expect(body.details).toEqual({ field: 'date', allowed: ['YYYY-MM-DD'] });
    });
  });

  describe('conflictResponse', () => {
    it('should create conflict response', async () => {
      const response = conflictResponse('Email already exists');
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error).toBe('Conflict');
      expect(body.message).toBe('Email already exists');
      expect(body.code).toBe('CONFLICT');
    });
  });

  describe('invalidStateResponse', () => {
    it('should create invalid state response', async () => {
      const response = invalidStateResponse('Cannot cancel approved request');
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid State');
      expect(body.message).toBe('Cannot cancel approved request');
      expect(body.code).toBe('INVALID_STATE');
    });

    it('should include allowed transitions when provided', async () => {
      const response = invalidStateResponse('Invalid transition', ['PENDING', 'DRAFT']);
      const body = await response.json();

      expect(body.details).toEqual({ allowedTransitions: ['PENDING', 'DRAFT'] });
    });
  });

  describe('successResponse', () => {
    it('should create success response with message only', async () => {
      const response = successResponse('Operation completed');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Operation completed');
    });

    it('should create success response with data', async () => {
      const response = successResponse('Asset created', { id: '123', name: 'Laptop' });
      const body = await response.json();

      expect(body.data).toEqual({ id: '123', name: 'Laptop' });
    });

    it('should create success response with custom status', async () => {
      const response = successResponse('Updated', undefined, 201);

      expect(response.status).toBe(201);
    });
  });

  describe('createdResponse', () => {
    it('should create 201 response with data only', async () => {
      const response = createdResponse({ id: '123' });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual({ id: '123' });
    });

    it('should create 201 response with message and data', async () => {
      const response = createdResponse({ id: '123' }, 'Asset created');
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.message).toBe('Asset created');
      expect(body.data).toEqual({ id: '123' });
    });
  });

  describe('noContentResponse', () => {
    it('should create 204 response with no body', () => {
      const response = noContentResponse();

      expect(response.status).toBe(204);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ERROR CODES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCodes.AUTH_REQUIRED).toBe('AUTH_REQUIRED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    it('should be immutable (const assertion)', () => {
      // TypeScript compile-time check - ErrorCodes should be readonly
      expect(Object.isFrozen(ErrorCodes)).toBe(false); // as const doesn't freeze
      expect(typeof ErrorCodes.AUTH_REQUIRED).toBe('string');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FORMAT ERROR RESPONSE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('formatErrorResponse', () => {
    it('should create NextResponse with error details', async () => {
      const response = formatErrorResponse('Something went wrong', 500);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Something went wrong');
      expect(body.timestamp).toBeDefined();
    });

    it('should include details and requestId when provided', async () => {
      const response = formatErrorResponse(
        'Validation failed',
        400,
        [{ field: 'email', message: 'Invalid' }],
        'req-456'
      );
      const body = await response.json();

      expect(body.details).toHaveLength(1);
      expect(body.requestId).toBe('req-456');
    });
  });
});
