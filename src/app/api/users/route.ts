/**
 * @file route.ts
 * @description Users list and create API endpoints
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { createUserSchema } from '@/features/users/validations/users';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { sendEmail } from '@/lib/core/email';
import { welcomeUserEmail, welcomeUserWithPasswordSetupEmail, organizationInvitationEmail } from '@/lib/core/email-templates';
import { randomBytes } from 'crypto';
import { updateSetupProgress } from '@/features/onboarding/lib';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
import logger from '@/lib/core/log';

async function getUsersHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const includeHrProfile = searchParams.get('includeHrProfile') === 'true';
  const includeAll = searchParams.get('includeAll') === 'true';
  const includeDeleted = searchParams.get('includeDeleted') === 'true';

  // Query TeamMember instead of User (all HR data is now on TeamMember)
  // Note: tenantId filtering is handled automatically by tenant-scoped prisma client
  const where: Record<string, unknown> = {};
  // Filter by isAdmin if role query param is provided (ADMIN = isAdmin true, MEMBER = isAdmin false)
  if (role === 'ADMIN') where.isAdmin = true;
  else if (role === 'MEMBER') where.isAdmin = false;

  // By default, exclude soft-deleted users unless explicitly requested
  if (!includeDeleted) {
    where.isDeleted = false;
  }

  // Fetch team members (tenant-scoped via extension)
  const members = await db.teamMember.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // Transform to maintain backwards compatibility with frontend
  const users = members.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    image: member.image,
    role: member.isAdmin ? 'ADMIN' : 'MEMBER',
    isEmployee: member.isEmployee,
    isOnWps: member.isOnWps,
    isDeleted: member.isDeleted,
    deletedAt: member.deletedAt,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    // Include HR-like data if requested
    hrProfile: (includeHrProfile || includeAll) ? {
      id: member.id,
      tenantId: member.tenantId,
      dateOfJoining: member.dateOfJoining,
      employeeId: member.employeeCode,
      designation: member.designation,
    } : undefined,
  }));

  return NextResponse.json(includeHrProfile || includeAll ? { users } : users);
}

export const GET = withErrorHandler(getUsersHandler, { requireAdmin: true });

async function createUserHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const { tenantId, userId: currentUserId } = tenant;
  const db = tenantPrisma as TenantPrismaClient;

  // Parse and validate request body
  const body = await request.json();
  const validation = createUserSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues
    }, { status: 400 });
  }

  const { name, email, isAdmin, employeeId, designation, isEmployee, canLogin, isOnWps } = validation.data;

  // Generate email for non-login users (use placeholder to satisfy unique constraint)
  // Format: nologin-{uuid}@{tenantSlug}.internal
  let finalEmail: string = email || '';
  if (!canLogin && !email) {
    const crypto = await import('crypto');
    const uniqueId = crypto.randomUUID().split('-')[0]; // Use first segment of UUID for shorter ID
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    finalEmail = `nologin-${uniqueId}@${org?.slug || 'system'}.internal`;
  }

  // Check if user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: finalEmail },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: 'User with this email already exists' },
      { status: 409 }
    );
  }

  // Generate employee code if not provided (only for employees)
  let finalEmployeeId = employeeId;
  if (isEmployee && !finalEmployeeId) {
    // Generate employee code using organization's code prefix: {PREFIX}-YYYY-XXX (e.g., ORG-2026-001)
    const year = new Date().getFullYear();
    const orgPrefix = await getOrganizationCodePrefix(tenantId);
    const prefix = `${orgPrefix}-${year}`;
    const count = await db.teamMember.count({
      where: {
        employeeCode: { startsWith: prefix }
      }
    });
    finalEmployeeId = `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  // For non-employees, set their profile image to the org logo
  let userImage: string | null = null;
  if (!isEmployee) {
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { logoUrl: true },
    });
    userImage = org?.logoUrl || null;
  }

  // Create TeamMember directly (replaces User + OrganizationUser + HRProfile)
  // Note: isAdmin boolean controls dashboard access (true = /admin, false = /employee)
  // Note: tenantId is included explicitly for type safety; the tenant prisma
  // extension also auto-injects it but TypeScript requires it at compile time
  const member = await db.teamMember.create({
    data: {
      tenantId,
      name,
      email: finalEmail,
      isAdmin, // Dashboard access: true → /admin, false → /employee
      isEmployee,
      canLogin,
      isOnWps: isEmployee ? isOnWps : false, // Only set WPS for employees
      image: userImage, // Set to org logo for non-employees, null for employees
      emailVerified: null,
      isOwner: false,
      // HR profile fields (embedded in TeamMember)
      employeeCode: isEmployee ? finalEmployeeId : null,
      designation: isEmployee ? (designation || null) : null,
      onboardingComplete: false,
      onboardingStep: 0,
    },
  });

  // For backwards compatibility, alias to 'user'
  const user = {
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.isAdmin ? 'ADMIN' : 'MEMBER',
    hrProfile: isEmployee ? {
      employeeId: member.employeeCode,
      designation: member.designation,
    } : null,
  };

  // Log activity
  await logAction(
    tenantId,
    currentUserId,
    ActivityActions.USER_CREATED,
    'User',
    user.id,
    { userName: user.name, userEmail: user.email, userRole: user.role }
  );

  // Update setup progress for first team member (non-blocking)
  updateSetupProgress(tenantId, 'firstTeamMemberInvited', true).catch(() => {});

  // Note: Leave balances are initialized when the employee completes
  // their HR profile onboarding with dateOfJoining set

  // Send welcome/invitation email only to users who can login (non-blocking)
  if (canLogin && finalEmail && !finalEmail.endsWith('.internal')) {
    try {
      // Fetch organization with auth config for customized email
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: {
          slug: true,
          name: true,
          primaryColor: true,
          customGoogleClientId: true,
          customGoogleClientSecret: true,
          customAzureClientId: true,
          customAzureClientSecret: true,
          allowedAuthMethods: true,
        },
      });

      // Determine which auth methods are enabled
      // If allowedAuthMethods is empty, all methods are allowed (default)
      const allowedMethods = org?.allowedAuthMethods || [];
      const allMethodsAllowed = allowedMethods.length === 0;

      const hasGoogle = !!(org?.customGoogleClientId && org?.customGoogleClientSecret) && (allMethodsAllowed || allowedMethods.includes('google'));
      const hasMicrosoft = !!(org?.customAzureClientId && org?.customAzureClientSecret) && (allMethodsAllowed || allowedMethods.includes('azure-ad'));
      const hasPassword = allMethodsAllowed || allowedMethods.includes('credentials');
      const hasSSO = hasGoogle || hasMicrosoft;

      // Determine email type based on auth config:
      // 1. SSO available: Create invitation + send invitation email
      // 2. Credentials only: Generate setup token + send password setup email
      if (hasSSO) {
        // SSO org: Create OrganizationInvitation and send invitation email
        // Generate invitation token (7-day expiry)
        const inviteToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create invitation record linked by email
        await prisma.organizationInvitation.create({
          data: {
            organizationId: tenantId,
            email: finalEmail,
            name: name,
            role: isAdmin ? 'ADMIN' : 'MEMBER', // Role string for invitation
            token: inviteToken,
            isEmployee,
            isOnWps: isEmployee ? isOnWps : null,
            invitedById: currentUserId,
            expiresAt,
          },
        });

        // Send invitation email
        const emailContent = organizationInvitationEmail({
          userName: user.name || user.email,
          userEmail: user.email,
          userRole: user.role,
          orgSlug: org?.slug || 'app',
          orgName: org?.name || 'Organization',
          inviteToken,
          authMethods: { hasGoogle, hasMicrosoft },
          designation: isEmployee ? designation : null,
          employeeCode: isEmployee ? finalEmployeeId : null,
          primaryColor: org?.primaryColor || undefined,
        });
        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } else if (hasPassword) {
        // Credentials-only org: Generate setup token and send password setup email
        const setupToken = randomBytes(32).toString('hex');
        const setupTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Update TeamMember with setup token (tenant-scoped via extension)
        await db.teamMember.update({
          where: { id: member.id },
          data: { setupToken, setupTokenExpiry },
        });

        // Send welcome email with password setup link
        const emailContent = welcomeUserWithPasswordSetupEmail({
          userName: user.name || user.email,
          userEmail: user.email,
          userRole: user.role,
          orgSlug: org?.slug || 'app',
          orgName: org?.name || 'Organization',
          setupToken,
          primaryColor: org?.primaryColor || undefined,
        });
        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } else {
        // Fallback: Send regular welcome email
        const emailContent = welcomeUserEmail({
          userName: user.name || user.email,
          userEmail: user.email,
          userRole: user.role,
          orgSlug: org?.slug || 'app',
          orgName: org?.name || 'Organization',
          authMethods: {
            hasGoogle,
            hasMicrosoft,
            hasPassword,
          },
          primaryColor: org?.primaryColor || undefined,
        });
        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      }
    } catch (emailError) {
      logger.error({ error: String(emailError), userId: user.id }, 'Failed to send welcome/invitation email');
      // Don't fail the request if email fails
    }
  }

  return NextResponse.json(user, { status: 201 });
}

export const POST = withErrorHandler(createUserHandler, { requireAdmin: true });