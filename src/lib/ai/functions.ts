import { prisma } from '@/lib/core/prisma';
import type { ChatContext } from './chat-service';
import { SubscriptionStatus, AssetStatus, LoanStatus, TeamMemberStatus } from '@prisma/client';
import { deriveOrgRole } from '@/lib/access-control';
import { MAX_RESULT_ARRAY_LENGTH } from './config';

/** Domain categories for access control */
export type FunctionDomain = 'HR' | 'FINANCE' | 'OPERATIONS' | 'SYSTEM';

/**
 * Sanitize function results to prevent data leakage
 * - Limits array sizes to prevent large data dumps
 * - Removes any unexpected fields from results
 */
function sanitizeResult<T>(result: T): T {
  if (Array.isArray(result)) {
    // Limit array size
    const limited = result.slice(0, MAX_RESULT_ARRAY_LENGTH);
    // Recursively sanitize each element
    return limited.map(item => sanitizeResult(item)) as T;
  }

  if (result && typeof result === 'object') {
    // Handle Date objects
    if (result instanceof Date) {
      return result;
    }

    // Sanitize nested objects
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(result)) {
      // Skip any internal/private fields
      if (key.startsWith('_') || key.startsWith('$')) {
        continue;
      }
      sanitized[key] = sanitizeResult(value);
    }
    return sanitized as T;
  }

  return result;
}

export interface ChatFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
  requiresAdmin?: boolean;
  /** Entity type for audit logging (e.g., 'Employee', 'Asset') */
  entityType?: string;
  /** Whether this function accesses sensitive data (salary, personal info) */
  accessesSensitiveData?: boolean;
  /** Domain category for future granular access control */
  requiresDomain?: FunctionDomain;
}

