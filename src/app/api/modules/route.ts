import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { logAction, ActivityActions } from '@/lib/core/activity';
import {
  MODULE_REGISTRY,
  getSerializableModules,
  canInstallModule,
  canUninstallModule,
} from '@/lib/modules/registry';
import logger from '@/lib/core/log';
import { withErrorHandler } from '@/lib/http/handler';
import { validationErrorResponse, notFoundResponse, badRequestResponse } from '@/lib/http/errors';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/modules - List all available modules with installation status
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;

  // Get organization's current settings
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      enabledModules: true,
      subscriptionTier: true,
    },
  });

  if (!org) {
    return notFoundResponse('Organization');
  }

  // Get all modules with installation status
  // Filter out core modules (like 'employees') - they're always enabled silently
  const modules = getSerializableModules()
    .filter(module => !module.isCore) // Hide core modules from UI
    .map(module => ({
      ...module,
      isInstalled: org.enabledModules.includes(module.id),
      canInstall: !canInstallModule(module.id, org.enabledModules, org.subscriptionTier),
      canUninstall: !canUninstallModule(module.id, org.enabledModules),
      installError: canInstallModule(module.id, org.enabledModules, org.subscriptionTier),
      uninstallError: canUninstallModule(module.id, org.enabledModules),
    }));

  // Filter out core modules from the enabled list shown to users
  const visibleEnabledModules = org.enabledModules.filter(
    moduleId => !getSerializableModules().find(m => m.id === moduleId && m.isCore)
  );

  return NextResponse.json({
    modules,
    enabledModules: visibleEnabledModules,
    subscriptionTier: org.subscriptionTier,
  });
}, { requireAuth: true });

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/modules - Install a module
// ═══════════════════════════════════════════════════════════════════════════════

const installSchema = z.object({
  moduleId: z.string().min(1),
});

export const POST = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;

  const body = await request.json();
  const result = installSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result);
  }

  const { moduleId } = result.data;

  // Verify module exists
  if (!MODULE_REGISTRY[moduleId]) {
    return notFoundResponse(`Module "${moduleId}"`);
  }

  // Get organization
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      enabledModules: true,
      subscriptionTier: true,
    },
  });

  if (!org) {
    return notFoundResponse('Organization');
  }

  // Check if can install
  const installError = canInstallModule(moduleId, org.enabledModules, org.subscriptionTier);
  if (installError) {
    return badRequestResponse(installError);
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

  // Log the installation action
  await logAction(
    org.id,
    userId,
    ActivityActions.MODULE_INSTALLED,
    'module',
    moduleId,
    {
      moduleName: mod.name,
      moduleCategory: mod.category,
    }
  );

  // Revalidate admin layout to refresh navigation
  revalidatePath('/admin', 'layout');

  return NextResponse.json({
    success: true,
    message: `"${mod.name}" has been installed successfully`,
    moduleId,
    enabledModules: updatedOrg.enabledModules,
  });
}, { requireAuth: true, requireAdmin: true });

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/modules - Uninstall a module
// ═══════════════════════════════════════════════════════════════════════════════

const uninstallSchema = z.object({
  moduleId: z.string().min(1),
  deleteData: z.boolean().default(false), // Whether to delete associated data
  cascade: z.boolean().default(false), // Whether to also uninstall dependent modules
});

export const DELETE = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;

  const body = await request.json();
  const result = uninstallSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result);
  }

  const { moduleId, deleteData, cascade } = result.data;

  // Verify module exists
  if (!MODULE_REGISTRY[moduleId]) {
    return notFoundResponse(`Module "${moduleId}"`);
  }

  // Get organization
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      enabledModules: true,
    },
  });

  if (!org) {
    return notFoundResponse('Organization');
  }

  // Check if module is installed
  if (!org.enabledModules.includes(moduleId)) {
    return badRequestResponse(`Module "${moduleId}" is not installed`);
  }

  const mod = MODULE_REGISTRY[moduleId];

  // Compute modules to uninstall (including cascade dependents)
  let modulesToUninstall: string[] = [moduleId];

  if (cascade) {
    // Use topological sort to find the correct uninstall order
    // Modules with no dependents (leaves) should be uninstalled first
    const toUninstall = new Set<string>([moduleId]);

    // Find all enabled modules that depend on this one (directly or transitively)
    const collectDependents = (modId: string) => {
      const modDef = MODULE_REGISTRY[modId];
      if (modDef?.requiredBy) {
        for (const depId of modDef.requiredBy) {
          if (org.enabledModules.includes(depId) && !toUninstall.has(depId)) {
            toUninstall.add(depId);
            collectDependents(depId); // Recursively collect
          }
        }
      }
    };
    collectDependents(moduleId);

    // Topological sort: process modules so that dependents come before dependencies
    // A module can only be uninstalled after all modules that depend on it are uninstalled
    const sorted: string[] = [];
    const visited = new Set<string>();

    const visit = (modId: string) => {
      if (visited.has(modId)) return;
      visited.add(modId);

      // First visit all modules that depend on this one (and are in our uninstall set)
      const modDef = MODULE_REGISTRY[modId];
      if (modDef?.requiredBy) {
        for (const depId of modDef.requiredBy) {
          if (toUninstall.has(depId)) {
            visit(depId);
          }
        }
      }

      // Then add this module
      sorted.push(modId);
    };

    // Start from the target module
    visit(moduleId);

    modulesToUninstall = sorted;
  } else {
    // Check if can uninstall (only when not cascading)
    const uninstallError = canUninstallModule(moduleId, org.enabledModules);
    if (uninstallError) {
      return badRequestResponse(uninstallError);
    }
  }

  // Use transaction to ensure atomicity - delete data first, then update org
  const updatedOrg = await prisma.$transaction(async (tx) => {
    // If deleteData is true, delete associated data for all modules being uninstalled
    if (deleteData) {
      for (const modIdToDelete of modulesToUninstall) {
        await deleteModuleDataWithTx(tx, org.id, modIdToDelete);
      }
    }

    // Then uninstall all modules
    return tx.organization.update({
      where: { id: org.id },
      data: {
        enabledModules: org.enabledModules.filter(m => !modulesToUninstall.includes(m)),
      },
      select: {
        enabledModules: true,
      },
    });
  });

  // Log the uninstallation action for each module
  for (const uninstalledModId of modulesToUninstall) {
    const uninstalledMod = MODULE_REGISTRY[uninstalledModId];
    await logAction(
      org.id,
      userId,
      ActivityActions.MODULE_UNINSTALLED,
      'module',
      uninstalledModId,
      {
        moduleName: uninstalledMod?.name || uninstalledModId,
        moduleCategory: uninstalledMod?.category,
        dataDeleted: deleteData,
        cascadeFrom: cascade ? moduleId : undefined,
      }
    );
  }

  // Revalidate admin layout to refresh navigation
  revalidatePath('/admin', 'layout');

  const uninstalledNames = modulesToUninstall.map(id => MODULE_REGISTRY[id]?.name || id);
  const message = modulesToUninstall.length > 1
    ? `Uninstalled: ${uninstalledNames.join(', ')}${deleteData ? ' (data deleted)' : ''}`
    : `"${mod.name}" has been uninstalled${deleteData ? ' and data deleted' : ''}`;

  return NextResponse.json({
    success: true,
    message,
    moduleId,
    uninstalledModules: modulesToUninstall,
    enabledModules: updatedOrg.enabledModules,
    dataDeleted: deleteData,
  });
}, { requireAuth: true, requireAdmin: true });

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
      logger.warn({ moduleId }, 'No data deletion handler for module');
  }
}
