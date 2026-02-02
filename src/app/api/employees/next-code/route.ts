/**
 * @file route.ts
 * @description Generate next employee code for the organization
 * @module hr/employees
 *
 * Default Format: {PREFIX}-{YYYY}-{SEQ:3}
 * Example: ORG-2024-001, JAS-2024-001
 * Format is configurable per organization via settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationCodePrefix, getEntityFormat, applyFormat } from '@/lib/utils/code-prefix';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

async function getNextCodeHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const { tenantId } = tenant;
  const db = tenantPrisma as TenantPrismaClient;
  const now = new Date();

  // Get organization's code prefix and format
  const codePrefix = await getOrganizationCodePrefix(tenantId);
  const format = await getEntityFormat(tenantId, 'employees');

  // Build search prefix by applying format without sequence
  const searchPrefix = buildSearchPrefix(format, codePrefix, now);

  // Count only within the current tenant (tenant-scoped via extension)
  const count = await db.teamMember.count({
    where: {
      isEmployee: true,
      employeeCode: { startsWith: searchPrefix }
    }
  });

  // Generate the complete code using the configurable format
  const nextCode = applyFormat(format, {
    prefix: codePrefix,
    sequenceNumber: count + 1,
    date: now,
  });

  return NextResponse.json({ nextCode });
}

/**
 * Build a search prefix from format by replacing tokens but not SEQ
 */
function buildSearchPrefix(format: string, prefix: string, date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let result = format;

  result = result.replace(/\{PREFIX\}/gi, prefix);
  result = result.replace(/\{YYYY\}/gi, year.toString());
  result = result.replace(/\{YY\}/gi, year.toString().slice(-2));
  result = result.replace(/\{MM\}/gi, month.toString().padStart(2, '0'));
  result = result.replace(/\{DD\}/gi, day.toString().padStart(2, '0'));
  result = result.replace(/\{YYMM\}/gi, year.toString().slice(-2) + month.toString().padStart(2, '0'));
  result = result.replace(/\{YYYYMM\}/gi, year.toString() + month.toString().padStart(2, '0'));
  result = result.replace(/\{TYPE\}/gi, '');

  // Remove SEQ token and everything after it for prefix matching
  result = result.replace(/\{SEQ(:\d+)?\}.*$/, '');

  return result;
}

export const GET = withErrorHandler(getNextCodeHandler, { requireAuth: true, requireModule: 'employees' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: None required - file is well-documented with configurable format support
 * Issues: None - proper tenant isolation, configurable code format via organization settings
 */