export const chatFunctions: ChatFunction[] = [
  {
    name: 'searchEmployees',
    description: 'Search for employees by name, email, employee ID, department, or status',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (name, email, or employee ID)',
        },
        department: {
          type: 'string',
          description: 'Filter by department name',
        },
        status: {
          type: 'string',
          description: 'Filter by status: ACTIVE, ON_LEAVE, PROBATION, RESIGNED, TERMINATED',
        },
      },
    },
    entityType: 'Employee',
    requiresDomain: 'HR',
  },
  {
    name: 'getEmployeeDetails',
    description: 'Get detailed information about a specific employee including manager and team size',
    parameters: {
      type: 'object',
      properties: {
        employeeId: {
          type: 'string',
          description: 'The employee user ID or employee code',
        },
      },
      required: ['employeeId'],
    },
    entityType: 'Employee',
    requiresDomain: 'HR',
  },
  {
    name: 'getEmployeeSalary',
    description: 'Get salary details for an employee (admin only)',
    parameters: {
      type: 'object',
      properties: {
        employeeId: {
          type: 'string',
          description: 'The employee user ID',
        },
      },
      required: ['employeeId'],
    },
    requiresAdmin: true,
    entityType: 'Employee',
    accessesSensitiveData: true,
    requiresDomain: 'FINANCE',
  },
  {
    name: 'getSubscriptionUsers',
    description: 'Get users of a specific subscription/service',
    parameters: {
      type: 'object',
      properties: {
        serviceName: {
          type: 'string',
          description: 'Name of the service (e.g., ChatGPT, Microsoft 365, Slack)',
        },
      },
      required: ['serviceName'],
    },
    entityType: 'Subscription',
    requiresDomain: 'OPERATIONS',
  },
  {
    name: 'listSubscriptions',
    description: 'List all subscriptions in the organization',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status (ACTIVE, CANCELLED)',
        },
      },
    },
    entityType: 'Subscription',
    requiresDomain: 'OPERATIONS',
  },
  {
    name: 'getEmployeeAssets',
    description: 'Get assets assigned to an employee',
    parameters: {
      type: 'object',
      properties: {
        employeeId: {
          type: 'string',
          description: 'The employee user ID or name',
        },
      },
      required: ['employeeId'],
    },
    entityType: 'Asset',
    requiresDomain: 'OPERATIONS',
  },
  {
    name: 'listAssets',
    description: 'List or search assets in the organization by model, brand, type, status, or location',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search by model name or brand (e.g., ThinkPad, Dell, MacBook)',
        },
        type: {
          type: 'string',
          description: 'Filter by asset type (Laptop, Desktop, Phone, etc.)',
        },
        status: {
          type: 'string',
          description: 'Filter by status (IN_USE, SPARE, REPAIR, DISPOSED)',
        },
        location: {
          type: 'string',
          description: 'Filter by location name (e.g., Head Office, Warehouse)',
        },
      },
    },
    entityType: 'Asset',
    requiresDomain: 'OPERATIONS',
  },
  {
    name: 'getPendingLeaveRequests',
    description: 'Get pending leave requests awaiting approval',
    parameters: {
      type: 'object',
      properties: {},
    },
    entityType: 'LeaveRequest',
    requiresDomain: 'HR',
  },
  {
    name: 'getEmployeeLeaveBalance',
    description: 'Get leave balance for an employee',
    parameters: {
      type: 'object',
      properties: {
        employeeId: {
          type: 'string',
          description: 'The employee user ID',
        },
      },
      required: ['employeeId'],
    },
    entityType: 'LeaveRequest',
    requiresDomain: 'HR',
  },
  {
    name: 'getExpiringDocuments',
    description: 'Get employee documents expiring soon (QID, passport, etc.)',
    parameters: {
      type: 'object',
      properties: {
        daysAhead: {
          type: 'number',
          description: 'Number of days to look ahead (default: 30)',
        },
      },
    },
    entityType: 'Document',
    requiresDomain: 'HR',
  },
  {
    name: 'getTotalPayroll',
    description: 'Get total monthly payroll cost (admin only)',
    parameters: {
      type: 'object',
      properties: {},
    },
    requiresAdmin: true,
    entityType: 'PayrollRun',
    accessesSensitiveData: true,
    requiresDomain: 'FINANCE',
  },
  {
    name: 'getEmployeeCount',
    description: 'Get the total number of employees',
    parameters: {
      type: 'object',
      properties: {},
    },
    entityType: 'Employee',
    requiresDomain: 'HR',
  },
  {
    name: 'getAssetDepreciation',
    description: 'Get depreciation information for assets',
    parameters: {
      type: 'object',
      properties: {
        assetId: {
          type: 'string',
          description: 'Optional specific asset ID or model name to look up',
        },
      },
    },
    entityType: 'Asset',
    requiresDomain: 'FINANCE',
  },
  {
    name: 'getPayrollRunStatus',
    description: 'Get status of current and recent payroll runs (admin only)',
    parameters: {
      type: 'object',
      properties: {
        month: {
          type: 'number',
          description: 'Month number (1-12), defaults to current month',
        },
        year: {
          type: 'number',
          description: 'Year, defaults to current year',
        },
      },
    },
    requiresAdmin: true,
    entityType: 'PayrollRun',
    accessesSensitiveData: true,
    requiresDomain: 'FINANCE',
  },
  {
    name: 'getSpendRequestSummary',
    description: 'Get summary of spend requests by status with optional date range',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status (PENDING, UNDER_REVIEW, APPROVED, REJECTED, COMPLETED)',
        },
        fromDate: {
          type: 'string',
          description: 'Start date for filtering (YYYY-MM-DD format)',
        },
        toDate: {
          type: 'string',
          description: 'End date for filtering (YYYY-MM-DD format)',
        },
      },
    },
    entityType: 'SpendRequest',
    requiresDomain: 'OPERATIONS',
  },
  {
    name: 'searchSuppliers',
    description: 'Search for suppliers by name or category',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (supplier name or category)',
        },
      },
    },
    entityType: 'Supplier',
    requiresDomain: 'OPERATIONS',
  },
  {
    name: 'getOrganizationInfo',
    description: 'Get organization settings like timezone, currency, and enabled modules',
    parameters: {
      type: 'object',
      properties: {},
    },
    entityType: 'Organization',
    requiresDomain: 'SYSTEM',
  },
  {
    name: 'getLeaveTypes',
    description: 'Get available leave types and their policies (entitlements, approval requirements)',
    parameters: {
      type: 'object',
      properties: {},
    },
    entityType: 'LeaveType',
    requiresDomain: 'HR',
  },
  {
    name: 'getEmployeeLoans',
    description: 'Get employee loans and advances (admin only)',
    parameters: {
      type: 'object',
      properties: {
        employeeId: {
          type: 'string',
          description: 'Employee ID or name to filter by (optional)',
        },
        status: {
          type: 'string',
          description: 'Filter by status: ACTIVE, PAUSED, COMPLETED, or WRITTEN_OFF',
        },
      },
    },
    requiresAdmin: true,
    entityType: 'EmployeeLoan',
    accessesSensitiveData: true,
    requiresDomain: 'FINANCE',
  },
  {
    name: 'getAssetMaintenanceHistory',
    description: 'Get maintenance records for an asset',
    parameters: {
      type: 'object',
      properties: {
        assetId: {
          type: 'string',
          description: 'Asset ID, tag, or model name',
        },
      },
      required: ['assetId'],
    },
    entityType: 'MaintenanceRecord',
    requiresDomain: 'OPERATIONS',
  },
];

