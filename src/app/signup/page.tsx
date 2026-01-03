'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { TenantBrandedPanel } from '@/components/auth/TenantBrandedPanel';
import { useTenantBranding } from '@/hooks/use-tenant-branding';

interface InvitationAuthConfig {
  hasCustomGoogleOAuth: boolean;
  hasCustomAzureOAuth: boolean;
}

interface InvitationData {
  organization: {
    slug: string;
    name: string;
  };
  authConfig: InvitationAuthConfig;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  // Get invite token, pre-filled email and name from URL
  const inviteToken = searchParams.get('invite');
  const prefilledEmail = searchParams.get('email');
  const prefilledName = searchParams.get('name');
  const isInviteFlow = !!inviteToken && !!prefilledEmail;

  // Get tenant branding based on invitation org slug
  const orgSlug = invitation?.organization?.slug || null;
  const { branding, isLoading: brandingLoading } = useTenantBranding(orgSlug);

  // Dynamic colors based on branding
  const primaryColor = branding?.primaryColor || '#0f172a';
  const orgName = branding?.organizationName || invitation?.organization?.name || 'Durj';

  // Fetch invitation details to get auth config
  useEffect(() => {
    async function fetchInvitation() {
      if (!inviteToken) return;

      setLoadingInvite(true);
      try {
        const response = await fetch(`/api/invitations/${inviteToken}`);
        if (response.ok) {
          const data = await response.json();
          setInvitation(data.invitation);
        }
      } catch (err) {
        console.error('Failed to fetch invitation:', err);
      } finally {
        setLoadingInvite(false);
      }
    }

    fetchInvitation();
  }, [inviteToken]);

  // If no invite token, show invitation-only message
  if (!inviteToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900 p-8">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <img src="/sme-icon-shield-512.png" alt="Durj" className="h-12 w-12" />
              <span className="text-slate-900 dark:text-white text-2xl font-bold">Durj</span>
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-slate-600 dark:text-slate-300" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Signup by Invitation Only
            </h1>

            <p className="text-slate-600 dark:text-gray-400 mb-6">
              Durj accounts are created by organization administrators.
              If you&apos;ve been invited to join an organization, please check your email for the invitation link.
            </p>

            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
              >
                Go to Login
              </Link>

              <Link
                href="/"
                className="block w-full py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Back to Home
              </Link>
            </div>

            <p className="mt-6 text-sm text-slate-500 dark:text-gray-500">
              Need access? Contact your organization administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState({
    name: prefilledName || '',
    email: prefilledEmail || '',
    password: '',
    confirmPassword: '',
  });

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Update fields if prefilled from URL
  useEffect(() => {
    if (prefilledEmail) {
      setFormData(prev => ({ ...prev, email: prefilledEmail }));
    }
    if (prefilledName) {
      setFormData(prev => ({ ...prev, name: prefilledName }));
    }
  }, [prefilledEmail, prefilledName]);

  // Calculate password strength
  useEffect(() => {
    const password = formData.password;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    setPasswordStrength(strength);
  }, [formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email' && isInviteFlow) return;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          inviteToken: inviteToken || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push('/login?message=Account created. Please sign in.');
      } else if (data.organization?.slug) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
        // Redirect to setup wizard for first-time organization setup
        window.location.href = `${window.location.protocol}//${data.organization.slug}.${appDomain}/setup`;
      } else if (inviteToken) {
        router.push(`/invite/${inviteToken}`);
      } else {
        router.push('/pending');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-slate-200';
    if (passwordStrength === 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-amber-500';
    if (passwordStrength === 3) return 'bg-emerald-500';
    return 'bg-emerald-500';
  };

  const getStrengthText = () => {
    if (formData.password.length === 0) return '';
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  // Handle OAuth signup - redirects to custom OAuth flow
  const handleOAuthSignup = (provider: 'google' | 'azure') => {
    if (!invitation?.organization?.slug) return;

    const oauthUrl = provider === 'google'
      ? `/api/auth/oauth/google?subdomain=${invitation.organization.slug}&invite=${inviteToken}`
      : `/api/auth/oauth/azure?subdomain=${invitation.organization.slug}&invite=${inviteToken}`;

    window.location.href = oauthUrl;
  };

  // Check if OAuth options should be shown
  const showGoogleOAuth = invitation?.authConfig?.hasCustomGoogleOAuth;
  const showAzureOAuth = invitation?.authConfig?.hasCustomAzureOAuth;
  const showOAuthOptions = showGoogleOAuth || showAzureOAuth;

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <TenantBrandedPanel
        branding={branding}
        isLoading={loadingInvite || brandingLoading}
        variant="tenant"
        welcomeTitleOverride="Welcome to Durj"
        welcomeSubtitleOverride="Complete your account setup to join your organization and start collaborating with your team."
      />

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
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
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {orgName}
                </span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Complete your signup
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {showOAuthOptions
                  ? 'Choose how to create your account'
                  : 'Set your password to join the organization'
                }
              </p>
            </div>

            {/* OAuth Buttons - Show if org has SSO configured */}
            {showOAuthOptions && !loadingInvite && (
              <>
                <div className={`grid gap-3 mb-6 ${showGoogleOAuth && showAzureOAuth ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {showGoogleOAuth && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOAuthSignup('google')}
                      disabled={isLoading}
                      className="h-12"
                    >
                      <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Google
                    </Button>
                  )}
                  {showAzureOAuth && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOAuthSignup('azure')}
                      disabled={isLoading}
                      className="h-12"
                    >
                      <svg className="h-5 w-5 mr-2" viewBox="0 0 23 23">
                        <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                        <path fill="#f35325" d="M1 1h10v10H1z" />
                        <path fill="#81bc06" d="M12 1h10v10H12z" />
                        <path fill="#05a6f0" d="M1 12h10v10H1z" />
                        <path fill="#ffba08" d="M12 12h10v10H12z" />
                      </svg>
                      Microsoft
                    </Button>
                  )}
                </div>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={`pl-10 ${isInviteFlow ? 'bg-slate-100 dark:bg-slate-700 cursor-not-allowed' : ''}`}
                    required
                    disabled={isLoading || isInviteFlow}
                    readOnly={isInviteFlow}
                  />
                </div>
                {isInviteFlow && (
                  <p className="text-xs text-muted-foreground">
                    Email is locked to match the invitation
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    minLength={8}
                    disabled={isLoading}
                    autoFocus={isInviteFlow}
                  />
                </div>
                {formData.password && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= passwordStrength ? getStrengthColor() : 'bg-slate-200 dark:bg-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength <= 1 ? 'text-red-500' :
                      passwordStrength === 2 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {getStrengthText()}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-emerald-500" />
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-white shadow-lg"
                style={{
                  background: branding?.secondaryColor
                    ? `linear-gradient(to right, ${primaryColor}, ${branding.secondaryColor})`
                    : primaryColor,
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account & Join
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Login Link */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href={`/login?callbackUrl=/invite/${inviteToken}`}
                className="font-medium hover:underline"
                style={{ color: primaryColor }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
