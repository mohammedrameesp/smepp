/**
 * @module app/admin/(system)/users/new/page
 * @description Redirect page for backwards compatibility. Routes /admin/users/new to /admin/employees/new.
 * This ensures old bookmarks and links continue to work after the migration from users to employees module.
 */
import { redirect } from 'next/navigation';

/**
 * Redirect page component for new user creation.
 * Immediately redirects to the employees new page for backwards compatibility.
 * @returns Never returns - always redirects
 */
export default function NewUserRedirectPage() {
  redirect('/admin/employees/new');
}

/*
================================================================================
CODE REVIEW SUMMARY
================================================================================

## Overview
Simple redirect page that maintains backwards compatibility for the /admin/users/new
route by redirecting to /admin/employees/new.

## Functionality
- Provides a permanent redirect from old users route to new employees route
- Ensures existing bookmarks and external links continue to work

## Code Quality: GOOD
- Clean, minimal implementation
- Proper use of Next.js redirect function
- Self-documenting code

## Security: GOOD
- No security concerns - simple redirect with no user input processing
- Uses Next.js built-in redirect which handles security properly

## Performance: GOOD
- Server-side redirect is fast
- No unnecessary operations

## Recommendations
1. OPTIONAL: Consider adding a deprecation notice in documentation
2. OPTIONAL: Could be removed in a future major version after sufficient migration time

## Technical Debt: LOW
- These redirect pages should eventually be removed once all references are updated

================================================================================
*/
