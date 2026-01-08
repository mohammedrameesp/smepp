/**
 * @file route.ts
 * @description List suppliers with filtering, pagination and search
 * @module operations/suppliers
 */
import { NextResponse } from 'next/server';
import { supplierQuerySchema } from '@/features/suppliers';
import { buildFilterWithSearch } from '@/lib/db/search-filter';
import { withErrorHandler } from '@/lib/http/handler';

export const GET = withErrorHandler(
  async (request, { prisma, tenant }) => {
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
    // ADMIN (orgRole) can see all suppliers
    // Note: orgRole contains ADMIN/MEMBER based on TeamMemberRole
    if (tenant!.orgRole !== 'ADMIN') {
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

    // Fetch suppliers, count, and unique categories
    const [suppliers, total, categoriesRaw] = await Promise.all([
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
      // Get all unique categories (not filtered by current filters)
      prisma.supplier.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
    ]);

    const categories = categoriesRaw.map(c => c.category);

    return NextResponse.json({
      suppliers,
      categories,
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
