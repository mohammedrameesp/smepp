/**
 * @module app/admin/(system)/users/[id]/hr/page
 * @description Redirect page for backwards compatibility. Routes /admin/users/[id]/hr
 * to /admin/employees/[id]/edit. The HR-specific page has been consolidated into the
 * main employee edit page.
 */
import { redirect } from 'next/navigation';

/**
 * Props for the user HR redirect page.
 */
interface Props {
  /** Dynamic route parameters containing the user ID */
  params: Promise<{ id: string }>;
}

/**
 * Redirect page component for user HR details.
 * Extracts the user ID from params and redirects to the employees edit page.
 * HR information is now managed within the unified employee edit page.
 * @param props - Component props containing route params
 * @returns Never returns - always redirects
 */
export default async function UserHRRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/employees/${id}/edit`);
}

/*
================================================================================
CODE REVIEW SUMMARY
================================================================================

## Overview
Dynamic redirect page that maintains backwards compatibility for the /admin/users/[id]/hr
route by redirecting to /admin/employees/[id]/edit. The separate HR page has been
consolidated into the main employee edit page.

## Functionality
- Extracts the user ID from the dynamic route parameter
- Redirects to the employees edit page (HR info is now part of the edit form)
- Ensures existing bookmarks and external links continue to work

## Code Quality: GOOD
- Clean, minimal implementation
- Proper use of Next.js redirect function
- Correctly handles async params (Next.js 15+ pattern)
- TypeScript types are properly defined

## Security: GOOD
- The ID is passed through without modification
- No opportunity for injection attacks - redirect target is a fixed path
- Validation of the ID happens at the destination route

## Performance: GOOD
- Server-side redirect is fast
- Minimal async operation (just awaiting params)

## Recommendations
1. OPTIONAL: Consider adding a deprecation notice in documentation
2. OPTIONAL: Could be removed in a future major version after sufficient migration time
3. NOTE: This redirects to /edit, not /hr - the HR page concept has been merged

## Technical Debt: LOW
- These redirect pages should eventually be removed once all references are updated

================================================================================
*/
