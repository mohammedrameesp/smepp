import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
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

    // Uninstall module
    const updatedOrg = await prisma.organization.update({
      where: { id: org.id },
      data: {
        enabledModules: org.enabledModules.filter(m => m !== moduleId),
      },
      select: {
        enabledModules: true,
      },
    });

    // If deleteData is true, delete associated data
    if (deleteData) {
      await deleteModuleData(org.id, moduleId);
    }

    const mod = MODULE_REGISTRY[moduleId];

    return NextResponse.json({
      success: true,
      message: `"${mod.name}" has been uninstalled${deleteData ? ' and data deleted' : ''}`,
      moduleId,
      enabledModules: updatedOrg.enabledModules,
      dataDeleted: deleteData,
    });
  } catch (error) {
    console.error('Uninstall module error:', error);
    return NextResponse.json({ error: 'Failed to uninstall module' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Delete module-specific data
// ═══════════════════════════════════════════════════════════════════════════════

async function deleteModuleData(tenantId: string, moduleId: string): Promise<void> {
  // Delete data based on module
  // Note: Order matters due to foreign key constraints
  switch (moduleId) {
    case 'assets':
      // Delete related records first
      await prisma.assetHistory.deleteMany({
        where: { asset: { tenantId } },
      });
      await prisma.maintenanceRecord.deleteMany({
        where: { asset: { tenantId } },
      });
      await prisma.assetRequest.deleteMany({ where: { tenantId } });
      await prisma.asset.deleteMany({ where: { tenantId } });
      break;

    case 'subscriptions':
      await prisma.subscriptionHistory.deleteMany({
        where: { subscription: { tenantId } },
      });
      await prisma.subscription.deleteMany({ where: { tenantId } });
      break;

    case 'suppliers':
      await prisma.supplierEngagement.deleteMany({
        where: { supplier: { tenantId } },
      });
      await prisma.supplier.deleteMany({ where: { tenantId } });
      break;

    case 'employees':
      // Note: This will fail if leave/payroll still has data
      // Should cascade delete or require those modules to be uninstalled first
      await prisma.profileChangeRequest.deleteMany({ where: { tenantId } });
      await prisma.hRProfile.deleteMany({ where: { tenantId } });
      break;

    case 'leave':
      await prisma.leaveRequestHistory.deleteMany({
        where: { leaveRequest: { tenantId } },
      });
      await prisma.leaveRequest.deleteMany({ where: { tenantId } });
      await prisma.leaveBalance.deleteMany({ where: { tenantId } });
      await prisma.leaveType.deleteMany({ where: { tenantId } });
      break;

    case 'payroll':
      await prisma.loanRepayment.deleteMany({
        where: { loan: { tenantId } },
      });
      await prisma.employeeLoan.deleteMany({ where: { tenantId } });
      await prisma.payslipDeduction.deleteMany({
        where: { payslip: { tenantId } },
      });
      await prisma.payslip.deleteMany({ where: { tenantId } });
      await prisma.payrollHistory.deleteMany({
        where: { payrollRun: { tenantId } },
      });
      await prisma.payrollRun.deleteMany({ where: { tenantId } });
      await prisma.salaryStructureHistory.deleteMany({
        where: { salaryStructure: { tenantId } },
      });
      await prisma.salaryStructure.deleteMany({ where: { tenantId } });
      break;

    case 'purchase-requests':
      await prisma.purchaseRequestHistory.deleteMany({
        where: { purchaseRequest: { tenantId } },
      });
      await prisma.purchaseRequestItem.deleteMany({
        where: { purchaseRequest: { tenantId } },
      });
      await prisma.purchaseRequest.deleteMany({ where: { tenantId } });
      break;

    case 'documents':
      await prisma.companyDocument.deleteMany({ where: { tenantId } });
      await prisma.companyDocumentType.deleteMany({ where: { tenantId } });
      break;

    default:
      console.warn(`No data deletion handler for module: ${moduleId}`);
  }
}
