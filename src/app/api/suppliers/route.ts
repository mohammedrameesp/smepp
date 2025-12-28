import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { supplierQuerySchema } from '@/lib/validations/suppliers';
import { Role } from '@prisma/client';
import { buildFilterWithSearch } from '@/lib/db/search-filter';
import { withErrorHandler } from '@/lib/http/handler';

export const GET = withErrorHandler(
  async (request, { prisma }) => {
    const session = await getServerSession(authOptions);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = supplierQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { q, status, category, p, ps, sort, order } = validation.data;

    // Build where clause - tenantId filtering handled by tenant-scoped prisma
    const filters: Record<string, unknown> = {};

    // EMPLOYEE can only see APPROVED suppliers
    // ADMIN can see all suppliers
    if (session!.user.role === Role.EMPLOYEE) {
      filters.status = 'APPROVED';
    } else if (status) {
      // Admin can filter by status
      filters.status = status;
    }

    // Apply category filter
    if (category) {
      filters.category = category;
    }

    const where = buildFilterWithSearch({
      searchTerm: q,
      searchFields: ['name', 'suppCode', 'category', 'city', 'country'],
      filters,
    });

    // Calculate pagination
    const skip = (p - 1) * ps;

    // Fetch suppliers
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { [sort]: order },
        take: ps,
        skip,
        include: {
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              engagements: true,
            },
          },
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return NextResponse.json({
      suppliers,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
        hasMore: skip + ps < total,
      },
    });
  },
  {
    requireAuth: true,
    requireModule: 'suppliers',
    rateLimit: true,
  }
);
