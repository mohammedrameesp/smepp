'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

// Check if dev auth is enabled (set via environment variable)
const DEV_AUTH_ENABLED = process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === 'true';

// Color scheme for login page
// Modify these values to customize the appearance
const colorScheme = {
  gradient: 'from-slate-900 via-blue-950 to-slate-950',
  textPrimary: 'text-blue-50',
  textSecondary: 'text-blue-200',
  textTertiary: 'text-blue-300',
  button: 'bg-slate-600 hover:bg-slate-700',
  focusRing: 'focus:border-slate-400 focus:ring-slate-400',
};

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [devError, setDevError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    getSession().then((session) => {
      if (session) {
        router.push('/');
      }
    });
  }, [router]);

  const handleAzureSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('azure-ad', { callbackUrl: '/' });
    } catch (error) {
      console.error('Azure sign in error:', error);
      toast.error('Failed to sign in. Please try again.', { duration: 10000 });
    }
    setIsLoading(false);
  };

  const handleDevSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevError('');
    setIsLoading(true);

    try {
      const result = await signIn('dev-credentials', {
        email: devEmail,
        password: devPassword,
        redirect: false,
      });

      if (result?.error) {
        setDevError('Invalid email or password');
      } else if (result?.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Dev sign in error:', error);
      setDevError('Failed to sign in');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br ${colorScheme.gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/5" />
        <div className="relative z-10 flex flex-col justify-center px-16 py-24">
          <div className="max-w-md">
            {/* Logo */}
            <div className="mb-8">
              <Image
                src="/logo.png"
                alt="SME++ Logo"
                width={180}
                height={60}
                className="h-16 w-auto"
                priority
              />
            </div>

            <h1 className={`text-4xl font-bold ${colorScheme.textPrimary} mb-4`}>
              SME++
            </h1>
            <p className={`text-lg ${colorScheme.textSecondary} mb-6`}>
              All-in-one Business Management
            </p>
            <p className={`${colorScheme.textTertiary} text-base leading-relaxed`}>
              Manage assets, HR, suppliers, subscriptions, and operations—all in one unified platform built for SMBs.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          {/* Welcome Section */}
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome Back
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Sign in to access your workspace and manage your digital resources seamlessly.
            </p>
          </div>

          {/* Login Options */}
          <div className="space-y-6">
            {/* Development Login Form - Only shown when DEV_AUTH_ENABLED */}
            {DEV_AUTH_ENABLED && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-amber-600 font-semibold text-sm">🛠️ Development Mode</span>
                </div>
                <form onSubmit={handleDevSignIn} className="space-y-3">
                  <div>
                    <Label htmlFor="dev-email" className="text-sm text-gray-700">Email</Label>
                    <Input
                      id="dev-email"
                      type="email"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      placeholder="admin@test.local"
                      className="mt-1"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dev-password" className="text-sm text-gray-700">Password</Label>
                    <Input
                      id="dev-password"
                      type="password"
                      value={devPassword}
                      onChange={(e) => setDevPassword(e.target.value)}
                      placeholder="admin123"
                      className="mt-1"
                      disabled={isLoading}
                    />
                  </div>
                  {devError && (
                    <p className="text-sm text-red-600">{devError}</p>
                  )}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {isLoading ? 'Signing in...' : 'Dev Login'}
                  </Button>
                </form>
                <div className="mt-3 text-xs text-gray-500">
                  <p className="font-medium mb-1">Test accounts:</p>
                  <ul className="space-y-0.5">
                    <li>admin@test.local / admin123</li>
                    <li>employee@test.local / employee123</li>
                    <li>validator@test.local / validator123</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Azure AD Login Button */}
            <Button
              onClick={handleAzureSignIn}
              disabled={isLoading}
              className="w-full h-14 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white font-semibold text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  {/* Microsoft Logo - Colorful 4 squares */}
                  <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="10" height="10" fill="#F25022"/>
                    <rect x="11" width="10" height="10" fill="#7FBA00"/>
                    <rect y="11" width="10" height="10" fill="#00A4EF"/>
                    <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
                  </svg>
                  Sign in with Microsoft
                </span>
              )}
            </Button>

            {/* Access Notice - Below button */}
            {!DEV_AUTH_ENABLED && (
              <p className="text-center text-sm text-gray-500">
                Don&apos;t have an account? <a href="/signup" className="text-blue-600 hover:underline font-medium">Sign up free</a>
              </p>
            )}

            {/* Supplier Registration Link */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600 mb-3">
                Are you a supplier?
              </p>
              <a
                href="/suppliers/register"
                className="block w-full text-center py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                Register as a Supplier
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}