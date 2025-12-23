'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Building2,
  Globe,
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Send,
  Copy,
  Check,
} from 'lucide-react';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [organizationName, setOrganizationName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');

  // Subdomain validation
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState<{
    available: boolean;
    valid: boolean;
    error?: string;
  } | null>(null);

  // Auto-generate subdomain from org name
  useEffect(() => {
    if (!subdomainEdited && organizationName) {
      setSubdomain(generateSlug(organizationName));
    }
  }, [organizationName, subdomainEdited]);

  // Check subdomain availability
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

    // Email validation with proper regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!adminEmail || !emailRegex.test(adminEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/super-admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: organizationName.trim(),
          slug: subdomain,
          adminEmail: adminEmail.trim().toLowerCase(),
          adminName: adminName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      setSuccess(true);
      setInviteUrl(data.invitation?.inviteUrl || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInviteUrl = async () => {
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Organization Created!</h3>
            <p className="text-muted-foreground text-center mb-4">
              Share the invitation link with <strong>{adminEmail}</strong>
            </p>

            {inviteUrl && (
              <div className="w-full max-w-md space-y-2">
                <Label className="text-sm font-medium">Invitation Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyInviteUrl}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This link expires in 7 days. Copy and send it to the admin.
                </p>
              </div>
            )}

            <div className="mt-6">
              <Link href="/super-admin">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/super-admin"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Organization
          </CardTitle>
          <CardDescription>
            Create a new organization and invite the first admin
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Organization Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Organization Details
              </h3>

              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="organizationName"
                    placeholder="Acme Corporation"
                    value={organizationName}
                    onChange={(e) => {
                      setOrganizationName(e.target.value);
                      setError(null);
                    }}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdomain *</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="subdomain"
                      placeholder="acme"
                      value={subdomain}
                      onChange={(e) => handleSubdomainChange(e.target.value)}
                      className="pl-10 pr-10 font-mono"
                      required
                      disabled={isLoading}
                    />
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
                {subdomainStatus && (
                  <p className={`text-xs ${subdomainStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                    {subdomainStatus.available
                      ? 'This subdomain is available!'
                      : subdomainStatus.error || 'This subdomain is not available'}
                  </p>
                )}
              </div>
            </div>

            {/* Admin Details */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                First Admin (will receive invitation)
              </h3>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@acme.com"
                    value={adminEmail}
                    onChange={(e) => {
                      setAdminEmail(e.target.value);
                      setError(null);
                    }}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminName">Admin Name (optional)</Label>
                <Input
                  id="adminName"
                  placeholder="John Smith"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Link href="/super-admin" className="flex-1">
                <Button type="button" variant="outline" className="w-full" disabled={isLoading}>
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  isLoading ||
                  organizationName.trim().length < 2 ||
                  subdomain.length < 3 ||
                  checkingSubdomain ||
                  (subdomainStatus !== null && !subdomainStatus.available) ||
                  !adminEmail
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create & Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
