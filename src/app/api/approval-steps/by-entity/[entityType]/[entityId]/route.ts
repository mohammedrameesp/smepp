/**
 * @module api/approval-steps/by-entity
 * @description API endpoint to retrieve the approval chain and status summary for
 * a specific entity (leave request, spend request, or asset request). Returns all
 * approval steps in the chain along with a summary of the overall approval status.
 *
 * @endpoints
 * - GET /api/approval-steps/by-entity/[entityType]/[entityId] - Get approval chain for entity
 *
 * @authentication Required (via requireAuth)
 * @tenancy Uses global prisma; entity lookup handles tenant scoping internally
 */
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse } from '@/lib/http/errors';
import { ApprovalModule } from '@prisma/client';
import { getApprovalChain, getApprovalChainSummary } from '@/features/approvals/lib';

// GET /api/approval-steps/by-entity/[entityType]/[entityId] - Get approval chain for an entity
export const GET = withErrorHandler(async (request: NextRequest, { params }) => {
  const entityType = params?.entityType;
  const entityId = params?.entityId;

  if (!entityType || !entityId) {
    return badRequestResponse('Entity type and ID are required');
  }

  // Validate entityType
  if (!['LEAVE_REQUEST', 'SPEND_REQUEST', 'ASSET_REQUEST'].includes(entityType)) {
    return badRequestResponse('Invalid entity type');
  }

  const chain = await getApprovalChain(entityType as ApprovalModule, entityId);
  const summary = await getApprovalChainSummary(entityType as ApprovalModule, entityId);

  return NextResponse.json({
    steps: chain,
    summary,
  });
}, { requireAuth: true });

/*
 * CODE REVIEW SUMMARY
 * ===================
 *
 * Purpose:
 * Retrieves the approval chain (all steps) and summary for a specific entity.
 * Used by UI to display approval progress and status.
 *
 * Strengths:
 * - Clean inline handler style suitable for simple endpoints
 * - Returns both detailed steps and summary in single response
 * - Validates entityType against known values
 * - Uses dedicated library functions for chain retrieval
 *
 * Potential Improvements:
 * - Missing tenant validation; getApprovalChain may query globally
 * - No authorization check for who can view approval chains (any authenticated user)
 * - Consider adding tenant context and verifying entity belongs to tenant
 * - Could cache chain summary for performance on frequently accessed entities
 * - EntityType validation duplicated; could use shared constant/enum
 *
 * Security:
 * - Authentication required but authorization is permissive
 * - No tenant filtering on approval chain lookup (potential IDOR if entityId guessable)
 * - Should verify requesting user has access to the entity
 *
 * Testing Considerations:
 * - Test with valid entity types and IDs
 * - Test 400 responses for invalid entity type
 * - Test response structure matches expected format
 * - Test cross-tenant access prevention (if implemented)
 */
