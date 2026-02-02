/**
 * @module app/login/layout
 * @description Login page layout with dynamic metadata for social sharing.
 *
 * This layout component generates dynamic metadata for the login page based on
 * the organization (tenant) context. It enables proper WhatsApp and social media
 * previews to show organization-specific information.
 *
 * Key features:
 * - Extracts organization from subdomain or custom domain
 * - Generates org-specific title, description, and OpenGraph images
 * - Falls back to default Durj branding for main domain
 * - Supports both subdomain routing (org.domain.com) and custom domains
 *
 * @dependencies
 * - prisma: Database access for organization lookup
 * - next/headers: Server-side header access for host detection
 */
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { prisma } from '@/lib/core/prisma';

/**
 * Generate dynamic metadata for login page based on organization branding.
 * This enables WhatsApp/social media previews to show org-specific info.
 */
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'quriosityhub.com';

  // Default metadata for main domain
  const defaultMeta: Metadata = {
    title: 'Login | Durj',
    description: 'Sign in to Durj - Business Management Platform for SMBs',
    openGraph: {
      title: 'Login | Durj',
      description: 'Sign in to Durj - Business Management Platform for SMBs',
      type: 'website',
      images: ['/sme-icon-shield-512.png'],
    },
  };

  try {
    let organization = null;

    // Check if this is a custom domain (not a subdomain of the app domain)
    if (!host.endsWith(appDomain) && !host.includes('localhost')) {
      // Custom domain - look up by customDomain field
      organization = await prisma.organization.findFirst({
        where: {
          customDomain: host,
          customDomainVerified: true,
        },
        select: {
          name: true,
          logoUrl: true,
          primaryColor: true,
        },
      });
    } else {
      // Subdomain - extract and look up
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== appDomain.split('.')[0]) {
        organization = await prisma.organization.findUnique({
          where: { slug: subdomain.toLowerCase() },
          select: {
            name: true,
            logoUrl: true,
            primaryColor: true,
          },
        });
      }
    }

    if (!organization) {
      return defaultMeta;
    }

    const title = `Login | ${organization.name}`;
    const description = `Sign in to ${organization.name}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: organization.logoUrl ? [organization.logoUrl] : ['/sme-icon-shield-512.png'],
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: organization.logoUrl ? [organization.logoUrl] : ['/sme-icon-shield-512.png'],
      },
    };
  } catch (error) {
    console.error('Error generating login metadata:', error);
    return defaultMeta;
  }
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

/* =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * WHAT THIS FILE DOES:
 * Server-side layout for the login page that generates dynamic metadata for
 * SEO and social sharing based on the organization context.
 *
 * KEY FUNCTIONS:
 * - generateMetadata: Async function that determines org from host and generates
 *   appropriate OpenGraph/Twitter card metadata
 *
 * METADATA GENERATION:
 * 1. Custom domain: Looks up org by customDomain field (verified only)
 * 2. Subdomain: Extracts slug from host and looks up by slug
 * 3. Main domain: Returns default Durj branding
 *
 * POTENTIAL ISSUES:
 * 1. [LOW] Error handling logs to console but doesn't surface to monitoring
 * 2. [LOW] Subdomain extraction uses simple split - may have edge cases with
 *    complex domain structures
 *
 * SECURITY CONSIDERATIONS:
 * - Only verified custom domains are used for branding
 * - Database query is read-only with limited field selection
 *
 * PERFORMANCE:
 * - Prisma query is minimal (only selects name, logoUrl, primaryColor)
 * - Error cases fall back to default metadata without blocking
 *
 * LAST REVIEWED: 2025-01-27
 * REVIEWED BY: Code Review System
 * =========================================================================== */
