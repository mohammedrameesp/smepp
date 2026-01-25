/**
 * @file route.ts
 * @description Get data counts for a specific module
 * @module api/modules/[moduleId]/data-count
 *
 * GET - Returns record counts for each entity type in the module
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { notFoundResponse } from '@/lib/http/errors';
import { MODULE_REGISTRY } from '@/lib/modules/registry';

interface DataCount {
  entity: string;
  label: string;
  count: number;
}

/**
 * GET /api/modules/[moduleId]/data-count
 * Returns record counts for a module's data
 */
export const GET = withErrorHandler(async (request: NextRequest, { tenant, params }) => {
  const tenantId = tenant!.tenantId;
  const moduleId = params?.moduleId;

  if (!moduleId) {
    return notFoundResponse('Module ID is required');
  }

  // Verify module exists
  const mod = MODULE_REGISTRY[moduleId];
  if (!mod) {
    return notFoundResponse(`Module "${moduleId}" not found`);
  }

  // Get data counts based on module
  const counts: DataCount[] = [];

  switch (moduleId) {
    case 'assets': {
      const [assets, history, maintenance, requests] = await Promise.all([
        prisma.asset.count({ where: { tenantId, deletedAt: null } }),
        prisma.assetHistory.count({ where: { asset: { tenantId } } }),
        prisma.maintenanceRecord.count({ where: { asset: { tenantId } } }),
        prisma.assetRequest.count({ where: { tenantId } }),
      ]);
      counts.push(
        { entity: 'asset', label: 'Assets', count: assets },
        { entity: 'assetHistory', label: 'History records', count: history },
        { entity: 'maintenanceRecord', label: 'Maintenance records', count: maintenance },
        { entity: 'assetRequest', label: 'Asset requests', count: requests }
      );
      break;
    }

    case 'subscriptions': {
      const [subscriptions, history] = await Promise.all([
        prisma.subscription.count({ where: { tenantId } }),
        prisma.subscriptionHistory.count({ where: { subscription: { tenantId } } }),
      ]);
      counts.push(
        { entity: 'subscription', label: 'Subscriptions', count: subscriptions },
        { entity: 'subscriptionHistory', label: 'History records', count: history }
      );
      break;
    }

    case 'suppliers': {
      const [suppliers, engagements] = await Promise.all([
        prisma.supplier.count({ where: { tenantId } }),
        prisma.supplierEngagement.count({ where: { supplier: { tenantId } } }),
      ]);
      counts.push(
        { entity: 'supplier', label: 'Suppliers', count: suppliers },
        { entity: 'supplierEngagement', label: 'Engagements', count: engagements }
      );
      break;
    }

    case 'employees': {
      const [employees, profileRequests] = await Promise.all([
        prisma.teamMember.count({ where: { tenantId, isEmployee: true } }),
        prisma.profileChangeRequest.count({ where: { tenantId } }),
      ]);
      counts.push(
        { entity: 'employee', label: 'Employees', count: employees },
        { entity: 'profileChangeRequest', label: 'Profile change requests', count: profileRequests }
      );
      break;
    }

    case 'leave': {
      const [leaveTypes, balances, requests, history] = await Promise.all([
        prisma.leaveType.count({ where: { tenantId } }),
        prisma.leaveBalance.count({ where: { tenantId } }),
        prisma.leaveRequest.count({ where: { tenantId } }),
        prisma.leaveRequestHistory.count({ where: { leaveRequest: { tenantId } } }),
      ]);
      counts.push(
        { entity: 'leaveType', label: 'Leave types', count: leaveTypes },
        { entity: 'leaveBalance', label: 'Leave balances', count: balances },
        { entity: 'leaveRequest', label: 'Leave requests', count: requests },
        { entity: 'leaveRequestHistory', label: 'History records', count: history }
      );
      break;
    }

    case 'payroll': {
      const [salaryStructures, payrollRuns, payslips, loans] = await Promise.all([
        prisma.salaryStructure.count({ where: { tenantId } }),
        prisma.payrollRun.count({ where: { tenantId } }),
        prisma.payslip.count({ where: { tenantId } }),
        prisma.employeeLoan.count({ where: { tenantId } }),
      ]);
      counts.push(
        { entity: 'salaryStructure', label: 'Salary structures', count: salaryStructures },
        { entity: 'payrollRun', label: 'Payroll runs', count: payrollRuns },
        { entity: 'payslip', label: 'Payslips', count: payslips },
        { entity: 'employeeLoan', label: 'Loans', count: loans }
      );
      break;
    }

    case 'spend-requests': {
      const [requests, items, history] = await Promise.all([
        prisma.spendRequest.count({ where: { tenantId } }),
        prisma.spendRequestItem.count({ where: { spendRequest: { tenantId } } }),
        prisma.spendRequestHistory.count({ where: { spendRequest: { tenantId } } }),
      ]);
      counts.push(
        { entity: 'spendRequest', label: 'Purchase requests', count: requests },
        { entity: 'spendRequestItem', label: 'Line items', count: items },
        { entity: 'spendRequestHistory', label: 'History records', count: history }
      );
      break;
    }

    case 'documents': {
      const [docTypes, documents] = await Promise.all([
        prisma.companyDocumentType.count({ where: { tenantId } }),
        prisma.companyDocument.count({ where: { tenantId } }),
      ]);
      counts.push(
        { entity: 'companyDocumentType', label: 'Document types', count: docTypes },
        { entity: 'companyDocument', label: 'Documents', count: documents }
      );
      break;
    }

    default:
      // Module has no data to count
      break;
  }

  // Calculate total
  const totalRecords = counts.reduce((sum, c) => sum + c.count, 0);

  return NextResponse.json({
    moduleId,
    moduleName: mod.name,
    counts,
    totalRecords,
    hasData: totalRecords > 0,
  });
}, { requireAuth: true });
