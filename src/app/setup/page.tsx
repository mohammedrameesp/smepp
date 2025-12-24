'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Building2,
  Upload,
  X,
  Check,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

export default function SetupPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated or no org
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // If user already has org and it's configured, redirect
  useEffect(() => {
    if (session?.user?.organizationId && session?.user?.organizationLogoUrl) {
      // Org is already configured, redirect to admin
      const orgSlug = session.user.organizationSlug;
      if (orgSlug) {
        window.location.href = `${window.location.protocol}//${orgSlug}.${APP_DOMAIN}/admin`;
      }
    }
  }, [session]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: PNG, JPEG, WebP, SVG');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('File too large. Maximum size is 2MB');
      return;
    }

    setLogoFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Upload logo if provided
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);

        const logoResponse = await fetch('/api/organizations/logo', {
          method: 'POST',
          body: formData,
        });

        if (!logoResponse.ok) {
          const data = await logoResponse.json();
          throw new Error(data.error || 'Failed to upload logo');
        }
      }

      // Refresh session to get updated org info
      const updatedSession = await update();

      setSuccess(true);

      // Wait for session to confirm update, then redirect
      // Poll session to ensure logo URL is set before redirecting
      const maxAttempts = 10;
      let attempts = 0;

      const checkAndRedirect = async () => {
        attempts++;
        const currentSession = await update();

        // If session has logo URL or we've tried enough times, redirect
        if (currentSession?.user?.organizationLogoUrl || attempts >= maxAttempts || !logoFile) {
          window.location.href = '/';
        } else {
          // Wait 300ms and try again
          setTimeout(checkAndRedirect, 300);
        }
      };

      // Start checking after a brief delay for UX
      setTimeout(checkAndRedirect, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    const orgSlug = session?.user?.organizationSlug;
    if (orgSlug) {
      window.location.href = `${window.location.protocol}//${orgSlug}.${APP_DOMAIN}/admin`;
    } else {
      router.push('/admin');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session?.user?.organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Organization Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Please accept an invitation first to join an organization.
            </p>
            <Button onClick={() => router.push('/pending')}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Setup Complete!</h3>
            <p className="text-muted-foreground text-center mb-4">
              Your organization is ready. Redirecting to your dashboard...
            </p>
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Set Up Your Organization</CardTitle>
          <CardDescription>
            Welcome to <strong>{session.user.organizationName}</strong>!
            Let&apos;s configure your workspace.
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

            {/* Org Info (readonly) */}
            <div className="bg-slate-50 border rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Organization</p>
              <p className="font-medium">{session.user.organizationName}</p>
              <p className="text-sm font-mono text-muted-foreground">
                {session.user.organizationSlug}.{APP_DOMAIN.split(':')[0]}
              </p>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Organization Logo <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-20 w-20 object-contain rounded-lg border bg-white"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    disabled={isLoading}
                  >
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">Upload</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoSelect}
                  className="hidden"
                  disabled={isLoading}
                />
                <div className="text-xs text-muted-foreground">
                  <p>PNG, JPEG, WebP, or SVG</p>
                  <p>Max 2MB</p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                disabled={isLoading}
                className="flex-1"
              >
                Skip for now
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
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
