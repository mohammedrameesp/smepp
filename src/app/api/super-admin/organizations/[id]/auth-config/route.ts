import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const authMethodSchema = z.enum(['credentials', 'google', 'azure-ad']);

const authConfigSchema = z.object({
  allowedAuthMethods: z.array(authMethodSchema).optional(),
  allowedEmailDomains: z.array(
    z.string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/, 'Invalid domain format')
      .transform((d) => d.toLowerCase())
  ).optional(),
  enforceDomainRestriction: z.boolean().optional(),
  // Custom OAuth credentials (enterprise feature)
  customGoogleClientId: z.string().nullable().optional(),
  customGoogleClientSecret: z.string().nullable().optional(),
  customAzureClientId: z.string().nullable().optional(),
  customAzureClientSecret: z.string().nullable().optional(),
  customAzureTenantId: z.string().nullable().optional(),
}).refine(
  (data) => {
    // If Google client ID is provided, secret must also be provided (and vice versa)
    const hasGoogleId = data.customGoogleClientId && data.customGoogleClientId.trim() !== '';
    const hasGoogleSecret = data.customGoogleClientSecret && data.customGoogleClientSecret.trim() !== '';
    if (hasGoogleId !== hasGoogleSecret) {
      return false;
    }
    return true;
  },
  { message: 'Google OAuth client ID and secret must be provided together', path: ['customGoogleClientId'] }
).refine(
  (data) => {
    // If Azure client ID is provided, secret must also be provided (and vice versa)
    const hasAzureId = data.customAzureClientId && data.customAzureClientId.trim() !== '';
    const hasAzureSecret = data.customAzureClientSecret && data.customAzureClientSecret.trim() !== '';
    if (hasAzureId !== hasAzureSecret) {
      return false;
    }
    return true;
  },
  { message: 'Azure OAuth client ID and secret must be provided together', path: ['customAzureClientId'] }
);

// ═══════════════════════════════════════════════════════════════════════════════
// ENCRYPTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// Simple encryption for storing OAuth secrets
// In production, you might want to use a more robust solution like AWS KMS or HashiCorp Vault
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || '';
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return '';
  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    console.error('Failed to decrypt OAuth secret');
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/organizations/[id]/auth-config
// Get organization auth configuration
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        allowedAuthMethods: true,
        allowedEmailDomains: true,
        enforceDomainRestriction: true,
        customGoogleClientId: true,
        customGoogleClientSecret: true,
        customAzureClientId: true,
        customAzureClientSecret: true,
        customAzureTenantId: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Return config without actual secrets - just indicate if they're set
    // Ensure arrays are never null (database might have null for new columns)
    return NextResponse.json({
      authConfig: {
        allowedAuthMethods: organization.allowedAuthMethods || [],
        allowedEmailDomains: organization.allowedEmailDomains || [],
        enforceDomainRestriction: organization.enforceDomainRestriction ?? false,
        // Indicate if custom OAuth is configured (don't expose actual credentials)
        hasCustomGoogleOAuth: !!(organization.customGoogleClientId && organization.customGoogleClientSecret),
        hasCustomAzureOAuth: !!(organization.customAzureClientId && organization.customAzureClientSecret),
        // Only expose non-sensitive OAuth config
        customGoogleClientId: organization.customGoogleClientId || null,
        customAzureClientId: organization.customAzureClientId || null,
        customAzureTenantId: organization.customAzureTenantId || null,
      },
    });
  } catch (error) {
    console.error('Get auth config error:', error);
    return NextResponse.json(
      { error: 'Failed to get auth configuration' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/super-admin/organizations/[id]/auth-config
// Update organization auth configuration
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = authConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check if organization exists
    const existing = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const {
      allowedAuthMethods,
      allowedEmailDomains,
      enforceDomainRestriction,
      customGoogleClientId,
      customGoogleClientSecret,
      customAzureClientId,
      customAzureClientSecret,
      customAzureTenantId,
    } = result.data;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (allowedAuthMethods !== undefined) {
      updateData.allowedAuthMethods = allowedAuthMethods;
    }

    if (allowedEmailDomains !== undefined) {
      updateData.allowedEmailDomains = allowedEmailDomains;
    }

    if (enforceDomainRestriction !== undefined) {
      updateData.enforceDomainRestriction = enforceDomainRestriction;
    }

    // Handle Google OAuth credentials
    if (customGoogleClientId !== undefined) {
      updateData.customGoogleClientId = customGoogleClientId || null;
    }
    if (customGoogleClientSecret !== undefined) {
      // Encrypt the secret before storing
      updateData.customGoogleClientSecret = customGoogleClientSecret
        ? encrypt(customGoogleClientSecret)
        : null;
    }

    // Handle Azure OAuth credentials
    if (customAzureClientId !== undefined) {
      updateData.customAzureClientId = customAzureClientId || null;
    }
    if (customAzureClientSecret !== undefined) {
      // Encrypt the secret before storing
      updateData.customAzureClientSecret = customAzureClientSecret
        ? encrypt(customAzureClientSecret)
        : null;
    }
    if (customAzureTenantId !== undefined) {
      updateData.customAzureTenantId = customAzureTenantId || null;
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        allowedAuthMethods: true,
        allowedEmailDomains: true,
        enforceDomainRestriction: true,
        customGoogleClientId: true,
        customAzureClientId: true,
        customAzureTenantId: true,
      },
    });

    return NextResponse.json({
      success: true,
      authConfig: {
        allowedAuthMethods: organization.allowedAuthMethods,
        allowedEmailDomains: organization.allowedEmailDomains,
        enforceDomainRestriction: organization.enforceDomainRestriction,
        hasCustomGoogleOAuth: !!organization.customGoogleClientId,
        hasCustomAzureOAuth: !!organization.customAzureClientId,
        customGoogleClientId: organization.customGoogleClientId || null,
        customAzureClientId: organization.customAzureClientId || null,
        customAzureTenantId: organization.customAzureTenantId || null,
      },
    });
  } catch (error) {
    console.error('Update auth config error:', error);
    return NextResponse.json(
      { error: 'Failed to update auth configuration' },
      { status: 500 }
    );
  }
}
