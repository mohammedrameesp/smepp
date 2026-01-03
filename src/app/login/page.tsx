'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle, Building2, Home } from 'lucide-react';
import { useSubdomain } from '@/hooks/use-subdomain';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import { TenantBrandedPanel } from '@/components/auth/TenantBrandedPanel';

const DEV_AUTH_ENABLED = process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === 'true';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [notFoundCountdown, setNotFoundCountdown] = useState(10);

  // Get subdomain and tenant branding
  const { subdomain, isLoading: subdomainLoading } = useSubdomain();
  const { branding, isLoading: brandingLoading, error: brandingError } = useTenantBranding(subdomain);

  // Dynamic colors based on branding
  const primaryColor = branding?.primaryColor || '#0f172a';
  const orgName = branding?.organizationName || 'Durj';
  const welcomeTitle = branding?.welcomeTitle || 'Welcome back';
  const welcomeSubtitle = branding?.welcomeSubtitle || 'Sign in to your account';

  // Auth method restrictions - empty array means all methods allowed
  const allowedMethods = branding?.allowedAuthMethods || [];
  const showAllMethods = allowedMethods.length === 0;

  // For subdomain tenants: OAuth buttons only show if method is allowed AND OAuth is configured
  // Main domain: OAuth is hidden (no platform credentials configured)
  const isGoogleAllowed = showAllMethods || allowedMethods.includes('google');
  const isMicrosoftAllowed = showAllMethods || allowedMethods.includes('azure-ad');

  // Only show OAuth on subdomains with custom OAuth configured
  // Main domain only supports email/password login
  const showGoogle = subdomain && isGoogleAllowed && branding?.hasCustomGoogleOAuth;
  const showMicrosoft = subdomain && isMicrosoftAllowed && branding?.hasCustomAzureOAuth;
  const showCredentials = showAllMethods || allowedMethods.includes('credentials');
  const showAnyOAuth = showGoogle || showMicrosoft;

  // Domain restriction hint
  const domainRestrictionHint = branding?.enforceDomainRestriction &&
    branding?.allowedEmailDomains &&
    branding.allowedEmailDomains.length > 0
    ? `Only @${branding.allowedEmailDomains.join(', @')} emails allowed`
    : null;

  useEffect(() => {
    // Check for message in URL (e.g., after signup)
    const msg = searchParams.get('message');
    if (msg) {
      setMessage(msg);
    }

    // Check for auth errors from NextAuth callback or custom OAuth
    const errorParam = searchParams.get('error');
    const errorMessage = searchParams.get('message');
    if (errorParam === 'AuthMethodNotAllowed') {
      setError('This login method is not allowed for your organization. Please use a different method.');
    } else if (errorParam === 'DomainNotAllowed') {
      setError('Your email domain is not allowed for this organization.');
    } else if (errorParam === 'AccessDenied') {
      setError('Access denied. Please contact your administrator.');
    } else if (errorParam === 'OAuthError') {
      setError(errorMessage ? decodeURIComponent(errorMessage) : 'OAuth authentication failed. Please try again.');
    } else if (errorParam === 'OAuthFailed') {
      setError('Authentication failed. Please try again.');
    } else if (errorParam === 'InvalidState') {
      setError('Invalid authentication state. Please try again.');
    } else if (errorParam === 'OrganizationNotFound') {
      setError('Organization not found. Please check the URL.');
    } else if (errorParam === 'OAuthNotConfigured') {
      setError('OAuth is not configured for this organization.');
    } else if (errorParam === 'MissingParams') {
      setError('Missing authentication parameters. Please try again.');
    } else if (errorParam === 'OrgDeleted') {
      setError('Your organization has been deleted. Please contact support if you believe this is an error.');
    }

    // Check if user is already logged in
    getSession().then((session) => {
      if (session) {
        const userOrgSlug = session.user.organizationSlug;

        // If on a subdomain, check if user belongs to this organization
        if (subdomain && userOrgSlug && userOrgSlug.toLowerCase() !== subdomain.toLowerCase()) {
          // User belongs to a different organization - show message and redirect
          setMessage(`You belong to "${userOrgSlug}". Redirecting to your organization...`);
          const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
          const protocol = window.location.protocol;
          setTimeout(() => {
            window.location.href = `${protocol}//${userOrgSlug}.${appDomain}/admin`;
          }, 2000);
          return;
        }

        // If on subdomain but user has no org (e.g., super admin)
        if (subdomain && !userOrgSlug) {
          setError('You do not belong to this organization. Please use the main login page or super admin portal.');
          return;
        }

        if (session.user.organizationId) {
          router.push('/admin');
        } else {
          router.push('/pending');
        }
      }
    });
  }, [router, searchParams, subdomain]);

  // Countdown timer for organization not found - redirect to home
  useEffect(() => {
    if (subdomain && brandingError && !brandingLoading) {
      const timer = setInterval(() => {
        setNotFoundCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
            window.location.href = `${window.location.protocol}//${appDomain}`;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [subdomain, brandingError, brandingLoading]);

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        // Get fresh session to check organization membership
        const session = await getSession();

        if (session) {
          const userOrgSlug = session.user.organizationSlug;

          // If on a subdomain, check if user belongs to this organization
          if (subdomain && userOrgSlug && userOrgSlug.toLowerCase() !== subdomain.toLowerCase()) {
            // User belongs to a different organization - show message and redirect
            setMessage(`You belong to "${userOrgSlug}". Redirecting to your organization...`);
            setIsLoading(false);
            const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
            const protocol = window.location.protocol;
            setTimeout(() => {
              window.location.href = `${protocol}//${userOrgSlug}.${appDomain}/admin`;
            }, 2000);
            return;
          }

          // If on subdomain but user has no org (e.g., super admin)
          if (subdomain && !userOrgSlug) {
            setError('You do not belong to this organization. Please use the main login page or super admin portal.');
            setIsLoading(false);
            return;
          }
        }

        // Force full page reload to get fresh session data
        // This ensures the JWT token is fully propagated
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Failed to sign in. Please try again.');
    }

    setIsLoading(false);
  };

  const handleOAuthSignIn = async (provider: string) => {
    setOauthLoading(provider);
    try {
      // If we have a subdomain, use custom OAuth routes that support org-specific credentials
      if (subdomain) {
        const oauthProvider = provider === 'azure-ad' ? 'azure' : provider;
        window.location.href = `/api/auth/oauth/${oauthProvider}?subdomain=${encodeURIComponent(subdomain)}`;
        return;
      }

      // For main domain, use NextAuth's standard OAuth
      await signIn(provider, { callbackUrl: '/' });
    } catch (err) {
      console.error(`${provider} sign in error:`, err);
      setError(`Failed to sign in with ${provider}`);
      setOauthLoading(null);
    }
  };

  // Show branding error for invalid subdomain
  if (subdomain && brandingError && !brandingLoading) {
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
    const homeUrl = `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//${appDomain}`;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <Building2 className="w-10 h-10 text-red-500 dark:text-red-400" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Organization Not Found
            </h1>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              The organization
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg inline-block">
              {subdomain}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              does not exist or may have been removed.
            </p>

            {/* Countdown Timer */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <div className="w-8 h-8 bg-slate-900 dark:bg-slate-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {notFoundCountdown}
                </div>
                <span className="text-slate-700 dark:text-slate-300 text-sm">
                  Redirecting to home page...
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-slate-900 dark:bg-slate-500 transition-all duration-1000 ease-linear"
                style={{ width: `${((10 - notFoundCountdown) / 10) * 100}%` }}
              />
            </div>

            {/* Action Button */}
            <Button
              onClick={() => { window.location.href = homeUrl; }}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home Now
            </Button>

            {/* Help Text */}
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              If you believe this is an error, please contact support.
            </p>
          </div>
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
        variant="tenant"
      />

      {/* Right Column - Login Form */}
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
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  {subdomain ? orgName : 'Durj'}
                </h1>
              </div>
            )}
            <p className="text-gray-600 dark:text-gray-400">
              {subdomain ? welcomeTitle : 'Operations, Upgraded'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {welcomeTitle}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {welcomeSubtitle}
              </p>
            </div>

            {/* Success/Info Message */}
            {message && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">{message}</AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="error" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Domain Restriction Hint */}
            {domainRestrictionHint && (
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800 text-sm">
                  {domainRestrictionHint}
                </AlertDescription>
              </Alert>
            )}

            {/* OAuth Buttons - Only show if allowed */}
            {showAnyOAuth && (
              <div className="space-y-3 mb-6">
                {showGoogle && (
                  <Button
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={!!oauthLoading}
                  >
                    {oauthLoading === 'google' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
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
                    )}
                    Continue with Google
                  </Button>
                )}

                {showMicrosoft && (
                  <Button
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => handleOAuthSignIn('azure-ad')}
                    disabled={!!oauthLoading}
                  >
                    {oauthLoading === 'azure-ad' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-5 w-5" viewBox="0 0 23 23">
                        <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                        <path fill="#f35325" d="M1 1h10v10H1z" />
                        <path fill="#81bc06" d="M12 1h10v10H12z" />
                        <path fill="#05a6f0" d="M1 12h10v10H1z" />
                        <path fill="#ffba08" d="M12 12h10v10H12z" />
                      </svg>
                    )}
                    Continue with Microsoft
                  </Button>
                )}
              </div>
            )}

            {/* Divider - only if both OAuth and credentials are shown */}
            {showAnyOAuth && showCredentials && (
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
            )}

            {/* Email/Password Form - Only show if credentials allowed */}
            {showCredentials && (
              <form onSubmit={handleCredentialsSignIn} className="space-y-4">
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm hover:underline"
                      style={{ color: primaryColor }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
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
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
            )}

            {/* Dev Mode Notice */}
            {DEV_AUTH_ENABLED && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-1">
                  Development Mode
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300">
                  admin@test.local / admin123
                </p>
              </div>
            )}

            {/* Only show on main domain */}
            {!subdomain && (
              <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                <p className="text-xs text-slate-700 dark:text-slate-300 text-center">
                  Using your organization email?{' '}
                  <span className="font-medium">Login from your organization&apos;s subdomain</span>{' '}
                  (e.g., yourcompany.quriosityhub.com) for SSO options.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
