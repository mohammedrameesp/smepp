/**
 * @file route.ts
 * @description Super-admin storage statistics API
 * @module api/super-admin/storage
 *
 * GET - Get storage statistics per organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

export const dynamic = 'force-dynamic';

/**
 * GET /api/super-admin/storage - Get storage statistics
 * Super-admin only
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // Get all organizations
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get upload activity logs grouped by tenant
    // ActivityLog has action 'UPLOAD_FILE' with metadata containing fileName, fileSize, mimeType
    const _uploadLogs = await prisma.activityLog.groupBy({
      by: ['tenantId'],
      where: {
        action: 'UPLOAD_FILE',
      },
      _count: {
        id: true,
      },
    });

    // Get detailed upload info for size calculation
    const uploadDetails = await prisma.activityLog.findMany({
      where: {
        action: 'UPLOAD_FILE',
      },
      select: {
        tenantId: true,
        payload: true,
        at: true,
      },
    });

    // Calculate storage per organization
    const storageByOrg: Record<string, { fileCount: number; totalSize: number; lastUpload: Date | null }> = {};

    for (const log of uploadDetails) {
      if (!storageByOrg[log.tenantId]) {
        storageByOrg[log.tenantId] = { fileCount: 0, totalSize: 0, lastUpload: null };
      }

      storageByOrg[log.tenantId].fileCount += 1;

      // Extract file size from payload
      const payload = log.payload as { fileSize?: number } | null;
      if (payload?.fileSize) {
        storageByOrg[log.tenantId].totalSize += payload.fileSize;
      }

      // Track last upload
      if (!storageByOrg[log.tenantId].lastUpload || log.at > storageByOrg[log.tenantId].lastUpload!) {
        storageByOrg[log.tenantId].lastUpload = log.at;
      }
    }

    // Combine organization info with storage stats
    const orgStorageStats = organizations.map((org) => {
      const stats = storageByOrg[org.id] || { fileCount: 0, totalSize: 0, lastUpload: null };
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logoUrl,
        createdAt: org.createdAt,
        fileCount: stats.fileCount,
        totalSize: stats.totalSize,
        lastUpload: stats.lastUpload,
      };
    });

    // Sort by total size descending
    orgStorageStats.sort((a, b) => b.totalSize - a.totalSize);

    // Calculate totals
    const totalFiles = orgStorageStats.reduce((sum, org) => sum + org.fileCount, 0);
    const totalStorage = orgStorageStats.reduce((sum, org) => sum + org.totalSize, 0);
    const orgsWithFiles = orgStorageStats.filter((org) => org.fileCount > 0).length;

    return NextResponse.json({
      summary: {
        totalFiles,
        totalStorage,
        totalOrganizations: organizations.length,
        organizationsWithFiles: orgsWithFiles,
      },
      organizations: orgStorageStats,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error fetching storage stats');
    return NextResponse.json({ error: 'Failed to fetch storage statistics' }, { status: 500 });
  }
}
