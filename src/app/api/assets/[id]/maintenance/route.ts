import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';

const createMaintenanceSchema = z.object({
  maintenanceDate: z.string(),
  notes: z.string().optional().nullable(),
});

// GET /api/assets/[id]/maintenance - Get all maintenance records for an asset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const records = await prisma.maintenanceRecord.findMany({
      where: { assetId: id },
      orderBy: { maintenanceDate: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Maintenance GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance records' },
      { status: 500 }
    );
  }
}

// POST /api/assets/[id]/maintenance - Add a new maintenance record
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const { id } = await params;

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
  } catch (error) {
    console.error('Maintenance POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance record' },
      { status: 500 }
    );
  }
}
