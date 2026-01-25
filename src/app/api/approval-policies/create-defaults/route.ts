import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { ensureDefaultApprovalPolicies } from '@/features/approvals/lib/default-policies';
import { ApprovalModule } from '@prisma/client';
import { z } from 'zod';

const createDefaultsSchema = z.object({
  module: z.enum(['LEAVE_REQUEST', 'SPEND_REQUEST', 'ASSET_REQUEST']),
});

/**
 * POST /api/approval-policies/create-defaults
 * Creates default approval policies for a specific module if none exist.
 */
async function createDefaultPoliciesHandler(request: NextRequest, context: APIContext) {
  const { tenant } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const body = await request.json();
  const validation = createDefaultsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  const { module } = validation.data;

  const created = await ensureDefaultApprovalPolicies(
    tenant.tenantId,
    module as ApprovalModule
  );

  if (created) {
    return NextResponse.json({
      success: true,
      message: `Default policies created for ${module}`,
    });
  } else {
    return NextResponse.json({
      success: false,
      message: `Policies already exist for ${module}`,
    });
  }
}

export const POST = withErrorHandler(createDefaultPoliciesHandler, { requireAdmin: true });
