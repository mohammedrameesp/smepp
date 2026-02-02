/**
 * @file route.ts
 * @description Cron job to permanently delete employees after 30-day retention period.
 *
 * Handles:
 * - Permanent deletion of soft-deleted TeamMember records
 * - Cleanup of employee storage files (QID, passport, photo, contract, profile image)
 *
 * @module api/cron/cleanup-deleted-employees
 *
 * @security
 * - Requires CRON_SECRET for authentication
 * - Files are cleaned up before database deletion
 * - Orphaned files are logged but don't block deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { verifyCronAuth } from '@/lib/security/cron-auth';
import { cleanupStorageFile } from '@/lib/storage';

/** Employee file fields that need cleanup */
const EMPLOYEE_FILE_FIELDS = [
  'image',
  'qidUrl',
  'passportCopyUrl',
  'photoUrl',
  'contractCopyUrl',
] as const;

/**
 * Clean up all storage files for an employee.
 *
 * @param employee - Employee record with file URLs
 * @param tenantId - Tenant ID for ownership verification
 * @returns Count of successfully deleted files
 */
async function cleanupEmployeeFiles(
  employee: {
    id: string;
    image: string | null;
    qidUrl: string | null;
    passportCopyUrl: string | null;
    photoUrl: string | null;
    contractCopyUrl: string | null;
  },
  tenantId: string
): Promise<number> {
  let deletedCount = 0;

  for (const field of EMPLOYEE_FILE_FIELDS) {
    const fileUrl = employee[field];
    if (fileUrl) {
      const deleted = await cleanupStorageFile(fileUrl, tenantId);
      if (deleted) {
        deletedCount++;
        logger.debug({ employeeId: employee.id, field, fileUrl }, 'Deleted employee file');
      }
    }
  }

  return deletedCount;
}

/**
 * Cron job to permanently delete employees whose scheduled deletion date has passed.
 *
 * This runs daily and cleans up soft-deleted employees after the 30-day recovery period.
 * Employee storage files (documents, photos) are deleted before the database record.
 *
 * Schedule: Daily at 4 AM UTC (configure in vercel.json)
 *
 * @example vercel.json configuration:
 * ```json
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/cleanup-deleted-employees",
 *       "schedule": "0 4 * * *"
 *     }
 *   ]
 * }
 * ```
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // SECURITY: Verify cron secret using timing-safe comparison
    const authResult = verifyCronAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Authentication required', details: authResult.error },
        { status: 401 }
      );
    }

    const now = new Date();

    // Find all employees whose scheduled deletion date has passed
    const employeesToDelete = await prisma.teamMember.findMany({
      where: {
        isDeleted: true,
        scheduledDeletionAt: {
          not: null,
          lte: now,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        tenantId: true,
        scheduledDeletionAt: true,
        // File fields for cleanup
        image: true,
        qidUrl: true,
        passportCopyUrl: true,
        photoUrl: true,
        contractCopyUrl: true,
      },
    });

    if (employeesToDelete.length === 0) {
      return NextResponse.json({
        message: 'No employees to permanently delete',
        deletedCount: 0,
        filesDeleted: 0,
      });
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
      filesDeleted: 0,
    };

    // Process each employee
    for (const employee of employeesToDelete) {
      try {
        // 1. Clean up storage files first (non-blocking - failures logged but don't stop deletion)
        const filesDeleted = await cleanupEmployeeFiles(employee, employee.tenantId);
        results.filesDeleted += filesDeleted;

        // 2. Permanently delete the TeamMember record
        await prisma.teamMember.delete({
          where: { id: employee.id },
        });

        results.success.push(employee.id);
        logger.info(
          {
            employeeId: employee.id,
            employeeName: employee.name,
            employeeEmail: employee.email,
            tenantId: employee.tenantId,
            filesDeleted,
            scheduledDeletionAt: employee.scheduledDeletionAt,
          },
          'Permanently deleted employee after retention period'
        );
      } catch (error) {
        logger.error(
          {
            employeeId: employee.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to permanently delete employee'
        );
        results.failed.push({
          id: employee.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info(
      {
        deletedCount: results.success.length,
        failedCount: results.failed.length,
        filesDeleted: results.filesDeleted,
      },
      'Employee cleanup completed'
    );

    return NextResponse.json({
      message: 'Cleanup complete',
      deletedCount: results.success.length,
      failedCount: results.failed.length,
      filesDeleted: results.filesDeleted,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Employee cleanup cron job failed'
    );
    return NextResponse.json(
      {
        error: 'Cleanup job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
