/**
 * @file supplier-utils.ts
 * @description Supplier utility functions - code generation and uniqueness validation
 * @module domains/operations/suppliers
 *
 * Default Format: {PREFIX}-SUP-{SEQ:4}
 * Example: ORG-SUP-0001, JAS-SUP-0002, etc.
 * Format is configurable per organization via settings.
 */

import { prisma } from '@/lib/core/prisma';
import { getOrganizationCodePrefix, getEntityFormat, applyFormat } from '@/lib/utils/code-prefix';

/**
 * Generates the next unique supplier code using configurable format.
 * Default: {PREFIX}-SUP-{SEQ:4}
 * Example: ORG-SUP-0001, JAS-SUP-0002, etc.
 */
export async function generateSupplierCode(tenantId: string): Promise<string> {
  const now = new Date();

  // Get organization's code prefix and format
  const codePrefix = await getOrganizationCodePrefix(tenantId);
  const format = await getEntityFormat(tenantId, 'suppliers');

  // Build search prefix by applying format without sequence
  const searchPrefix = buildSearchPrefix(format, codePrefix, now);

  // Get the latest supplier code for this tenant
  const latestSupplier = await prisma.supplier.findFirst({
    where: {
      tenantId,
      suppCode: {
        startsWith: searchPrefix,
      },
    },
    orderBy: {
      suppCode: 'desc',
    },
    select: {
      suppCode: true,
    },
  });

  let nextNumber = 1;

  if (latestSupplier && latestSupplier.suppCode) {
    // Extract sequence number from the end of the code
    const seqMatch = latestSupplier.suppCode.match(/(\d+)$/);
    if (seqMatch) {
      nextNumber = parseInt(seqMatch[1], 10) + 1;
    }
  }

  // Generate the complete code using the configurable format
  return applyFormat(format, {
    prefix: codePrefix,
    sequenceNumber: nextNumber,
    date: now,
  });
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

/**
 * Ensures the generated supplier code is unique by checking the database
 * If a collision occurs, it will retry with the next number
 */
export async function generateUniqueSupplierCode(tenantId: string): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = await generateSupplierCode(tenantId);

    // Check if this code already exists within this tenant
    const existing = await prisma.supplier.findFirst({
      where: { tenantId, suppCode: code },
    });

    if (!existing) {
      return code;
    }

    attempts++;
  }

  // Fallback: use timestamp-based code if all else fails
  const codePrefix = await getOrganizationCodePrefix(tenantId);
  const format = await getEntityFormat(tenantId, 'suppliers');
  // Extract the entity identifier from format (e.g., "SUP" from "{PREFIX}-SUP-{SEQ:4}")
  const entityMatch = format.match(/\{PREFIX\}-([A-Z]+)-/i);
  const entityCode = entityMatch ? entityMatch[1] : 'SUP';
  const timestamp = Date.now().toString().slice(-4);
  return `${codePrefix}-${entityCode}-${timestamp}`;
}
