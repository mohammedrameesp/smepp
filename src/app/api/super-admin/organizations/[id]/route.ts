/**
 * @file route.ts
 * @description Get, update, or delete a specific organization
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import logger from '@/lib/core/log';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Get organization with basic info
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teamMembers: true,
            assets: true,
          },
        },
        teamMembers: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            isOwner: true,
            joinedAt: true,
          },
          orderBy: [
            { isOwner: 'desc' },
            { joinedAt: 'asc' },
          ],
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get module-specific counts for insights
    const [
      subscriptionsCount,
      suppliersCount,
      employeesCount,
      leaveRequestsCount,
      payrollRunsCount,
      spendRequestsCount,
      companyDocsCount,
      assetRequestsCount,
    ] = await Promise.all([
      prisma.subscription.count({ where: { tenantId: id } }),
      prisma.supplier.count({ where: { tenantId: id } }),
      prisma.teamMember.count({ where: { tenantId: id, isEmployee: true, isDeleted: false } }),
      prisma.leaveRequest.count({ where: { tenantId: id } }),
      prisma.payrollRun.count({ where: { tenantId: id } }),
      prisma.spendRequest.count({ where: { tenantId: id } }),
      prisma.companyDocument.count({ where: { tenantId: id } }),
      prisma.assetRequest.count({ where: { tenantId: id } }),
    ]);

    // Get recent activity
    const recentActivity = await prisma.activityLog.findMany({
      where: { tenantId: id },
      take: 10,
      orderBy: { at: 'desc' },
      include: {
        actorMember: {
          select: { name: true, email: true },
        },
      },
    });

    // Get pending items counts
    const [
      pendingLeaveRequests,
      pendingSpendRequests,
      pendingSuppliers,
      pendingAssetRequests,
    ] = await Promise.all([
      prisma.leaveRequest.count({ where: { tenantId: id, status: 'PENDING' } }),
      prisma.spendRequest.count({ where: { tenantId: id, status: 'PENDING' } }),
      prisma.supplier.count({ where: { tenantId: id, status: 'PENDING' } }),
      prisma.assetRequest.count({ where: { tenantId: id, status: 'PENDING_ADMIN_APPROVAL' } }),
    ]);

    // Build module insights
    const moduleInsights = {
      assets: {
        total: organization._count.assets,
        requests: assetRequestsCount,
        pendingRequests: pendingAssetRequests,
      },
      subscriptions: {
        total: subscriptionsCount,
      },
      suppliers: {
        total: suppliersCount,
        pending: pendingSuppliers,
      },
      employees: {
        total: employeesCount,
      },
      leave: {
        totalRequests: leaveRequestsCount,
        pending: pendingLeaveRequests,
      },
      payroll: {
        totalRuns: payrollRunsCount,
      },
      'spend-requests': {
        total: spendRequestsCount,
        pending: pendingSpendRequests,
      },
      documents: {
        total: companyDocsCount,
      },
    };

    return NextResponse.json({
      organization,
      moduleInsights,
      recentActivity,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined }, 'Get organization error');
    return NextResponse.json(
      { error: 'Failed to get organization' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/super-admin/organizations/[id] - Update organization
// ═══════════════════════════════════════════════════════════════════════════════

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  maxUsers: z.number().min(1).optional(),
  maxAssets: z.number().min(1).optional(),
  aiChatEnabled: z.boolean().optional(),
  aiTokenBudgetMonthly: z.number().min(1000).nullable().optional(),
  // For updating pending owner invitation email
  ownerInvitationId: z.string().optional(),
  newOwnerEmail: z.string().email().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateOrgSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check if organization exists
    const existing = await prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const { name, maxUsers, maxAssets, aiChatEnabled, aiTokenBudgetMonthly, ownerInvitationId, newOwnerEmail } = result.data;

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(maxUsers && { maxUsers }),
        ...(maxAssets && { maxAssets }),
        ...(aiChatEnabled !== undefined && { aiChatEnabled }),
        ...(aiTokenBudgetMonthly !== undefined && { aiTokenBudgetMonthly }),
      },
    });

    // Update pending owner invitation email if provided
    let updatedInvitation = null;
    if (ownerInvitationId && newOwnerEmail) {
      // Verify the invitation exists, belongs to this org, and is not yet accepted
      const invitation = await prisma.organizationInvitation.findFirst({
        where: {
          id: ownerInvitationId,
          organizationId: id,
          role: 'OWNER',
          acceptedAt: null,
        },
      });

      if (invitation) {
        // Check if new email is already used as an owner
        const existingOwner = await prisma.teamMember.findFirst({
          where: {
            email: newOwnerEmail.toLowerCase(),
            isOwner: true,
            isDeleted: false,
          },
        });

        if (existingOwner) {
          return NextResponse.json(
            { error: 'This email is already associated with another organization as owner' },
            { status: 409 }
          );
        }

        // Update the invitation email
        updatedInvitation = await prisma.organizationInvitation.update({
          where: { id: ownerInvitationId },
          data: { email: newOwnerEmail.toLowerCase() },
          select: { id: true, email: true },
        });

        logger.info({ orgId: id, oldEmail: invitation.email, newEmail: newOwnerEmail }, 'Updated pending owner invitation email');

        // Trigger resend-invite to send email to the new address
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          await fetch(`${baseUrl}/api/organizations/resend-invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: newOwnerEmail.toLowerCase() }),
          });
          logger.info({ email: newOwnerEmail, orgId: id }, 'Triggered resend-invite after owner email update');
        } catch (emailError) {
          logger.error({ error: emailError instanceof Error ? emailError.message : 'Unknown error' }, 'Failed to trigger resend-invite');
        }
      }
    }

    return NextResponse.json({ organization, updatedInvitation });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined }, 'Update organization error');
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/super-admin/organizations/[id] - Delete organization and all users
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cleanup all Supabase storage files for an organization:
 * - Logos in durj-storage/orgs/{orgId}/
 * - Tenant files in durj-storage/{tenantId}/
 * - Backups in database-backups/orgs/{orgSlug}/
 */
