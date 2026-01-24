import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { updateSetupProgressBulk } from '@/features/onboarding/lib';
import { clearPrefixCache } from '@/lib/utils/code-prefix';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse, notFoundResponse, validationErrorResponse } from '@/lib/http/errors';

// Valid module IDs
const VALID_MODULES = [
  'assets',
  'subscriptions',
  'suppliers',
  'employees',
  'leave',
  'payroll',
  'purchase-requests',
  'documents',
];

// Valid currencies - must match ALL_CURRENCIES in CurrencyStep.tsx
const VALID_CURRENCIES = [
  'QAR', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD', 'BHD', 'OMR',
  'INR', 'PKR', 'PHP', 'BDT', 'NPR', 'LKR', 'EGP', 'JOD',
  'CNY', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD', 'MYR', 'THB',
  'IDR', 'ZAR', 'TRY', 'RUB', 'BRL', 'MXN',
];

// Helper to transform empty strings to undefined
const emptyToUndefined = (val: string | undefined) => (val === '' ? undefined : val);

const updateSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  codePrefix: z.string().regex(/^[A-Z0-9]{2,3}$/, 'Code prefix must be 2-3 uppercase letters/numbers').optional(),
  enabledModules: z.array(z.string()).optional(),
  primaryColor: z.preprocess(emptyToUndefined, z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()),
  secondaryColor: z.preprocess(emptyToUndefined, z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()),
  website: z.string().url().max(255).optional().or(z.literal('')),
  currency: z.string().optional(), // Primary currency
  additionalCurrencies: z.array(z.string()).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/organizations/settings - Get organization settings
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;

  const organization = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      enabledModules: true,
      primaryColor: true,
      secondaryColor: true,
      currency: true,
      additionalCurrencies: true,
      hasMultipleLocations: true,
      depreciationEnabled: true,
      onboardingCompleted: true,
      onboardingStep: true,
    },
  });

  if (!organization) {
    return notFoundResponse('Organization not found');
  }

  return NextResponse.json({ settings: organization });
}, { requireAuth: true });

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/organizations/settings - Update organization settings
// ═══════════════════════════════════════════════════════════════════════════════

export const PUT = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;

  const body = await request.json();
  const result = updateSettingsSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result);
  }

  const { name, codePrefix, enabledModules, primaryColor, secondaryColor, website, currency, additionalCurrencies } = result.data;

  // Validate modules
  if (enabledModules) {
    const invalidModules = enabledModules.filter(m => !VALID_MODULES.includes(m));
    if (invalidModules.length > 0) {
      return badRequestResponse(`Invalid modules: ${invalidModules.join(', ')}`);
    }
  }

  // Validate primary currency
  if (currency && !VALID_CURRENCIES.includes(currency)) {
    return badRequestResponse(`Invalid currency: ${currency}`);
  }

  // Validate additional currencies
  if (additionalCurrencies) {
    const invalidCurrencies = additionalCurrencies.filter(c => !VALID_CURRENCIES.includes(c));
    if (invalidCurrencies.length > 0) {
      return badRequestResponse(`Invalid currencies: ${invalidCurrencies.join(', ')}`);
    }
  }

  // Update organization settings
  const organization = await prisma.organization.update({
    where: { id: tenantId },
    data: {
      ...(name && { name }),
      ...(codePrefix && { codePrefix }),
      ...(enabledModules && { enabledModules }),
      ...(primaryColor && { primaryColor }),
      ...(secondaryColor && { secondaryColor }),
      ...(website && { website }),
      ...(currency && { currency }),
      ...(additionalCurrencies && { additionalCurrencies }),
      // Mark onboarding as complete when settings are saved
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
    select: {
      name: true,
      codePrefix: true,
      enabledModules: true,
      primaryColor: true,
      secondaryColor: true,
      website: true,
      currency: true,
      additionalCurrencies: true,
      onboardingCompleted: true,
    },
  });

  // Clear prefix cache if code prefix was updated
  if (codePrefix) {
    clearPrefixCache(tenantId);

    // Update owner's employee code if it has a different prefix
    // This handles the case where owner was created before setup customized the prefix
    const owner = await prisma.teamMember.findFirst({
      where: {
        tenantId,
        isOwner: true,
        employeeCode: { not: null },
      },
      select: { id: true, employeeCode: true },
    });

    if (owner?.employeeCode && !owner.employeeCode.startsWith(codePrefix)) {
      // Extract the sequence part from the existing code and rebuild with new prefix
      // Format: PREFIX-YYYY-SEQ (e.g., BEC-2026-001 -> BCE-2026-001)
      const parts = owner.employeeCode.split('-');
      if (parts.length >= 3) {
        const newCode = `${codePrefix}-${parts.slice(1).join('-')}`;
        await prisma.teamMember.update({
          where: { id: owner.id },
          data: { employeeCode: newCode },
        });
      }
    }
  }

  // Revalidate admin layout to reflect module changes in the navigation
  revalidatePath('/admin', 'layout');

  // Update setup progress (non-blocking)
  const progressUpdates: Record<string, boolean> = {};
  if (name) progressUpdates.profileComplete = true;
  if (primaryColor) progressUpdates.brandingConfigured = true;
  if (Object.keys(progressUpdates).length > 0) {
    updateSetupProgressBulk(tenantId, progressUpdates).catch(() => {});
  }

  return NextResponse.json({ success: true, settings: organization });
}, { requireAuth: true, requireAdmin: true });
