/**
 * @file supplier-utils.ts
 * @description Supplier utility functions - code generation and uniqueness validation
 * @module domains/operations/suppliers
 */

import { prisma } from '@/lib/core/prisma';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';

/**
 * Generates the next unique supplier code in the format {PREFIX}-SUPP-XXXX
 * Example: BCE-SUPP-0001, JAS-SUPP-0002, etc.
 */
export async function generateSupplierCode(tenantId: string): Promise<string> {
  // Get organization's code prefix
  const codePrefix = await getOrganizationCodePrefix(tenantId);
  const searchPrefix = `${codePrefix}-SUPP-`;

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
    // Extract the number from the latest code (e.g., "BCE-SUPP-0042" -> 42)
    const match = latestSupplier.suppCode.match(new RegExp(`${codePrefix}-SUPP-(\\d+)`));
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format with leading zeros to ensure 4 digits
  const formattedNumber = nextNumber.toString().padStart(4, '0');
  return `${searchPrefix}${formattedNumber}`;
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
  const timestamp = Date.now().toString().slice(-4);
  return `${codePrefix}-SUPP-${timestamp}`;
}
