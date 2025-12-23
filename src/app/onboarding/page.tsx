'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, ArrowRight, Check, Globe, AlertCircle, CheckCircle } from 'lucide-react';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState<{
    available: boolean;
    valid: boolean;
    error?: string;
  } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Check if user already has an organization
  useEffect(() => {
    if (session?.user?.organizationId) {
      router.push('/admin');
    }
  }, [session, router]);

  // Auto-generate subdomain from org name if not manually edited
  useEffect(() => {
    if (!subdomainEdited && organizationName) {
      const generatedSlug = generateSlug(organizationName);
      setSubdomain(generatedSlug);
    }
  }, [organizationName, subdomainEdited]);

  // Check subdomain availability with debounce
  const checkSubdomain = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSubdomainStatus(null);
      return;
    }

    setCheckingSubdomain(true);
    try {
      const response = await fetch(`/api/subdomains/check?slug=${encodeURIComponent(slug)}`);
      const data = await response.json();
      setSubdomainStatus({
        available: data.available,
        valid: data.valid,
        error: data.error,
      });
    } catch {
      setSubdomainStatus(null);
    } finally {
      setCheckingSubdomain(false);
    }
  }, []);

  // Debounced subdomain check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (subdomain) {
        checkSubdomain(subdomain);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [subdomain, checkSubdomain]);

  const handleSubdomainChange = (value: string) => {
    // Only allow valid subdomain characters
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(cleaned);
    setSubdomainEdited(true);
    setSubdomainStatus(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (organizationName.trim().length < 2) {
      setError('Organization name must be at least 2 characters');
      return;
    }

    if (subdomain.length < 3) {
      setError('Subdomain must be at least 3 characters');
      return;
    }

    if (subdomainStatus && !subdomainStatus.available) {
      setError(subdomainStatus.error || 'This subdomain is not available');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: organizationName.trim(),
          slug: subdomain,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      // Update session to include new organization
      await update();

      // Show success state with URL
      setSuccess(true);
      setSuccessUrl(data.organization.url);

      // Redirect to the new subdomain after a short delay
      setTimeout(() => {
        if (data.organization.url) {
          window.location.href = `${data.organization.url}/admin`;
        } else {
          router.push('/admin');
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
              {success ? (
                <Check className="h-6 w-6 text-white" />
              ) : (
                <Building2 className="h-6 w-6 text-white" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {success ? 'All Set!' : 'Create Your Workspace'}
          </CardTitle>
          <CardDescription>
            {success
              ? 'Your workspace is ready. Redirecting...'
              : 'Set up your organization and subdomain'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="text-center py-4 space-y-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
              {successUrl && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    Your workspace URL:
                  </p>
                  <p className="font-mono text-sm text-green-900 font-medium mt-1">
                    {successUrl}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Organization Name */}
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="organizationName"
                    type="text"
                    placeholder="Enter your company name"
                    value={organizationName}
                    onChange={(e) => {
                      setOrganizationName(e.target.value);
                      setError(null);
                    }}
                    className="pl-10"
                    required
                    minLength={2}
                    autoFocus
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Subdomain */}
              <div className="space-y-2">
                <Label htmlFor="subdomain">Your Workspace URL</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="subdomain"
                      type="text"
                      placeholder="your-company"
                      value={subdomain}
                      onChange={(e) => handleSubdomainChange(e.target.value)}
                      className="pl-10 pr-10 font-mono"
                      required
                      minLength={3}
                      maxLength={63}
                      disabled={isLoading}
                    />
                    {/* Status indicator */}
                    <div className="absolute right-3 top-3">
                      {checkingSubdomain ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : subdomainStatus ? (
                        subdomainStatus.available ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )
                      ) : null}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    .{APP_DOMAIN.split(':')[0]}
                  </span>
                </div>

                {/* Subdomain feedback */}
                {subdomainStatus && (
                  <p className={`text-xs ${subdomainStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                    {subdomainStatus.available
                      ? 'This subdomain is available!'
                      : subdomainStatus.error || 'This subdomain is not available'}
                  </p>
                )}

                {/* URL Preview */}
                {subdomain && subdomain.length >= 3 && (
                  <div className="bg-slate-50 border rounded-md p-2 mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Your workspace will be available at:</p>
                    <p className="font-mono text-sm text-slate-700">
                      https://{subdomain}.{APP_DOMAIN.split(':')[0]}
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  organizationName.trim().length < 2 ||
                  subdomain.length < 3 ||
                  checkingSubdomain ||
                  (subdomainStatus !== null && !subdomainStatus.available)
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
