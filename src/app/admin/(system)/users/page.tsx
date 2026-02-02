/**
 * @module app/admin/(system)/users/page
 * @description Redirect page for backwards compatibility. Routes /admin/users to /admin/employees.
 * The employees page is now the central hub for managing organization members.
 */
import { redirect } from 'next/navigation';

/**
 * Redirect page component for users listing.
 * Immediately redirects to the employees page for backwards compatibility.
 * @returns Never returns - always redirects
 */
export default function UsersRedirectPage() {
  redirect('/admin/employees');
}

/*
================================================================================
CODE REVIEW SUMMARY
================================================================================

## Overview
Simple redirect page that maintains backwards compatibility for the /admin/users
route by redirecting to /admin/employees.

## Functionality
- Provides a permanent redirect from old users route to new employees route
- The employees page is now the central hub for managing organization members

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
