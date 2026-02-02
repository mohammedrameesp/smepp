/**
 * @module app/forgot-password/page
 * @description Forgot password page for initiating password reset flow.
 *
 * This page allows users to request a password reset email. It's tenant-aware
 * and displays appropriate branding when accessed from an organization subdomain.
 *
 * Key features:
 * - Email input form with validation
 * - Tenant-specific branding via TenantBrandedPanel
 * - Success state with email confirmation message
 * - Consistent "try again" option if email not received
 * - Links back to login page
 * - Passes orgSlug to API for tenant context
 *
 * Security notes:
 * - Does not reveal whether email exists in system (prevents enumeration)
 * - Rate limiting handled by API endpoint
 *
 * @dependencies
 * - useSubdomain: Hook to detect tenant subdomain
 * - useTenantBranding: Fetch org branding colors and logo
 * - TenantBrandedPanel: Left-side branding panel
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { useSubdomain } from '@/hooks/use-subdomain';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import { TenantBrandedPanel } from '@/components/auth/TenantBrandedPanel';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Get subdomain and tenant branding
  const { subdomain, isLoading: subdomainLoading } = useSubdomain();
  const { branding, isLoading: brandingLoading } = useTenantBranding(subdomain);

  // Dynamic colors based on branding
  const primaryColor = branding?.primaryColor || '#0f172a';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, orgSlug: subdomain || '' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const orgName = branding?.organizationName || 'Durj';

  // Loading state - wait for branding to prevent flash
  if (subdomainLoading || brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className={`${ICON_SIZES.xl} animate-spin mx-auto mb-4 text-primary`} />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Dynamic Branding */}
      <TenantBrandedPanel
        branding={branding}
        isLoading={subdomainLoading || brandingLoading}
        variant={subdomain ? 'tenant' : 'super-admin'}
        welcomeTitleOverride="Happens to Everyone"
        welcomeSubtitleOverride="We'll email you a link to reset your password"
      />

      {/* Right Column - Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={orgName}
                className="h-12 w-auto mx-auto mb-2"
              />
            ) : (
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src="/sme-icon-shield-512.png" alt="Durj" className="h-10 w-10" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {subdomain ? orgName : 'Durj'}
                </h1>
              </div>
            )}
            <p className="text-gray-600 dark:text-gray-400">
              {subdomain ? 'Password Recovery' : 'Business Management Platform'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {success ? (
              // Success State
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Check className={`${ICON_SIZES.lg} text-green-600`} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Check your email
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Didn&apos;t receive the email? Check your spam folder or try again.
                </p>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSuccess(false);
                      setEmail('');
                    }}
                  >
                    Try a different email
                  </Button>
                  <Link href="/login">
                    <Button
                      className="w-full text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Back to sign in
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              // Form State
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Forgot password?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    No worries, we&apos;ll send you reset instructions.
                  </p>
                </div>

                {error && (
                  <Alert variant="error" className="mb-4">
                    <AlertCircle className={ICON_SIZES.sm} />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className={`absolute left-3 top-3 ${ICON_SIZES.sm} text-muted-foreground`} />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-white"
                    style={{ backgroundColor: primaryColor }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
                        Sending...
                      </>
                    ) : (
                      'Reset password'
                    )}
                  </Button>
                </form>

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-6"
                  style={{ color: primaryColor }}
                >
                  <ArrowLeft className={ICON_SIZES.sm} />
                  Back to sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * WHAT THIS FILE DOES:
 * Provides a form for users to request a password reset email. Tenant-aware
 * with organization-specific branding.
 *
 * KEY STATES:
 * - Form: Initial email input state
 * - Loading: While sending reset request
 * - Success: Shows confirmation message (same regardless of email existence)
 *
 * POTENTIAL ISSUES:
 * 1. [LOW] No rate limiting on client side - relies entirely on API
 * 2. [LOW] Could add email format validation before submission
 *
 * SECURITY CONSIDERATIONS:
 * - Does NOT reveal if email exists (prevents enumeration attacks)
 * - Success message is generic: "If an account exists..."
 * - orgSlug passed to API for tenant context
 *
 * PERFORMANCE:
 * - Simple component with minimal state
 * - Branding loaded via hook, cached if same subdomain
 *
 * ACCESSIBILITY:
 * - Proper form labels
 * - Loading states indicated visually and via disabled buttons
 * - Success/error states have appropriate visual indicators
 *
 * LAST REVIEWED: 2025-01-27
 * REVIEWED BY: Code Review System
 * =========================================================================== */
