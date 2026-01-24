/**
 * @file get-org-info.ts
 * @description Helper functions for fetching organization information
 * @module core
 *
 * These helpers provide a consistent way to fetch organization details
 * for use in notifications, emails, and other features that need org context.
 */

import { prisma } from './prisma';

/**
 * Organization info returned by getOrgInfo
 */
export interface OrgInfo {
  /** Tenant ID */
  id: string;
  /** Organization slug (used for URLs) */
  slug: string;
  /** Organization name */
  name: string;
  /** Primary brand color (hex) */
  primaryColor: string | null;
}

/**
 * Default organization info when org is not found
 */
const DEFAULT_ORG_INFO: OrgInfo = {
  id: '',
  slug: 'app',
  name: 'Durj',
  primaryColor: null,
};

/**
 * Get organization info by tenant ID.
 * Returns default values if organization is not found.
 *
 * @example
 * ```ts
 * const org = await getOrgInfo(tenantId);
 * const appUrl = `https://${org.slug}.durj.com`;
 * const emailHeader = `From ${org.name}`;
 * ```
 */
export async function getOrgInfo(tenantId: string): Promise<OrgInfo> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      primaryColor: true,
    },
  });

  if (!org) {
    return { ...DEFAULT_ORG_INFO, id: tenantId };
  }

  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    primaryColor: org.primaryColor,
  };
}

/**
 * Extended organization info including logo
 */
export interface OrgInfoWithLogo extends OrgInfo {
  /** Logo URL */
  logoUrl: string | null;
}

/**
 * Get organization info including logo URL.
 * Use this when you need to display the organization's branding.
 *
 * @example
 * ```ts
 * const org = await getOrgInfoWithLogo(tenantId);
 * <img src={org.logoUrl || '/default-logo.svg'} alt={org.name} />
 * ```
 */
export async function getOrgInfoWithLogo(
  tenantId: string
): Promise<OrgInfoWithLogo> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      primaryColor: true,
      logoUrl: true,
    },
  });

  if (!org) {
    return { ...DEFAULT_ORG_INFO, id: tenantId, logoUrl: null };
  }

  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    primaryColor: org.primaryColor,
    logoUrl: org.logoUrl,
  };
}

/**
 * Notification context including org info and current user name.
 * Used when sending notifications that need both org and user context.
 */
export interface NotificationContext {
  org: OrgInfo;
  currentUserName: string;
}

/**
 * Get notification context (org info + current user name).
 * Useful for sending notifications where you need to identify both
 * the organization and the user who triggered the action.
 *
 * @example
 * ```ts
 * const ctx = await getNotificationContext(tenantId, userId);
 * await sendEmail({
 *   subject: `New request from ${ctx.currentUserName}`,
 *   template: 'notification',
 *   data: { orgName: ctx.org.name, userName: ctx.currentUserName },
 * });
 * ```
 */
export async function getNotificationContext(
  tenantId: string,
  userId: string
): Promise<NotificationContext> {
  const [org, member] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, name: true, primaryColor: true },
    }),
    prisma.teamMember.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
  ]);

  return {
    org: org
      ? {
          id: org.id,
          slug: org.slug,
          name: org.name,
          primaryColor: org.primaryColor,
        }
      : { ...DEFAULT_ORG_INFO, id: tenantId },
    currentUserName: member?.name || member?.email || 'User',
  };
}

/**
 * Build the app URL for an organization
 *
 * @example
 * ```ts
 * const url = buildOrgUrl('acme', '/dashboard'); // https://acme.durj.com/dashboard
 * ```
 */
export function buildOrgUrl(slug: string, path: string = ''): string {
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? `https://${slug}.durj.com`
      : `http://${slug}.localhost:3000`;

  return `${baseUrl}${path}`;
}

/**
 * Build the app URL for a tenant by ID
 */
export async function buildOrgUrlByTenantId(
  tenantId: string,
  path: string = ''
): Promise<string> {
  const org = await getOrgInfo(tenantId);
  return buildOrgUrl(org.slug, path);
}
