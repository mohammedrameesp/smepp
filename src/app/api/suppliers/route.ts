import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { supplierQuerySchema } from '@/lib/validations/suppliers';
import { Role } from '@prisma/client';
import { buildFilterWithSearch } from '@/lib/db/search-filter';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Build where clause using reusable search filter
    const filters: Record<string, any> = {};

    // EMPLOYEE can only see APPROVED suppliers
    // ADMIN can see all suppliers
    if (session.user.role === Role.EMPLOYEE) {
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

  } catch (error) {
    console.error('Supplier list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}
