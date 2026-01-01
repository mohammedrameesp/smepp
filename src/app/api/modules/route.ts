import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  MODULE_REGISTRY,
  getSerializableModules,
  canInstallModule,
  canUninstallModule,
} from '@/lib/modules/registry';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/modules - List all available modules with installation status
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization's current settings
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        enabledModules: true,
        subscriptionTier: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get all modules with installation status
    const modules = getSerializableModules().map(module => ({
      ...module,
      isInstalled: org.enabledModules.includes(module.id),
      canInstall: !canInstallModule(module.id, org.enabledModules, org.subscriptionTier),
      canUninstall: !canUninstallModule(module.id, org.enabledModules),
      installError: canInstallModule(module.id, org.enabledModules, org.subscriptionTier),
      uninstallError: canUninstallModule(module.id, org.enabledModules),
    }));

    return NextResponse.json({
      modules,
      enabledModules: org.enabledModules,
      subscriptionTier: org.subscriptionTier,
    });
  } catch (error) {
    console.error('Get modules error:', error);
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/modules - Install a module
// ═══════════════════════════════════════════════════════════════════════════════

const installSchema = z.object({
  moduleId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins/owners can install modules
    const orgRole = session.user.orgRole;
    if (!orgRole || !['OWNER', 'ADMIN'].includes(orgRole)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const result = installSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { moduleId } = result.data;

    // Verify module exists
    if (!MODULE_REGISTRY[moduleId]) {
      return NextResponse.json(
        { error: `Module "${moduleId}" not found` },
        { status: 404 }
      );
    }

    // Get organization
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        enabledModules: true,
        subscriptionTier: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if can install
    const installError = canInstallModule(moduleId, org.enabledModules, org.subscriptionTier);
    if (installError) {
      return NextResponse.json({ error: installError }, { status: 400 });
    }

    // Install module
    const updatedOrg = await prisma.organization.update({
      where: { id: org.id },
      data: {
        enabledModules: [...org.enabledModules, moduleId],
      },
      select: {
        enabledModules: true,
      },
    });

    const mod = MODULE_REGISTRY[moduleId];

    // Revalidate admin layout to refresh navigation
    revalidatePath('/admin', 'layout');

    return NextResponse.json({
      success: true,
      message: `"${mod.name}" has been installed successfully`,
      moduleId,
      enabledModules: updatedOrg.enabledModules,
    });
  } catch (error) {
    console.error('Install module error:', error);
    return NextResponse.json({ error: 'Failed to install module' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/modules - Uninstall a module
// ═══════════════════════════════════════════════════════════════════════════════

const uninstallSchema = z.object({
  moduleId: z.string().min(1),
  deleteData: z.boolean().default(false), // Whether to delete associated data
});

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins/owners can uninstall modules
    const orgRole = session.user.orgRole;
    if (!orgRole || !['OWNER', 'ADMIN'].includes(orgRole)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const result = uninstallSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { moduleId, deleteData } = result.data;

    // Verify module exists
    if (!MODULE_REGISTRY[moduleId]) {
      return NextResponse.json(
        { error: `Module "${moduleId}" not found` },
        { status: 404 }
      );
    }

    // Get organization
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        enabledModules: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if module is installed
    if (!org.enabledModules.includes(moduleId)) {
      return NextResponse.json(
        { error: `Module "${moduleId}" is not installed` },
        { status: 400 }
      );
    }

    // Check if can uninstall
    const uninstallError = canUninstallModule(moduleId, org.enabledModules);
    if (uninstallError) {
      return NextResponse.json({ error: uninstallError }, { status: 400 });
    }

    const mod = MODULE_REGISTRY[moduleId];

    // Use transaction to ensure atomicity - delete data first, then update org
    const updatedOrg = await prisma.$transaction(async (tx) => {
      // If deleteData is true, delete associated data FIRST (inside transaction)
      if (deleteData) {
        await deleteModuleDataWithTx(tx, org.id, moduleId);
      }

      // Then uninstall module
      return tx.organization.update({
        where: { id: org.id },
        data: {
          enabledModules: org.enabledModules.filter(m => m !== moduleId),
        },
        select: {
          enabledModules: true,
        },
      });
    });

    // Revalidate admin layout to refresh navigation
    revalidatePath('/admin', 'layout');

    return NextResponse.json({
      success: true,
      message: `"${mod.name}" has been uninstalled${deleteData ? ' and data deleted' : ''}`,
      moduleId,
      enabledModules: updatedOrg.enabledModules,
      dataDeleted: deleteData,
    });
  } catch (error) {
    console.error('Uninstall module error:', error);
    const message = error instanceof Error ? error.message : 'Failed to uninstall module';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Delete module-specific data (transaction-aware)
// ═══════════════════════════════════════════════════════════════════════════════

async function deleteModuleDataWithTx(
  tx: Prisma.TransactionClient,
  tenantId: string,
  moduleId: string
): Promise<void> {
  // Delete data based on module
  // Note: Order matters due to foreign key constraints
  switch (moduleId) {
    case 'assets':
      // Delete related records first
      await tx.assetHistory.deleteMany({
        where: { asset: { tenantId } },
      });
      await tx.maintenanceRecord.deleteMany({
        where: { asset: { tenantId } },
      });
      await tx.assetRequest.deleteMany({ where: { tenantId } });
      await tx.asset.deleteMany({ where: { tenantId } });
      break;

    case 'subscriptions':
      await tx.subscriptionHistory.deleteMany({
        where: { subscription: { tenantId } },
      });
      await tx.subscription.deleteMany({ where: { tenantId } });
      break;

    case 'suppliers':
      await tx.supplierEngagement.deleteMany({
        where: { supplier: { tenantId } },
      });
      await tx.supplier.deleteMany({ where: { tenantId } });
      break;

    case 'employees':
      // Check for dependent data that would cause FK errors
      const [leaveCount, payslipCount] = await Promise.all([
        tx.leaveRequest.count({ where: { tenantId } }),
        tx.payslip.count({ where: { tenantId } }),
      ]);
      if (leaveCount > 0 || payslipCount > 0) {
        throw new Error(
          'Cannot delete employee data: Leave or payroll records exist. ' +
          'Please uninstall and delete data from those modules first.'
        );
      }
      await tx.profileChangeRequest.deleteMany({ where: { tenantId } });
      await tx.teamMember.updateMany({ where: { tenantId, isEmployee: true }, data: { isEmployee: false } });
      break;

    case 'leave':
      await tx.leaveRequestHistory.deleteMany({
        where: { leaveRequest: { tenantId } },
      });
      await tx.leaveRequest.deleteMany({ where: { tenantId } });
      await tx.leaveBalance.deleteMany({ where: { tenantId } });
      await tx.leaveType.deleteMany({ where: { tenantId } });
      break;

    case 'payroll':
      await tx.loanRepayment.deleteMany({
        where: { loan: { tenantId } },
      });
      await tx.employeeLoan.deleteMany({ where: { tenantId } });
      await tx.payslipDeduction.deleteMany({
        where: { payslip: { tenantId } },
      });
      await tx.payslip.deleteMany({ where: { tenantId } });
      await tx.payrollHistory.deleteMany({
        where: { payrollRun: { tenantId } },
      });
      await tx.payrollRun.deleteMany({ where: { tenantId } });
      await tx.salaryStructureHistory.deleteMany({
        where: { salaryStructure: { tenantId } },
      });
      await tx.salaryStructure.deleteMany({ where: { tenantId } });
      break;

    case 'purchase-requests':
      await tx.purchaseRequestHistory.deleteMany({
        where: { purchaseRequest: { tenantId } },
      });
      await tx.purchaseRequestItem.deleteMany({
        where: { purchaseRequest: { tenantId } },
      });
      await tx.purchaseRequest.deleteMany({ where: { tenantId } });
      break;

    case 'documents':
      await tx.companyDocument.deleteMany({ where: { tenantId } });
      await tx.companyDocumentType.deleteMany({ where: { tenantId } });
      break;

    default:
      console.warn(`No data deletion handler for module: ${moduleId}`);
  }
}
