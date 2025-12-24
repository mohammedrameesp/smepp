'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { TenantBrandedPanel } from '@/components/auth/TenantBrandedPanel';

const DEV_AUTH_ENABLED = process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === 'true';

function PlatformLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in as super admin
    getSession().then((session) => {
      if (session?.user?.isSuperAdmin) {
        router.push('/super-admin');
      } else if (session) {
        // Logged in but not super admin - show error
        setError('Access restricted to platform administrators');
      }
    });
  }, [router]);

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
        // Check if user is super admin
        const session = await getSession();
        if (session?.user?.isSuperAdmin) {
          router.push('/super-admin');
        } else {
          setError('Access restricted to platform administrators');
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Failed to sign in. Please try again.');
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: string) => {
    setOauthLoading(provider);
    try {
      // After OAuth, redirect to this page to validate super admin status
      await signIn(provider, { callbackUrl: '/platform-login' });
    } catch (err) {
      console.error(`${provider} sign in error:`, err);
      setError(`Failed to sign in with ${provider}`);
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Platform Branding */}
      <TenantBrandedPanel branding={null} isLoading={false} variant="super-admin" />

      {/* Right Column - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <ShieldCheck className="h-12 w-12 text-blue-500" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              SME<span className="text-blue-500">++</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Platform Administration</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="hidden lg:flex justify-center mb-4">
                <ShieldCheck className="h-10 w-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Portal Access
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Sign in with your administrator credentials
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <Alert variant="error" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* OAuth Buttons */}
            <div className="space-y-3 mb-6">
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

            {/* Email/Password Form */}
            <form onSubmit={handleCredentialsSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                className="w-full h-12 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-900 hover:to-gray-800 text-white shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Access Admin Portal
                  </>
                )}
              </Button>
            </form>

            {/* Dev Mode Notice */}
            {DEV_AUTH_ENABLED && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-1">
                  Development Mode
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300">
                  Use SUPER_ADMIN_EMAIL env var account
                </p>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground mt-6">
              Not an administrator?{' '}
              <a href="/login" className="text-blue-600 font-medium hover:text-blue-700 hover:underline">
                Go to regular login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlatformLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PlatformLoginForm />
    </Suspense>
  );
}
