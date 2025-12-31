import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { projectCreateSchema, projectModuleQuerySchema } from '@/lib/validations/projects/project';
import { generateProjectCode } from '@/lib/domains/projects/project/project-utils';
import { logAction, ActivityActions } from '@/lib/activity';
import { updateSetupProgress } from '@/lib/domains/system/setup';

// GET /api/projects - List projects with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { searchParams } = new URL(request.url);
    const query = projectModuleQuerySchema.parse(Object.fromEntries(searchParams));

    // Build where clause with tenant filter
    const where: any = { tenantId };

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { clientName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) where.status = query.status;
    if (query.clientType) where.clientType = query.clientType;
    if (query.managerId) where.managerId = query.managerId;

    if (query.startDateFrom || query.startDateTo) {
      where.startDate = {};
      if (query.startDateFrom) where.startDate.gte = query.startDateFrom;
      if (query.startDateTo) where.startDate.lte = query.startDateTo;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          manager: { select: { id: true, name: true, email: true } },
          supplier: { select: { id: true, name: true } },
          _count: {
            select: {
              purchaseRequests: true,
            },
          },
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      data: projects,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects - Create project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const body = await request.json();
    const data = projectCreateSchema.parse(body);

    // Generate code if not provided or use custom
    const code = data.code || await generateProjectCode();

    const project = await prisma.project.create({
      data: {
        ...data,
        code,
        createdById: session.user.id,
        tenantId: session.user.organizationId!,
      },
      include: {
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    await logAction(
      session.user.organizationId!,
      session.user.id,
      ActivityActions.PROJECT_CREATED,
      'Project',
      project.id,
      { code: project.code, name: project.name }
    );

    // Update setup progress for first project created (non-blocking)
    updateSetupProgress(session.user.organizationId!, 'firstProjectCreated', true).catch(() => {});

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