async function cleanupOrganizationStorage(orgId: string, orgSlug: string) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.warn('Supabase not configured, skipping storage cleanup');
    return { logos: 0, files: 0, backups: 0 };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const storageBucket = process.env.SUPABASE_BUCKET || 'durj-storage';
  const backupBucket = 'database-backups';

  let logosDeleted = 0;
  let filesDeleted = 0;
  let backupsDeleted = 0;

  // 1. Delete logos from durj-storage/orgs/{orgId}/
  try {
    const logoFolder = `orgs/${orgId}`;
    const { data: logoFiles } = await supabase.storage
      .from(storageBucket)
      .list(logoFolder);

    if (logoFiles && logoFiles.length > 0) {
      const paths = logoFiles.map(f => `${logoFolder}/${f.name}`);
      const { error } = await supabase.storage.from(storageBucket).remove(paths);
      if (!error) {
        logosDeleted = paths.length;
        logger.info({ orgId, count: logosDeleted }, 'Deleted organization logos');
      }
    }
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', orgId }, 'Failed to cleanup logos');
  }

  // 2. Delete all tenant files from durj-storage/{tenantId}/
  try {
    const { data: tenantFiles } = await supabase.storage
      .from(storageBucket)
      .list(orgId); // tenantId = orgId

    if (tenantFiles && tenantFiles.length > 0) {
      const paths = tenantFiles.map(f => `${orgId}/${f.name}`);
      const { error } = await supabase.storage.from(storageBucket).remove(paths);
      if (!error) {
        filesDeleted = paths.length;
        logger.info({ orgId, count: filesDeleted }, 'Deleted tenant files');
      }
    }
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', orgId }, 'Failed to cleanup tenant files');
  }

  // 3. Delete backups from database-backups/orgs/{orgSlug}/
  try {
    const backupFolder = `orgs/${orgSlug}`;
    const { data: backupFiles } = await supabase.storage
      .from(backupBucket)
      .list(backupFolder);

    if (backupFiles && backupFiles.length > 0) {
      const paths = backupFiles.map(f => `${backupFolder}/${f.name}`);
      const { error } = await supabase.storage.from(backupBucket).remove(paths);
      if (!error) {
        backupsDeleted = paths.length;
        logger.info({ orgSlug, count: backupsDeleted }, 'Deleted organization backups');
      }
    }
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', orgSlug }, 'Failed to cleanup backups');
  }

  return { logos: logosDeleted, files: filesDeleted, backups: backupsDeleted };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: { teamMembers: true, assets: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get all member emails from TeamMember for this org
    const teamMembers = await prisma.teamMember.findMany({
      where: { tenantId: id },
      select: { email: true },
    });
    const memberEmails = teamMembers.map((m) => m.email);

    // Find members who belong to OTHER organizations (multi-org users)
    const membersInOtherOrgs = await prisma.teamMember.findMany({
      where: {
        email: { in: memberEmails },
        tenantId: { not: id },
        isDeleted: false,
      },
      select: { email: true },
    });
    const emailsInOtherOrgs = new Set(membersInOtherOrgs.map(m => m.email));

    // Emails of users who ONLY belong to this org (will be cleaned up)
    const uniqueEmails = memberEmails.filter(email => !emailsInOtherOrgs.has(email));

    // Capture slug before deletion for backup cleanup
    const { slug } = organization;

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete organization (cascades: TeamMember, invitations, assets, subscriptions, etc.)
      await tx.organization.delete({
        where: { id },
      });

      // 2. Delete User records for emails that don't belong to any other organization
      if (uniqueEmails.length > 0) {
        await tx.user.deleteMany({
          where: {
            email: { in: uniqueEmails },
            isSuperAdmin: false, // Never delete super admins
          },
        });
      }
    });

    // Cleanup storage files (non-blocking - failures don't affect response)
    const storageCleanup = await cleanupOrganizationStorage(id, slug);

    return NextResponse.json({
      success: true,
      deleted: {
        organization: organization.name,
        members: organization._count.teamMembers,
        usersDeleted: uniqueEmails.length,
        usersRetained: memberEmails.length - uniqueEmails.length,
        assets: organization._count.assets,
        storage: storageCleanup,
      }
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined }, 'Delete organization error');
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
