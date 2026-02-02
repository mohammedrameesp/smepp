/**
 * @module app/(marketing)/layout
 * @description Root layout for marketing pages in the (marketing) route group.
 * Wraps all marketing pages with the CookieConsent component to display
 * cookie consent banner to visitors on landing and legal pages.
 */

import { CookieConsent } from '@/components/cookie-consent';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CookieConsent />
    </>
  );
}

/*
 * =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * OVERVIEW:
 * Minimal layout component for the (marketing) route group that wraps all
 * marketing pages (landing, privacy, terms, cookies) with a cookie consent
 * banner component.
 *
 * ARCHITECTURE:
 * - Server Component (no 'use client' directive)
 * - Uses React Fragment to avoid unnecessary DOM wrapper
 * - Imports CookieConsent component using path alias
 * - Part of Next.js App Router route group pattern
 *
 * STRENGTHS:
 * - Clean and minimal implementation
 * - Single responsibility: adds cookie consent to marketing pages
 * - Uses path alias (@/) for clean imports
 * - Proper TypeScript typing for children prop
 * - Fragment usage avoids extra DOM nodes
 *
 * POTENTIAL IMPROVEMENTS:
 * - Could add metadata export for default marketing page SEO settings
 * - Consider adding common marketing page styling or providers here
 * - No error boundary - could wrap children for graceful error handling
 * - Could add analytics provider initialization at this level
 * - Missing viewport or other layout-level configurations
 *
 * SECURITY CONSIDERATIONS:
 * - No security concerns in this simple wrapper component
 * - Cookie consent component handles user preference storage
 *
 * ACCESSIBILITY:
 * - Passes through children without modification
 * - CookieConsent component should handle its own a11y
 *
 * DEPENDENCIES:
 * - @/components/cookie-consent - CookieConsent component
 *
 * NOTES:
 * - This layout only applies to routes in (marketing) group
 * - Does not affect admin, employee, or auth routes
 * =============================================================================
 */
