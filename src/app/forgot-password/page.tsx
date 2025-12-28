'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, AlertCircle, Check, ArrowLeft } from 'lucide-react';
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
  const primaryColor = branding?.primaryColor || '#2563eb';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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

  const orgName = branding?.organizationName || 'SME++';

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Dynamic Branding */}
      <TenantBrandedPanel
        branding={branding}
        isLoading={subdomainLoading || brandingLoading}
        variant={subdomain ? 'tenant' : 'super-admin'}
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
                <img src="/sme-icon-shield-512.png" alt="SME++" className="h-10 w-10" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {subdomain ? orgName : 'SME++'}
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
                  <Check className="h-6 w-6 text-green-600" />
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
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
                  <ArrowLeft className="h-4 w-4" />
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
