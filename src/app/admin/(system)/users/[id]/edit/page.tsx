/**
 * @module app/admin/(system)/users/[id]/edit/page
 * @description Redirect page for backwards compatibility. Routes /admin/users/[id]/edit
 * to /admin/employees/[id]/edit. This ensures old bookmarks and links continue to work
 * after the migration from users to employees module.
 */
import { redirect } from 'next/navigation';

/**
 * Props for the user edit redirect page.
 */
interface Props {
  /** Dynamic route parameters containing the user ID */
  params: Promise<{ id: string }>;
}

/**
 * Redirect page component for user edit.
 * Extracts the user ID from params and redirects to the employees edit page.
 * @param props - Component props containing route params
 * @returns Never returns - always redirects
 */
export default async function UserEditRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/employees/${id}/edit`);
}

/*
================================================================================
CODE REVIEW SUMMARY
================================================================================

## Overview
Dynamic redirect page that maintains backwards compatibility for the /admin/users/[id]/edit
route by redirecting to /admin/employees/[id]/edit with the same user ID.

## Functionality
- Extracts the user ID from the dynamic route parameter
- Redirects to the corresponding employees edit page
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

## Technical Debt: LOW
- These redirect pages should eventually be removed once all references are updated

================================================================================
*/
