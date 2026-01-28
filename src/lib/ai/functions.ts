import { prisma } from '@/lib/core/prisma';
import { ChatContext } from './chat-service';
import { SubscriptionStatus, AssetStatus } from '@prisma/client';
import { deriveOrgRole } from '@/lib/access-control';

// Maximum number of records to return from any function
const MAX_RESULT_ARRAY_LENGTH = 50;

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
}

export const chatFunctions: ChatFunction[] = [
  {
    name: 'searchEmployees',
    description: 'Search for employees by name, email, or employee ID',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (name, email, or employee ID)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getEmployeeDetails',
    description: 'Get detailed information about a specific employee',
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
  },
  {
    name: 'listAssets',
    description: 'List or search assets in the organization by model, brand, type, or status',
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
      },
    },
  },
  {
    name: 'getPendingLeaveRequests',
    description: 'Get pending leave requests awaiting approval',
    parameters: {
      type: 'object',
      properties: {},
    },
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
  },
  {
    name: 'getTotalPayroll',
    description: 'Get total monthly payroll cost (admin only)',
    parameters: {
      type: 'object',
      properties: {},
    },
    requiresAdmin: true,
  },
  {
    name: 'getEmployeeCount',
    description: 'Get the total number of employees',
    parameters: {
      type: 'object',
      properties: {},
    },
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
  },
  {
    name: 'getSpendRequestSummary',
    description: 'Get summary of spend requests by status',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status (DRAFT, PENDING, APPROVED, REJECTED, ORDERED, RECEIVED)',
        },
      },
    },
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
  },
];

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
      const query = (args.query as string).toLowerCase();
      const members = await prisma.teamMember.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { employeeCode: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
          employeeCode: true,
          designation: true,
          dateOfJoining: true,
        },
        take: 10,
      });
      return members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: deriveOrgRole(m),
        employeeId: m.employeeCode,
        designation: m.designation,
        dateOfJoining: m.dateOfJoining,
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
          dateOfJoining: true,
          qidNumber: true,
          qidExpiry: true,
          passportExpiry: true,
          nationality: true,
          _count: {
            select: {
              assets: true,
              subscriptions: true,
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
        dateOfJoining: member.dateOfJoining,
        nationality: member.nationality,
        qidExpiry: member.qidExpiry,
        passportExpiry: member.passportExpiry,
        assetCount: member._count.assets,
        subscriptionCount: member._count.subscriptions,
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
      const validAssetStatus = status && Object.values(AssetStatus).includes(status as AssetStatus)
        ? (status as AssetStatus)
        : undefined;
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
        },
        take: 20,
      });
      return assets.map((a) => ({
        model: a.model,
        brand: a.brand,
        type: a.type,
        status: a.status,
        assignedTo: a.assignedMember?.name || 'Unassigned',
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

      // Get counts by status
      const statusCounts = await prisma.spendRequest.groupBy({
        by: ['status'],
        where: { tenantId },
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

    default:
      return { error: `Unknown function: ${name}` };
  }
}