// ============================================================================
// Derived Constants (for use by other modules)
// ============================================================================

/** Function metadata for audit logging */
export const FUNCTION_METADATA = Object.fromEntries(
  chatFunctions.map((fn) => [
    fn.name,
    {
      entityType: fn.entityType,
      accessesSensitiveData: fn.accessesSensitiveData ?? false,
    },
  ])
) as Record<string, { entityType?: string; accessesSensitiveData: boolean }>;

/**
 * Execute a chat function with the given arguments
 * Results are sanitized to prevent data leakage
 */
export async function executeFunction(
  name: string,
  args: Record<string, unknown>,
  context: ChatContext
): Promise<unknown> {
  const { tenantId } = context;

  const result = await executeFunctionInternal(name, args, tenantId);
  return sanitizeResult(result);
}

/**
 * Internal function execution (before sanitization)
 */
async function executeFunctionInternal(
  name: string,
  args: Record<string, unknown>,
  tenantId: string
): Promise<unknown> {
  switch (name) {
    case 'searchEmployees': {
      const query = args.query as string | undefined;
      const department = args.department as string | undefined;
      const statusArg = args.status as string | undefined;

      // Validate status if provided
      const validStatus = statusArg && Object.values(TeamMemberStatus).includes(statusArg as TeamMemberStatus)
        ? (statusArg as TeamMemberStatus)
        : undefined;

      const members = await prisma.teamMember.findMany({
        where: {
          tenantId,
          // Default to ACTIVE if no status filter provided
          status: validStatus || 'ACTIVE',
          ...(query && {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { employeeCode: { contains: query, mode: 'insensitive' } },
            ],
          }),
          ...(department && {
            department: { contains: department, mode: 'insensitive' },
          }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
          employeeCode: true,
          designation: true,
          department: true,
          dateOfJoining: true,
          status: true,
        },
        take: 15,
      });
      return members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: deriveOrgRole(m),
        employeeId: m.employeeCode,
        designation: m.designation,
        department: m.department,
        dateOfJoining: m.dateOfJoining,
        status: m.status,
      }));
    }

    case 'getEmployeeDetails': {
      const employeeId = args.employeeId as string;
      const member = await prisma.teamMember.findFirst({
        where: {
          tenantId,
          status: 'ACTIVE',
          OR: [
            { id: employeeId },
            { employeeCode: { equals: employeeId, mode: 'insensitive' } },
            { name: { contains: employeeId, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
          employeeCode: true,
          designation: true,
          department: true,
          dateOfJoining: true,
          qidNumber: true,
          qidExpiry: true,
          passportExpiry: true,
          nationality: true,
          reportingTo: {
            select: { name: true, employeeCode: true },
          },
          _count: {
            select: {
              assets: true,
              subscriptions: true,
              directReports: true,
            },
          },
        },
      });
      if (!member) return { error: 'Employee not found' };
      return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: deriveOrgRole(member),
        employeeId: member.employeeCode,
        designation: member.designation,
        department: member.department,
        dateOfJoining: member.dateOfJoining,
        nationality: member.nationality,
        qidExpiry: member.qidExpiry,
        passportExpiry: member.passportExpiry,
        manager: member.reportingTo ? {
          name: member.reportingTo.name,
          employeeCode: member.reportingTo.employeeCode,
        } : null,
        assetCount: member._count.assets,
        subscriptionCount: member._count.subscriptions,
        directReportsCount: member._count.directReports,
      };
    }

    case 'getEmployeeSalary': {
      const employeeId = args.employeeId as string;
      const member = await prisma.teamMember.findFirst({
        where: {
          tenantId,
          OR: [
            { id: employeeId },
            { name: { contains: employeeId, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          salaryStructure: {
            select: {
              basicSalary: true,
              housingAllowance: true,
              transportAllowance: true,
              foodAllowance: true,
              otherAllowances: true,
              grossSalary: true,
            },
          },
        },
      });
      if (!member) return { error: 'Employee not found' };
      if (!member.salaryStructure) return { error: 'No salary structure found for this employee' };
      return {
        name: member.name,
        basicSalary: Number(member.salaryStructure.basicSalary),
        housingAllowance: Number(member.salaryStructure.housingAllowance),
        transportAllowance: Number(member.salaryStructure.transportAllowance),
        foodAllowance: Number(member.salaryStructure.foodAllowance),
        otherAllowances: Number(member.salaryStructure.otherAllowances),
        grossSalary: Number(member.salaryStructure.grossSalary),
      };
    }

    case 'getSubscriptionUsers': {
      const serviceName = (args.serviceName as string).toLowerCase();
      const subscriptions = await prisma.subscription.findMany({
        where: {
          tenantId,
          serviceName: { contains: serviceName, mode: 'insensitive' },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          serviceName: true,
          vendor: true,
          costQAR: true,
          assignedMember: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
      return subscriptions.map((s) => ({
        serviceName: s.serviceName,
        vendor: s.vendor,
        cost: Number(s.costQAR),
        assignedTo: s.assignedMember?.name || 'Unassigned',
        email: s.assignedMember?.email,
      }));
    }

    case 'listSubscriptions': {
      const status = args.status as string | undefined;
      const validStatus = status && Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)
        ? (status as SubscriptionStatus)
        : undefined;
      const subscriptions = await prisma.subscription.findMany({
        where: {
          tenantId,
          ...(validStatus && { status: validStatus }),
        },
        select: {
          id: true,
          serviceName: true,
          vendor: true,
          status: true,
          costQAR: true,
          renewalDate: true,
          assignedMember: {
            select: { name: true },
          },
        },
        take: 20,
      });
      return subscriptions.map((s) => ({
        serviceName: s.serviceName,
        vendor: s.vendor,
        status: s.status,
        cost: Number(s.costQAR),
        renewalDate: s.renewalDate,
        assignedTo: s.assignedMember?.name || 'Unassigned',
      }));
    }

    case 'getEmployeeAssets': {
      const employeeId = args.employeeId as string;
      const member = await prisma.teamMember.findFirst({
        where: {
          tenantId,
          OR: [
            { id: employeeId },
            { name: { contains: employeeId, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          assets: {
            select: {
              model: true,
              brand: true,
              type: true,
              status: true,
            },
          },
        },
      });
      if (!member) return { error: 'Employee not found' };
      return {
        name: member.name,
        assets: member.assets.map((a) => ({
          model: a.model,
          brand: a.brand,
          type: a.type,
          status: a.status,
        })),
      };
    }

    case 'listAssets': {
      const query = args.query as string | undefined;
      const type = args.type as string | undefined;
      const status = args.status as string | undefined;
      const location = args.location as string | undefined;
      const validAssetStatus = status && Object.values(AssetStatus).includes(status as AssetStatus)
        ? (status as AssetStatus)
        : undefined;

      // Build location filter if provided
      let locationFilter = {};
      if (location) {
        const locationRecord = await prisma.location.findFirst({
          where: {
            tenantId,
            name: { contains: location, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (locationRecord) {
          locationFilter = { locationId: locationRecord.id };
        }
      }

      const assets = await prisma.asset.findMany({
        where: {
          tenantId,
          ...(query && {
            OR: [
              { model: { contains: query, mode: 'insensitive' } },
              { brand: { contains: query, mode: 'insensitive' } },
            ],
          }),
          ...(type && { type: { contains: type, mode: 'insensitive' } }),
          ...(validAssetStatus && { status: validAssetStatus }),
          ...locationFilter,
        },
        select: {
          id: true,
          assetTag: true,
          model: true,
          brand: true,
          type: true,
          status: true,
          assignedMember: {
            select: { name: true },
          },
          location: {
            select: { name: true },
          },
        },
        take: 20,
      });
      return assets.map((a) => ({
        model: a.model,
        brand: a.brand,
        type: a.type,
        status: a.status,
        assignedTo: a.assignedMember?.name || 'Unassigned',
        location: a.location?.name || null,
      }));
    }

    case 'getPendingLeaveRequests': {
      const requests = await prisma.leaveRequest.findMany({
        where: {
          tenantId,
          status: 'PENDING',
        },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          reason: true,
          member: {
            select: { name: true },
          },
          leaveType: {
            select: { name: true },
          },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      return requests.map((r) => ({
        employee: r.member.name,
        type: r.leaveType.name,
        startDate: r.startDate,
        endDate: r.endDate,
        reason: r.reason,
      }));
    }

    case 'getEmployeeLeaveBalance': {
      const employeeId = args.employeeId as string;
      const member = await prisma.teamMember.findFirst({
        where: {
          tenantId,
          OR: [
            { id: employeeId },
            { name: { contains: employeeId, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
        },
      });
      if (!member) return { error: 'Employee not found' };

      const balances = await prisma.leaveBalance.findMany({
        where: {
          tenantId,
          memberId: member.id,
        },
        include: {
          leaveType: {
            select: { name: true },
          },
        },
      });
      return {
        name: member.name,
        balances: balances.map((b) => {
          const entitlement = Number(b.entitlement);
          const carriedForward = Number(b.carriedForward);
          const adjustment = Number(b.adjustment);
          const used = Number(b.used);
          const pending = Number(b.pending);
          const available = entitlement + carriedForward + adjustment - used - pending;
          return {
            type: b.leaveType.name,
            entitled: entitlement,
            used,
            pending,
            available,
          };
        }),
      };
    }

    case 'getExpiringDocuments': {
      const daysAhead = (args.daysAhead as number) || 30;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const members = await prisma.teamMember.findMany({
        where: {
          tenantId,
          isEmployee: true,
          OR: [
            { qidExpiry: { lte: futureDate, gte: new Date() } },
            { passportExpiry: { lte: futureDate, gte: new Date() } },
            { healthCardExpiry: { lte: futureDate, gte: new Date() } },
          ],
        },
        select: {
          name: true,
          qidExpiry: true,
          passportExpiry: true,
          healthCardExpiry: true,
        },
      });

      const expiring: { name: string; document: string; expiryDate: Date }[] = [];
      for (const m of members) {
        if (m.qidExpiry && m.qidExpiry <= futureDate) {
          expiring.push({ name: m.name!, document: 'QID', expiryDate: m.qidExpiry });
        }
        if (m.passportExpiry && m.passportExpiry <= futureDate) {
          expiring.push({ name: m.name!, document: 'Passport', expiryDate: m.passportExpiry });
        }
        if (m.healthCardExpiry && m.healthCardExpiry <= futureDate) {
          expiring.push({ name: m.name!, document: 'Health Card', expiryDate: m.healthCardExpiry });
        }
      }
      return expiring.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
    }

    case 'getTotalPayroll': {
      const structures = await prisma.salaryStructure.findMany({
        where: { tenantId },
        select: { grossSalary: true },
      });
      const total = structures.reduce((sum, s) => sum + Number(s.grossSalary), 0);
      return {
        totalMonthlyPayroll: total,
        employeeCount: structures.length,
      };
    }

    case 'getEmployeeCount': {
      const count = await prisma.teamMember.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          isEmployee: true,
        },
      });
      return { employeeCount: count };
    }

    case 'getAssetDepreciation': {
      const assetId = args.assetId as string | undefined;

      const assets = await prisma.asset.findMany({
        where: {
          tenantId,
          ...(assetId && {
            OR: [
              { id: assetId },
              { model: { contains: assetId, mode: 'insensitive' } },
              { assetTag: { contains: assetId, mode: 'insensitive' } },
            ],
          }),
        },
        include: {
          depreciationCategory: {
            select: {
              name: true,
              usefulLifeYears: true,
              annualRate: true,
            },
          },
        },
        take: 10,
      });

      return assets.map(a => ({
        model: a.model,
        brand: a.brand,
        type: a.type,
        purchasePrice: Number(a.price || 0),
        purchaseDate: a.purchaseDate,
        usefulLifeMonths: a.customUsefulLifeMonths || (a.depreciationCategory?.usefulLifeYears ? a.depreciationCategory.usefulLifeYears * 12 : null),
        annualDepreciationRate: a.depreciationCategory ? Number(a.depreciationCategory.annualRate) : null,
        salvageValue: Number(a.salvageValue || 0),
        accumulatedDepreciation: Number(a.accumulatedDepreciation || 0),
        currentBookValue: Number(a.netBookValue || a.price || 0),
        lastCalculated: a.lastDepreciationDate,
        isFullyDepreciated: a.isFullyDepreciated,
      }));
    }

    case 'getPayrollRunStatus': {
      const now = new Date();
      const month = (args.month as number) || (now.getMonth() + 1);
      const year = (args.year as number) || now.getFullYear();

      const payrollRuns = await prisma.payrollRun.findMany({
        where: {
          tenantId,
          OR: [
            { month, year },
            // Also get recent runs
            { year: { gte: year - 1 } },
          ],
        },
        select: {
          id: true,
          referenceNumber: true,
          month: true,
          year: true,
          status: true,
          totalGross: true,
          totalNet: true,
          employeeCount: true,
          processedAt: true,
          paidAt: true,
          wpsFileGenerated: true,
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 5,
      });

      return payrollRuns.map(pr => ({
        referenceNumber: pr.referenceNumber,
        period: `${pr.month}/${pr.year}`,
        status: pr.status,
        totalGross: Number(pr.totalGross),
        totalNet: Number(pr.totalNet),
        employeeCount: pr.employeeCount,
        processedAt: pr.processedAt,
        paidAt: pr.paidAt,
        wpsGenerated: pr.wpsFileGenerated,
      }));
    }

    case 'getSpendRequestSummary': {
      const status = args.status as string | undefined;
      const fromDate = args.fromDate as string | undefined;
      const toDate = args.toDate as string | undefined;

      // Build date filter
      const dateFilter: { requestDate?: { gte?: Date; lte?: Date } } = {};
      if (fromDate || toDate) {
        dateFilter.requestDate = {};
        if (fromDate) {
          const parsedFrom = new Date(fromDate);
          if (!isNaN(parsedFrom.getTime())) {
            dateFilter.requestDate.gte = parsedFrom;
          }
        }
        if (toDate) {
          const parsedTo = new Date(toDate);
          if (!isNaN(parsedTo.getTime())) {
            // Set to end of day
            parsedTo.setHours(23, 59, 59, 999);
            dateFilter.requestDate.lte = parsedTo;
          }
        }
      }

      // Get counts by status (with date filter if provided)
      const statusCounts = await prisma.spendRequest.groupBy({
        by: ['status'],
        where: { tenantId, ...dateFilter },
        _count: { id: true },
        _sum: { totalAmount: true },
      });

      // Get recent requests if status filter provided
      let recentRequests: unknown[] = [];
      if (status) {
        const validStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'];
        if (validStatuses.includes(status.toUpperCase())) {
          recentRequests = await prisma.spendRequest.findMany({
            where: {
              tenantId,
              status: status.toUpperCase() as 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED',
              ...dateFilter,
            },
            select: {
              id: true,
              referenceNumber: true,
              title: true,
              status: true,
              totalAmount: true,
              requestDate: true,
              requester: { select: { name: true } },
            },
            orderBy: { requestDate: 'desc' },
            take: 10,
          });
        }
      }

      return {
        summary: statusCounts.map(s => ({
          status: s.status,
          count: s._count.id,
          totalAmount: Number(s._sum.totalAmount || 0),
        })),
        recentRequests: status ? recentRequests : undefined,
        dateRange: (fromDate || toDate) ? { from: fromDate, to: toDate } : undefined,
      };
    }

    case 'searchSuppliers': {
      const query = (args.query as string || '').toLowerCase();

      const suppliers = await prisma.supplier.findMany({
        where: {
          tenantId,
          ...(query && {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { category: { contains: query, mode: 'insensitive' } },
              { primaryContactName: { contains: query, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          name: true,
          category: true,
          primaryContactName: true,
          primaryContactEmail: true,
          primaryContactMobile: true,
          status: true,
        },
        take: 15,
      });

      return suppliers.map(s => ({
        name: s.name,
        category: s.category,
        status: s.status,
        contactName: s.primaryContactName,
        contactEmail: s.primaryContactEmail,
        contactPhone: s.primaryContactMobile,
      }));
    }

    case 'getOrganizationInfo': {
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          timezone: true,
          currency: true,
          enabledModules: true,
          subscriptionTier: true,
          weekendDays: true,
          codePrefix: true,
          depreciationEnabled: true,
          hasMultipleLocations: true,
        },
      });
      if (!org) return { error: 'Organization not found' };

      const weekendDayNames = org.weekendDays.map(d => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[d] || `Day ${d}`;
      });

      return {
        name: org.name,
        timezone: org.timezone,
        currency: org.currency,
        enabledModules: org.enabledModules,
        subscriptionTier: org.subscriptionTier,
        weekendDays: weekendDayNames,
        codePrefix: org.codePrefix,
        depreciationEnabled: org.depreciationEnabled,
        hasMultipleLocations: org.hasMultipleLocations,
      };
    }

    case 'getLeaveTypes': {
      const types = await prisma.leaveType.findMany({
        where: { tenantId, isActive: true },
        select: {
          name: true,
          description: true,
          defaultDays: true,
          requiresApproval: true,
          requiresDocument: true,
          isPaid: true,
          maxConsecutiveDays: true,
          minNoticeDays: true,
          allowCarryForward: true,
          maxCarryForwardDays: true,
          minimumServiceMonths: true,
        },
        orderBy: { name: 'asc' },
      });

      return types.map(t => ({
        name: t.name,
        description: t.description,
        defaultEntitlementDays: t.defaultDays,
        requiresApproval: t.requiresApproval,
        requiresDocument: t.requiresDocument,
        isPaid: t.isPaid,
        maxConsecutiveDays: t.maxConsecutiveDays,
        minNoticeDays: t.minNoticeDays,
        allowCarryForward: t.allowCarryForward,
        maxCarryForwardDays: t.maxCarryForwardDays,
        minimumServiceMonths: t.minimumServiceMonths,
      }));
    }

    case 'getEmployeeLoans': {
      const employeeId = args.employeeId as string | undefined;
      const status = args.status as string | undefined;

      // Build employee filter
      let memberFilter = {};
      if (employeeId) {
        const member = await prisma.teamMember.findFirst({
          where: {
            tenantId,
            OR: [
              { id: employeeId },
              { name: { contains: employeeId, mode: 'insensitive' } },
              { employeeCode: { contains: employeeId, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        if (!member) return { error: 'Employee not found' };
        memberFilter = { memberId: member.id };
      }

      // Validate status
      const validStatus = status && Object.values(LoanStatus).includes(status as LoanStatus)
        ? (status as LoanStatus)
        : undefined;

      const loans = await prisma.employeeLoan.findMany({
        where: {
          tenantId,
          ...memberFilter,
          ...(validStatus && { status: validStatus }),
        },
        select: {
          loanNumber: true,
          type: true,
          description: true,
          principalAmount: true,
          totalAmount: true,
          monthlyDeduction: true,
          totalPaid: true,
          remainingAmount: true,
          installments: true,
          installmentsPaid: true,
          status: true,
          startDate: true,
          endDate: true,
          member: {
            select: { name: true, employeeCode: true },
          },
        },
        orderBy: { startDate: 'desc' },
        take: 20,
      });

      return loans.map(l => ({
        loanNumber: l.loanNumber,
        employeeName: l.member.name,
        employeeCode: l.member.employeeCode,
        type: l.type,
        description: l.description,
        principalAmount: Number(l.principalAmount),
        totalAmount: Number(l.totalAmount),
        monthlyDeduction: Number(l.monthlyDeduction),
        totalPaid: Number(l.totalPaid),
        remainingAmount: Number(l.remainingAmount),
        installments: l.installments,
        installmentsPaid: l.installmentsPaid,
        status: l.status,
        startDate: l.startDate,
        expectedEndDate: l.endDate,
      }));
    }

    case 'getAssetMaintenanceHistory': {
      const assetId = args.assetId as string;

      // Find the asset first
      const asset = await prisma.asset.findFirst({
        where: {
          tenantId,
          OR: [
            { id: assetId },
            { assetTag: { contains: assetId, mode: 'insensitive' } },
            { model: { contains: assetId, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          model: true,
          brand: true,
          assetTag: true,
        },
      });

      if (!asset) return { error: 'Asset not found' };

      const records = await prisma.maintenanceRecord.findMany({
        where: {
          tenantId,
          assetId: asset.id,
        },
        select: {
          maintenanceDate: true,
          notes: true,
          performedBy: {
            select: { name: true },
          },
          createdAt: true,
        },
        orderBy: { maintenanceDate: 'desc' },
        take: 20,
      });

      return {
        asset: {
          model: asset.model,
          brand: asset.brand,
          assetTag: asset.assetTag,
        },
        maintenanceRecords: records.map(r => ({
          date: r.maintenanceDate,
          notes: r.notes,
          performedBy: r.performedBy?.name || 'Unknown',
          recordedAt: r.createdAt,
        })),
        totalRecords: records.length,
      };
    }

    default:
      return { error: `Unknown function: ${name}` };
  }
}
