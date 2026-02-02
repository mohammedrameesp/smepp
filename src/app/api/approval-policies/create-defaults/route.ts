/**
 * @module api/approval-policies/create-defaults
 * @description API endpoint to create default approval policies for a specific module.
 * This is typically called during organization setup or when enabling a new module
 * that requires approval workflows. Creates standard policies with predefined
 * approval levels if none exist for the specified module.
 *
 * @endpoints
 * - POST /api/approval-policies/create-defaults - Creates default policies for a module
 *
 * @authentication Required (Admin only via requireAdmin)
 * @tenancy Tenant-scoped - Creates policies for the authenticated tenant
 */
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

/*
 * CODE REVIEW SUMMARY
 * ===================
 *
 * Purpose:
 * Creates default approval policies for a module when none exist. Useful for
 * initial organization setup or enabling new modules requiring approval workflows.
 *
 * Strengths:
 * - Clean separation: Policy creation logic delegated to ensureDefaultApprovalPolicies
 * - Proper Zod validation for request body
 * - Clear response indicating whether policies were created or already existed
 * - Admin-only access properly enforced
 *
 * Potential Improvements:
 * - Consider returning the created policies in the response for immediate use
 * - Could add option to force recreate policies (with confirmation)
 * - The cast `module as ApprovalModule` is unnecessary since Zod validates the enum
 *
 * Security:
 * - Tenant context validated before processing
 * - Admin-only access via requireAdmin handler option
 * - No direct data access; delegates to library function
 *
 * Testing Considerations:
 * - Test module validation (valid/invalid values)
 * - Test idempotency (calling twice returns success: false on second call)
 * - Test tenant isolation (policies created for correct tenant)
 */
