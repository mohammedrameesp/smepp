import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';

async function getNextCodeHandler() {
  // Generate employee code: BCE-YYYY-XXX (e.g., BCE-2024-001)
  const year = new Date().getFullYear();
  const prefix = `BCE-${year}`;

  const count = await prisma.hRProfile.count({
    where: {
      employeeId: { startsWith: prefix }
    }
  });

  const nextCode = `${prefix}-${String(count + 1).padStart(3, '0')}`;

  return NextResponse.json({ nextCode });
}

export const GET = withErrorHandler(getNextCodeHandler, { requireAdmin: true });
