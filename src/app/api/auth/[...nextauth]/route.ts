/**
 * @module api/auth/nextauth
 * @description NextAuth.js catch-all route handler.
 *
 * This is the main authentication endpoint that handles all NextAuth.js
 * operations including sign-in, sign-out, callbacks, and session management.
 * Configuration is defined in @/lib/core/auth.
 *
 * @route GET|POST /api/auth/[...nextauth]
 *
 * @security
 * - Supports multiple OAuth providers (Google, Microsoft)
 * - Credentials provider for email/password auth
 * - Session management via JWT or database sessions
 * - CSRF protection built into NextAuth
 *
 * @see {@link @/lib/core/auth} for authOptions configuration
 */
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/core/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

/* =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * OVERVIEW:
 * NextAuth.js catch-all route that delegates all authentication operations
 * to the configured authOptions. This is a thin wrapper; all logic is in
 * @/lib/core/auth.
 *
 * SECURITY ASSESSMENT: GOOD
 * - Uses NextAuth's built-in CSRF protection
 * - Actual security configuration in authOptions (see @/lib/core/auth)
 * - No custom logic to introduce vulnerabilities
 *
 * POTENTIAL IMPROVEMENTS:
 * 1. Review authOptions for rate limiting on login attempts
 * 2. Ensure JWT secret rotation strategy in place
 * 3. Consider session revocation capabilities
 *
 * DEPENDENCIES:
 * - next-auth: Authentication framework
 * - @/lib/core/auth: authOptions configuration
 *
 * LAST REVIEWED: 2026-02-01
 * ============================================================================= */