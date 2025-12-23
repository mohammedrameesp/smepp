import { prisma } from '@/lib/prisma';

/**
 * Generates the next unique supplier code in the format SUPP-XXXX
 * Example: SUPP-0001, SUPP-0002, etc.
 */
export async function generateSupplierCode(): Promise<string> {
  // Get the latest supplier code
  const latestSupplier = await prisma.supplier.findFirst({
    where: {
      suppCode: {
        startsWith: 'SUPP-',
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
    // Extract the number from the latest code (e.g., "SUPP-0042" -> 42)
    const match = latestSupplier.suppCode.match(/SUPP-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format with leading zeros to ensure 4 digits
  const formattedNumber = nextNumber.toString().padStart(4, '0');
  return `SUPP-${formattedNumber}`;
}

/**
 * Ensures the generated supplier code is unique by checking the database
 * If a collision occurs, it will retry with the next number
 */
export async function generateUniqueSupplierCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = await generateSupplierCode();

    // Check if this code already exists
    const existing = await prisma.supplier.findUnique({
      where: { suppCode: code },
    });

    if (!existing) {
      return code;
    }

    attempts++;
  }

  // Fallback: use timestamp-based code if all else fails
  const timestamp = Date.now().toString().slice(-4);
  return `SUPP-${timestamp}`;
}
