/**
 * @file route.ts
 * @description Asset maintenance records API endpoints
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

const createMaintenanceSchema = z.object({
  maintenanceDate: z.string(),
  notes: z.string().optional().nullable(),
});

// GET /api/assets/[id]/maintenance - Get all maintenance records for an asset
async function getMaintenanceHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const records = await prisma.maintenanceRecord.findMany({
      where: { assetId: id },
      orderBy: { maintenanceDate: 'desc' },
    });

    return NextResponse.json(records);
}

// POST /api/assets/[id]/maintenance - Add a new maintenance record
async function createMaintenanceHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = createMaintenanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { maintenanceDate, notes } = validation.data;

    const record = await prisma.maintenanceRecord.create({
      data: {
        assetId: id,
        maintenanceDate: new Date(maintenanceDate),
        notes: notes || null,
        performedBy: session.user.id,
        tenantId: session.user.organizationId,
      },
    });

    return NextResponse.json(record, { status: 201 });
}

export const GET = withErrorHandler(getMaintenanceHandler, { requireAuth: true, requireModule: 'assets' });
export const POST = withErrorHandler(createMaintenanceHandler, { requireAuth: true, requireModule: 'assets' });
