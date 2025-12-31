import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { projectUpdateSchema } from '@/lib/validations/projects/project';
import { logAction, ActivityActions } from '@/lib/activity';
import { Role } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Get single project with full details
export async function GET(request: NextRequest, { params }: RouteContext) {
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
    const { id } = await params;

    // Use findFirst with tenantId to prevent IDOR attacks
    const project = await prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        supplier: { select: { id: true, name: true } },
        _count: {
          select: {
            purchaseRequests: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(request: NextRequest, { params }: RouteContext) {
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
    const { id } = await params;
    const body = await request.json();
    const data = projectUpdateSchema.parse({ ...body, id });

    // Check if project exists within tenant
    const existing = await prisma.project.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { id: _, ...updateData } = data;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.PROJECT_UPDATED,
      'Project',
      project.id,
      { changes: updateData }
    );

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin only
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

    // Check if project exists within tenant
    const existing = await prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            purchaseRequests: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id },
    });

    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.PROJECT_DELETED,
      'Project',
      id,
      { code: existing.code, name: existing.name }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
