import { prisma } from '@/lib/core/prisma';
import { ChatContext } from './chat-service';

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
          description: 'Filter by status (ACTIVE, PAUSED, CANCELLED)',
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
    name: 'getPurchaseRequestSummary',
    description: 'Get summary of purchase requests by status',
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
  {
    name: 'getProjectProgress',
    description: 'Get project status and progress information',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Optional project ID or name to look up specific project',
        },
        status: {
          type: 'string',
          description: 'Filter by status (PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED)',
        },
      },
    },
  },
];

/**
 * Execute a chat function with the given arguments
 */
export async function executeFunction(
  name: string,
  args: Record<string, unknown>,
  context: ChatContext
): Promise<unknown> {
  const { tenantId } = context;

  switch (name) {
    case 'searchEmployees': {
      const query = (args.query as string).toLowerCase();
      const users = await prisma.user.findMany({
        where: {
          organizationMemberships: { some: { organizationId: tenantId } },
          isDeleted: false,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          hrProfile: {
            select: {
              employeeId: true,
              designation: true,
              dateOfJoining: true,
            },
          },
        },
        take: 10,
      });
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        employeeId: u.hrProfile?.employeeId,
        designation: u.hrProfile?.designation,
        dateOfJoining: u.hrProfile?.dateOfJoining,
      }));
    }

    case 'getEmployeeDetails': {
      const employeeId = args.employeeId as string;
      const user = await prisma.user.findFirst({
        where: {
          organizationMemberships: { some: { organizationId: tenantId } },
          isDeleted: false,
          OR: [
            { id: employeeId },
            { hrProfile: { employeeId: { equals: employeeId, mode: 'insensitive' } } },
            { name: { contains: employeeId, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          hrProfile: {
            select: {
              employeeId: true,
              designation: true,
              dateOfJoining: true,
              qidNumber: true,
              qidExpiry: true,
              passportExpiry: true,
              nationality: true,
            },
          },
          _count: {
            select: {
              assets: true,
              subscriptions: true,
            },
          },
        },
      });
      if (!user) return { error: 'Employee not found' };
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.hrProfile?.employeeId,
        designation: user.hrProfile?.designation,
        dateOfJoining: user.hrProfile?.dateOfJoining,
        nationality: user.hrProfile?.nationality,
        qidExpiry: user.hrProfile?.qidExpiry,
        passportExpiry: user.hrProfile?.passportExpiry,
        assetCount: user._count.assets,
        subscriptionCount: user._count.subscriptions,
      };
    }

    case 'getEmployeeSalary': {
      const employeeId = args.employeeId as string;
      const user = await prisma.user.findFirst({
        where: {
          organizationMemberships: { some: { organizationId: tenantId } },
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
      if (!user) return { error: 'Employee not found' };
      if (!user.salaryStructure) return { error: 'No salary structure found for this employee' };
      return {
        name: user.name,
        basicSalary: Number(user.salaryStructure.basicSalary),
        housingAllowance: Number(user.salaryStructure.housingAllowance),
        transportAllowance: Number(user.salaryStructure.transportAllowance),
        foodAllowance: Number(user.salaryStructure.foodAllowance),
        otherAllowances: Number(user.salaryStructure.otherAllowances),
        grossSalary: Number(user.salaryStructure.grossSalary),
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
          assignedUser: {
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
        assignedTo: s.assignedUser?.name || 'Unassigned',
        email: s.assignedUser?.email,
      }));
    }

    case 'listSubscriptions': {
      const status = args.status as string | undefined;
      const subscriptions = await prisma.subscription.findMany({
        where: {
          tenantId,
          ...(status && { status: status as any }),
        },
        select: {
          id: true,
          serviceName: true,
          vendor: true,
          status: true,
          costQAR: true,
          renewalDate: true,
          assignedUser: {
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
        assignedTo: s.assignedUser?.name || 'Unassigned',
      }));
    }

    case 'getEmployeeAssets': {
      const employeeId = args.employeeId as string;
      const user = await prisma.user.findFirst({
        where: {
          organizationMemberships: { some: { organizationId: tenantId } },
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
      if (!user) return { error: 'Employee not found' };
      return {
        name: user.name,
        assets: user.assets.map((a) => ({
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
          ...(status && { status: status as any }),
        },
        select: {
          id: true,
          assetTag: true,
          model: true,
          brand: true,
          type: true,
          status: true,
          assignedUser: {
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
        assignedTo: a.assignedUser?.name || 'Unassigned',
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
          user: {
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
        employee: r.user.name,
        type: r.leaveType.name,
        startDate: r.startDate,
        endDate: r.endDate,
        reason: r.reason,
      }));
    }

    case 'getEmployeeLeaveBalance': {
      const employeeId = args.employeeId as string;
      const user = await prisma.user.findFirst({
        where: {
          organizationMemberships: { some: { organizationId: tenantId } },
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
      if (!user) return { error: 'Employee not found' };

      const balances = await prisma.leaveBalance.findMany({
        where: {
          tenantId,
          userId: user.id,
        },
        include: {
          leaveType: {
            select: { name: true },
          },
        },
      });
      return {
        name: user.name,
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

      const profiles = await prisma.hRProfile.findMany({
        where: {
          tenantId,
          OR: [
            { qidExpiry: { lte: futureDate, gte: new Date() } },
            { passportExpiry: { lte: futureDate, gte: new Date() } },
            { healthCardExpiry: { lte: futureDate, gte: new Date() } },
          ],
        },
        select: {
          user: { select: { name: true } },
          qidExpiry: true,
          passportExpiry: true,
          healthCardExpiry: true,
        },
      });

      const expiring: { name: string; document: string; expiryDate: Date }[] = [];
      for (const p of profiles) {
        if (p.qidExpiry && p.qidExpiry <= futureDate) {
          expiring.push({ name: p.user.name!, document: 'QID', expiryDate: p.qidExpiry });
        }
        if (p.passportExpiry && p.passportExpiry <= futureDate) {
          expiring.push({ name: p.user.name!, document: 'Passport', expiryDate: p.passportExpiry });
        }
        if (p.healthCardExpiry && p.healthCardExpiry <= futureDate) {
          expiring.push({ name: p.user.name!, document: 'Health Card', expiryDate: p.healthCardExpiry });
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
      const count = await prisma.user.count({
        where: {
          organizationMemberships: { some: { organizationId: tenantId } },
          isDeleted: false,
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

    case 'getPurchaseRequestSummary': {
      const status = args.status as string | undefined;

      // Get counts by status
      const statusCounts = await prisma.purchaseRequest.groupBy({
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
          recentRequests = await prisma.purchaseRequest.findMany({
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
          _count: {
            select: { projects: true },
          },
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
        projectCount: s._count.projects,
      }));
    }

    case 'getProjectProgress': {
      const projectId = args.projectId as string | undefined;
      const status = args.status as string | undefined;

      const projects = await prisma.project.findMany({
        where: {
          tenantId,
          ...(projectId && {
            OR: [
              { id: projectId },
              { name: { contains: projectId, mode: 'insensitive' } },
              { code: { contains: projectId, mode: 'insensitive' } },
            ],
          }),
          ...(status && { status: status as 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' }),
        },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
          description: true,
          manager: { select: { name: true } },
          _count: {
            select: {
              purchaseRequests: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });

      return projects.map(p => ({
        code: p.code,
        name: p.name,
        status: p.status,
        description: p.description,
        startDate: p.startDate,
        endDate: p.endDate,
        manager: p.manager?.name,
        purchaseRequestCount: p._count.purchaseRequests,
      }));
    }

    default:
      return { error: `Unknown function: ${name}` };
  }
}
