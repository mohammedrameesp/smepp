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
