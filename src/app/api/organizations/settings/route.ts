import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { updateSetupProgressBulk } from '@/lib/domains/system/setup';

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

// Valid currencies
const VALID_CURRENCIES = ['QAR', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD'];

const updateSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  enabledModules: z.array(z.string()).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  currency: z.string().optional(), // Primary currency
  additionalCurrencies: z.array(z.string()).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/organizations/settings - Get organization settings
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        enabledModules: true,
        primaryColor: true,
        secondaryColor: true,
        currency: true,
        additionalCurrencies: true,
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ settings: organization });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/organizations/settings - Update organization settings
// ═══════════════════════════════════════════════════════════════════════════════

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins/owners can update settings
    const orgRole = session.user.orgRole;
    if (!orgRole || !['OWNER', 'ADMIN'].includes(orgRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = updateSettingsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, enabledModules, primaryColor, secondaryColor, currency, additionalCurrencies } = result.data;

    // Validate modules
    if (enabledModules) {
      const invalidModules = enabledModules.filter(m => !VALID_MODULES.includes(m));
      if (invalidModules.length > 0) {
        return NextResponse.json(
          { error: `Invalid modules: ${invalidModules.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate primary currency
    if (currency && !VALID_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        { error: `Invalid currency: ${currency}` },
        { status: 400 }
      );
    }

    // Validate additional currencies
    if (additionalCurrencies) {
      const invalidCurrencies = additionalCurrencies.filter(c => !VALID_CURRENCIES.includes(c));
      if (invalidCurrencies.length > 0) {
        return NextResponse.json(
          { error: `Invalid currencies: ${invalidCurrencies.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Update organization settings
    const organization = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        ...(name && { name }),
        ...(enabledModules && { enabledModules }),
        ...(primaryColor && { primaryColor }),
        ...(secondaryColor && { secondaryColor }),
        ...(currency && { currency }),
        ...(additionalCurrencies && { additionalCurrencies }),
        // Mark onboarding as complete when settings are saved
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
      select: {
        name: true,
        enabledModules: true,
        primaryColor: true,
        secondaryColor: true,
        currency: true,
        additionalCurrencies: true,
        onboardingCompleted: true,
      },
    });

    // Revalidate admin layout to reflect module changes in the navigation
    revalidatePath('/admin', 'layout');

    // Update setup progress (non-blocking)
    const progressUpdates: Record<string, boolean> = {};
    if (name) progressUpdates.profileComplete = true;
    if (primaryColor) progressUpdates.brandingConfigured = true;
    if (Object.keys(progressUpdates).length > 0) {
      updateSetupProgressBulk(session.user.organizationId, progressUpdates).catch(() => {});
    }

    return NextResponse.json({ success: true, settings: organization });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
