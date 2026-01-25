/**
 * @file error-logger.ts
 * @description Centralized error logging service for tracking all errors across the application.
 *              Logs API errors, client errors, and service errors to the database.
 *              Sends email notifications to super admin for all logged errors.
 * @module lib/core
 */

import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import logger from './log';
import { sendEmail } from './email';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ErrorType = 'API_ERROR' | 'CLIENT_ERROR' | 'SERVICE_ERROR';
export type ErrorSeverity = 'warning' | 'error' | 'critical';

export interface ErrorContext {
  // Error classification
  type: ErrorType;
  source: string; // Module or component (e.g., "assets", "leave", "ui/dashboard")
  action?: string; // Specific action (e.g., "create", "approve")

  // Tenant context (optional - not all errors have tenant context)
  tenantId?: string;

  // Request info (for API errors)
  requestId?: string;
  method?: string; // GET, POST, etc.
  path?: string; // /api/assets/[id]

  // User info
  userId?: string;
  userEmail?: string;
  userRole?: string; // ADMIN, MEMBER, etc.

  // Error details
  message: string;
  stack?: string;
  statusCode?: number;
  errorCode?: string;

  // Additional context
  metadata?: Record<string, unknown>;
  userAgent?: string;

  // Severity
  severity?: ErrorSeverity;
}

// Rate limiting to prevent spam during cascading failures
const recentErrors = new Map<string, number>();
const ERROR_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between identical errors

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Log a system error to the database and notify super admin via email.
 * Non-blocking - failures are logged but don't throw.
 * Use this function to track errors across the application.
 */
export async function handleSystemError(context: ErrorContext): Promise<void> {
  try {
    // Generate a unique key for rate limiting
    const errorKey = generateErrorKey(context);
    const lastError = recentErrors.get(errorKey);
    const now = Date.now();

    if (lastError && now - lastError < ERROR_COOLDOWN_MS) {
      logger.debug(
        { errorKey, lastErrorAgo: now - lastError },
        'Skipping duplicate error log (rate limited)'
      );
      return;
    }

    recentErrors.set(errorKey, now);

    // Clean up old entries periodically
    if (recentErrors.size > 200) {
      const cutoff = now - ERROR_COOLDOWN_MS;
      for (const [key, time] of recentErrors) {
        if (time < cutoff) {
          recentErrors.delete(key);
        }
      }
    }

    // Run both operations in parallel
    await Promise.all([
      persistErrorLog(context),
      notifySuperAdmin(context),
    ]);
  } catch (error) {
    // Never throw - just log the meta-error
    logger.error(
      { error: error instanceof Error ? error.message : String(error), context },
      'Failed to handle system error'
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Persist error to database for super admin dashboard.
 */
async function persistErrorLog(context: ErrorContext): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        type: context.type,
        source: context.source,
        action: context.action,
        tenantId: context.tenantId,
        requestId: context.requestId,
        method: context.method,
        path: context.path,
        userId: context.userId,
        userEmail: context.userEmail,
        userRole: context.userRole,
        message: context.message,
        stack: context.stack,
        statusCode: context.statusCode,
        errorCode: context.errorCode,
        metadata: context.metadata ? (context.metadata as Prisma.InputJsonValue) : undefined,
        userAgent: context.userAgent,
        severity: context.severity || 'error',
      },
    });
    logger.debug(
      { type: context.type, source: context.source, severity: context.severity },
      'Persisted error to database'
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error), source: context.source },
      'Failed to persist error to database'
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send email to super admin about the system error.
 */
async function notifySuperAdmin(context: ErrorContext): Promise<void> {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    logger.warn('SUPER_ADMIN_EMAIL not configured - cannot send error alert');
    return;
  }

  try {
    const { systemErrorAlertEmail } = await import('./error-alert-templates');
    const emailData = systemErrorAlertEmail(context);

    const result = await sendEmail({
      to: superAdminEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });

    if (result.success) {
      logger.info(
        { type: context.type, source: context.source, severity: context.severity },
        'Sent error alert to super admin'
      );
    } else {
      // Don't recurse - just log the meta-failure
      logger.error(
        { error: result.error, source: context.source },
        'Failed to send error alert to super admin'
      );
    }
  } catch (error) {
    // Don't throw - this is already an error handler
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Exception while notifying super admin about error'
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique key for rate limiting duplicate errors.
 */
function generateErrorKey(context: ErrorContext): string {
  // Include relevant fields to identify unique errors
  const parts = [
    context.type,
    context.source,
    context.action || '',
    context.tenantId || '',
    context.path || '',
    context.statusCode?.toString() || '',
    // Use first 100 chars of message to group similar errors
    context.message.substring(0, 100),
  ];
  return parts.join(':');
}

/**
 * Helper to extract module name from request path.
 * e.g., "/api/assets/123" -> "assets"
 */
export function getModuleFromPath(path: string): string {
  const match = path.match(/\/api\/([^/]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Helper to create error context from an Error object.
 */
export function createErrorContext(
  error: Error,
  overrides: Partial<ErrorContext> & Pick<ErrorContext, 'type' | 'source'>
): ErrorContext {
  return {
    message: error.message,
    stack: error.stack,
    ...overrides,
  };
}
