/**
 * @module api/admin/organization
 * @description Admin API for retrieving and updating organization settings.
 *
 * Manages core organization configuration including:
 * - Basic info: name, code prefix
 * - Branding: primary/secondary colors, logo, website
 * - Regional settings: currencies, weekend days
 * - Features: multi-location support, depreciation tracking
 * - Auth configuration: allowed methods, custom OAuth (read-only status)
 *
 * @endpoints
 * - GET /api/admin/organization - Get organization details and auth config
 * - PATCH /api/admin/organization - Update organization settings
 *
 * @notes
 * - Sensitive OAuth secrets are never exposed in responses
 * - Module management uses separate /api/modules endpoint
 * - Updates trigger onboarding progress tracking
 *
 * @security
 * - GET: Requires authenticated user
 * - PATCH: Requires admin role
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { updateSetupProgressBulk } from '@/features/onboarding/lib';
import { withErrorHandler } from '@/lib/http/handler';
import { validationErrorResponse, notFoundResponse } from '@/lib/http/errors';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/organization - Get current organization details
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(async (_request, { tenant }) => {
  const organization = await prisma.organization.findUnique({
    where: { id: tenant!.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      subscriptionTier: true,
      maxUsers: true,
      maxAssets: true,
      createdAt: true,
      codePrefix: true,
      codeFormats: true,
      // Branding
      primaryColor: true,
      secondaryColor: true,
      website: true,
      // Currency settings
      additionalCurrencies: true,
      // Weekend settings
      weekendDays: true,
      // Module settings
      enabledModules: true,
      // Location settings
      hasMultipleLocations: true,
      // Depreciation settings
      depreciationEnabled: true,
      // Auth settings
      allowedAuthMethods: true,
      customGoogleClientId: true,
      customGoogleClientSecret: true,
      customAzureClientId: true,
      customAzureClientSecret: true,
      _count: {
        select: {
          teamMembers: true,
          assets: true,
        },
      },
    },
  });

  if (!organization) {
    return notFoundResponse('Organization');
  }

  // Compute auth config (don't expose actual secrets)
  const allowedMethods = organization.allowedAuthMethods || [];
  const hasCustomGoogleOAuth = !!(organization.customGoogleClientId && organization.customGoogleClientSecret);
  const hasCustomAzureOAuth = !!(organization.customAzureClientId && organization.customAzureClientSecret);
  const hasSSO = hasCustomGoogleOAuth || hasCustomAzureOAuth;
  const hasCredentials = allowedMethods.length === 0 || allowedMethods.includes('credentials');

  // Remove sensitive fields before returning
  const { customGoogleClientId: _customGoogleClientId, customGoogleClientSecret: _customGoogleClientSecret, customAzureClientId: _customAzureClientId, customAzureClientSecret: _customAzureClientSecret, ...orgData } = organization;

  return NextResponse.json({
    organization: orgData,
    authConfig: {
      allowedMethods,
      hasCredentials,
      hasSSO,
      hasCustomGoogleOAuth,
      hasCustomAzureOAuth,
    },
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}, { requireAuth: true });

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/organization - Update organization details
// ═══════════════════════════════════════════════════════════════════════════════

// Color validation: allow null, empty string, or valid hex color
const colorSchema = z.preprocess(
  (val) => (val === '' || val === null || val === undefined) ? null : val,
  z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').nullable()
).optional();

const updateOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  codePrefix: z.string().min(2, 'Code prefix must be at least 2 characters').max(3, 'Code prefix must be at most 3 characters').regex(/^[A-Z0-9]{2,3}$/, 'Only uppercase letters and numbers allowed').optional(),
  primaryColor: colorSchema,
  secondaryColor: colorSchema,
  website: z.string().url('Invalid URL format').nullable().optional().or(z.literal('')),
  additionalCurrencies: z.array(z.string()).optional(),
  weekendDays: z.array(z.number().min(0).max(6)).min(1, 'At least one weekend day required').optional(),
  // NOTE: enabledModules removed - use /api/modules endpoint for proper validation
  hasMultipleLocations: z.boolean().optional(),
  depreciationEnabled: z.boolean().optional(),
});

export const PATCH = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const body = await request.json();
  const result = updateOrgSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result);
  }

  const { name, codePrefix, primaryColor, secondaryColor, website, additionalCurrencies, weekendDays, hasMultipleLocations, depreciationEnabled } = result.data;

  // Normalize colors: empty/null resets to default for primaryColor, null for secondaryColor
  const DEFAULT_PRIMARY_COLOR = '#0f172a';
  const normalizedPrimaryColor = (!primaryColor || primaryColor === '') ? DEFAULT_PRIMARY_COLOR : primaryColor;
  const normalizedSecondaryColor = (!secondaryColor || secondaryColor === '') ? null : secondaryColor;

  // Normalize website: empty string becomes null
  const normalizedWebsite = (!website || website === '') ? null : website;

  const updated = await prisma.organization.update({
    where: { id: tenant!.tenantId },
    data: {
      ...(name && { name }),
      ...(codePrefix && { codePrefix }),
      ...(primaryColor !== undefined && { primaryColor: normalizedPrimaryColor }),
      ...(secondaryColor !== undefined && { secondaryColor: normalizedSecondaryColor }),
      ...(website !== undefined && { website: normalizedWebsite }),
      ...(additionalCurrencies !== undefined && { additionalCurrencies }),
      ...(weekendDays !== undefined && { weekendDays }),
      ...(hasMultipleLocations !== undefined && { hasMultipleLocations }),
      ...(depreciationEnabled !== undefined && { depreciationEnabled }),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      codePrefix: true,
      primaryColor: true,
      secondaryColor: true,
      website: true,
      additionalCurrencies: true,
      weekendDays: true,
      hasMultipleLocations: true,
      depreciationEnabled: true,
    },
  });

  // Update setup progress (non-blocking)
  const progressUpdates: Record<string, boolean> = {};
  if (name) progressUpdates.profileComplete = true;
  if (primaryColor) progressUpdates.brandingConfigured = true;
  if (Object.keys(progressUpdates).length > 0) {
    updateSetupProgressBulk(tenant!.tenantId, progressUpdates).catch(() => {});
  }

  return NextResponse.json({ organization: updated });
}, { requireAuth: true, requireAdmin: true });

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * File: src/app/api/admin/organization/route.ts
 * Reviewed: 2026-02-01
 *
 * FUNCTIONALITY: [PASS]
 * - GET: Returns org details with auth config (secrets stripped)
 * - PATCH: Updates organization settings with validation
 * - Tracks onboarding progress on relevant updates
 * - Forces dynamic rendering to prevent stale cache
 *
 * SECURITY: [PASS]
 * - GET requires auth, PATCH requires admin
 * - OAuth secrets never exposed in responses (stripped before return)
 * - Proper validation of color formats (hex)
 * - URL validation for website field
 *
 * VALIDATION: [PASS]
 * - Zod schemas for all input fields
 * - Code prefix: 2-3 uppercase alphanumeric
 * - Colors: valid hex format or null
 * - Weekend days: array of 0-6 with min 1
 *
 * ERROR HANDLING: [PASS]
 * - 404 for organization not found
 * - Validation errors return structured response
 * - Non-blocking onboarding progress updates
 *
 * IMPROVEMENTS:
 * - Consider rate limiting for frequent updates
 * - Add activity logging for settings changes
 * - Document why enabledModules removed from schema
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
