'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, AlertCircle, Check, XCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { getPasswordStrength } from '@/lib/security/password-validation';
import { ICON_SIZES } from '@/lib/constants';
import { useSubdomain } from '@/hooks/use-subdomain';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import { TenantBrandedPanel } from '@/components/auth/TenantBrandedPanel';

export default function SetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ email?: string; name?: string } | null>(null);
  const [success, setSuccess] = useState(false);

  // Get subdomain and tenant branding
  const { subdomain, isLoading: subdomainLoading } = useSubdomain();
  const { branding, isLoading: brandingLoading } = useTenantBranding(subdomain);

  // Dynamic colors based on branding
  const primaryColor = branding?.primaryColor || '#0f172a';
  const orgName = branding?.organizationName || 'Durj';

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const response = await fetch(`/api/auth/set-password?token=${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenValid(true);
          setUserInfo(data.user);
        } else {
          setTokenValid(false);
          setTokenError(data.reason || 'invalid');
        }
      } catch {
        setTokenValid(false);
        setTokenError('error');
      } finally {
        setIsValidating(false);
      }
    }

    if (token) {
      validateToken();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set password');
      }

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?message=Password created! Please sign in to continue.');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Render error content based on reason
  const renderErrorContent = () => {
    if (tokenError === 'already_set') {
      return (
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Check className={`${ICON_SIZES.lg} text-blue-600`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Password already set
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your password has already been created. Please use the login page to sign in.
          </p>
          <Link href="/login">
            <Button
              className="w-full text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Go to sign in
            </Button>
          </Link>
        </div>
      );
    }

    if (tokenError === 'expired') {
      return (
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Clock className={`${ICON_SIZES.lg} text-amber-600`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Link expired
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This password setup link has expired. Please contact your administrator to resend the invitation.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      );
    }

    // Default: invalid token
    return (
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <XCircle className={`${ICON_SIZES.lg} text-red-600`} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Invalid link
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This password setup link is invalid. Please contact your administrator for assistance.
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  };

  // Loading state - wait for both token validation and branding
  if (isValidating || subdomainLoading || brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className={`${ICON_SIZES.xl} animate-spin mx-auto mb-4 text-primary`} />
          <p className="text-muted-foreground">{isValidating ? 'Validating your link...' : 'Loading...'}</p>
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
        welcomeTitleOverride="Welcome"
        welcomeSubtitleOverride="Create your password to get started"
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
              Welcome! Set up your password
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {tokenValid === false ? (
              renderErrorContent()
            ) : success ? (
              // Success State
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Check className={`${ICON_SIZES.lg} text-green-600`} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Password created!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your account is ready. Redirecting you to sign in...
                </p>
                <Link href="/login">
                  <Button
                    className="w-full text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Sign in now
                  </Button>
                </Link>
              </div>
            ) : (
              // Set Password Form
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Welcome! Set your password
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {userInfo?.name ? (
                      <>Hi {userInfo.name}! Create a password to access your account.</>
                    ) : (
                      <>Create a password to access your account.</>
                    )}
                  </p>
                  {userInfo?.email && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {userInfo.email}
                    </p>
                  )}
                </div>

                {error && (
                  <Alert variant="error" className="mb-4">
                    <AlertCircle className={ICON_SIZES.sm} />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-3 ${ICON_SIZES.sm} text-muted-foreground`} />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                        minLength={8}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className={ICON_SIZES.sm} /> : <Eye className={ICON_SIZES.sm} />}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {password.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1 flex-1">
                          {[0, 1, 2, 3].map((i) => {
                            const strength = getPasswordStrength(password);
                            return (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                  i < strength.score
                                    ? strength.strength === 'weak' ? 'bg-red-500' :
                                      strength.strength === 'fair' ? 'bg-amber-500' :
                                      strength.strength === 'good' ? 'bg-yellow-500' : 'bg-green-500'
                                    : 'bg-slate-200 dark:bg-slate-600'
                                }`}
                              />
                            );
                          })}
                        </div>
                        <span className={`text-xs font-medium capitalize ${
                          getPasswordStrength(password).strength === 'weak' ? 'text-red-500' :
                          getPasswordStrength(password).strength === 'fair' ? 'text-amber-500' :
                          getPasswordStrength(password).strength === 'good' ? 'text-yellow-600' : 'text-green-500'
                        }`}>
                          {getPasswordStrength(password).strength}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-3 ${ICON_SIZES.sm} text-muted-foreground`} />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                        minLength={8}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className={ICON_SIZES.sm} /> : <Eye className={ICON_SIZES.sm} />}
                      </button>
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
                        Creating password...
                      </>
                    ) : (
                      'Create password'
                    )}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Already have a password?{' '}
                  <Link href="/login" className="font-medium hover:underline" style={{ color: primaryColor }}>
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
