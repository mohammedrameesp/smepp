'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Users, CheckCircle, ArrowLeft, Lock, Shield, Loader2, Check, Mail } from 'lucide-react';

interface PlatformStats {
  organizations: number;
  users: number;
  uptime: string;
}

type LoginStep = 'credentials' | '2fa';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Form state
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  // Tokens
  const [pending2faToken, setPending2faToken] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<PlatformStats>({ organizations: 0, users: 0, uptime: '99.9%' });

  // OTP input refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already authenticated as super admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isSuperAdmin) {
      router.push('/super-admin');
    }
  }, [status, session, router]);

  // Fetch platform stats
  useEffect(() => {
    fetch('/api/super-admin/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otpCode];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtpCode(newOtp);
    if (pastedData.length === 6) {
      otpRefs.current[5]?.focus();
    }
  };

  // Handle credentials submission
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/super-admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      if (data.requires2FA) {
        setPending2faToken(data.pending2faToken);
        setStep('2fa');
      } else {
        // No 2FA, complete login
        setLoginToken(data.loginToken);
        await completeLogin(data.loginToken);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle 2FA verification
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const code = isBackupCode ? backupCode : otpCode.join('');

    try {
      const response = await fetch('/api/super-admin/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pending2faToken,
          code,
          isBackupCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed');
        return;
      }

      // Complete login with the token
      await completeLogin(data.loginToken);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Complete login using NextAuth with the verified login token
  const completeLogin = async (token: string) => {
    // Use the super-admin-credentials provider with the login token
    // This token contains proof of successful credential + 2FA verification
    const result = await signIn('super-admin-credentials', {
      loginToken: token,
      redirect: false,
    });

    if (result?.error) {
      setError('Login failed. Please try again.');
    } else {
      router.push('/super-admin');
    }
  };

  // Handle SSO login
  const handleSSOLogin = (provider: 'google' | 'azure-ad') => {
    signIn(provider, { callbackUrl: '/super-admin' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left Panel - Branding & Stats */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 to-slate-900 p-12 flex-col justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">S+</span>
          </div>
          <span className="text-white font-semibold text-xl">SME++</span>
        </div>

        {/* Center Content */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Platform<br />Administration<br />Console
            </h1>
            <p className="text-slate-400 text-lg max-w-md mt-4">
              Manage organizations, configure platform settings, and monitor system health.
            </p>
          </div>

          {/* Platform Stats */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats.organizations}</div>
                <div className="text-slate-400 text-sm">Organizations</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats.users}</div>
                <div className="text-slate-400 text-sm">Total Users</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats.uptime}</div>
                <div className="text-slate-400 text-sm">Platform Uptime</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} SME++ Platform. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-800 rounded-xl mb-4">
              <span className="text-white font-bold text-lg">S+</span>
            </div>
            <h1 className="text-slate-800 text-xl font-semibold">SME++ Admin Portal</h1>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            {/* Step Progress Indicator */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step === 'credentials'
                    ? 'bg-slate-800 text-white'
                    : 'bg-green-500 text-white'
                }`}>
                  {step === '2fa' ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <span className={`text-sm font-medium ${step === 'credentials' ? 'text-slate-800' : 'text-green-600'}`}>
                  Credentials
                </span>
              </div>
              <div className={`w-12 h-0.5 ${step === '2fa' ? 'bg-green-500' : 'bg-slate-200'}`} />
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step === '2fa'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  2
                </div>
                <span className={`text-sm font-medium ${step === '2fa' ? 'text-slate-800' : 'text-slate-400'}`}>
                  Verify
                </span>
              </div>
            </div>

            {step === 'credentials' ? (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-slate-800 text-xl font-semibold">Welcome back</h2>
                  <p className="text-slate-500 text-sm mt-1">Sign in to access the admin console</p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Credentials Form */}
                <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="email" className="text-slate-700">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@smeplus.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1.5 bg-slate-50 border-slate-200 rounded-xl h-12"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-slate-700">Password</Label>
                      <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
                        Forgot password?
                      </a>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1.5 bg-slate-50 border-slate-200 rounded-xl h-12"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-slate-800 hover:bg-slate-700 rounded-xl"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t border-slate-200" />
                  <span className="px-4 text-xs text-slate-400 uppercase">or continue with</span>
                  <div className="flex-1 border-t border-slate-200" />
                </div>

                {/* SSO Buttons */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50"
                    onClick={() => handleSSOLogin('azure-ad')}
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 21 21">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                    </svg>
                    Sign in with Microsoft
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50"
                    onClick={() => handleSSOLogin('google')}
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign in with Google
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Verified User Info */}
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800">Identity verified</p>
                    <p className="text-sm text-green-600 truncate">{email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('credentials');
                      setError('');
                      setOtpCode(['', '', '', '', '', '']);
                    }}
                    className="text-xs text-green-700 hover:text-green-800 font-medium"
                  >
                    Change
                  </button>
                </div>

                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-slate-800 text-lg font-semibold">Two-Factor Authentication</h3>
                  <p className="text-slate-500 text-sm mt-2">
                    {isBackupCode
                      ? 'Enter one of your backup codes'
                      : 'Enter the 6-digit code from your authenticator app'}
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerify2FA} className="space-y-6">
                  {isBackupCode ? (
                    <Input
                      type="text"
                      placeholder="XXXX-XXXX"
                      value={backupCode}
                      onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                      className="text-center text-lg font-mono tracking-wider bg-slate-50 border-slate-200 rounded-xl h-14"
                      required
                    />
                  ) : (
                    <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                      {otpCode.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { otpRefs.current[index] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-12 h-14 text-center text-xl font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                        />
                      ))}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-slate-800 hover:bg-slate-700 rounded-xl"
                    disabled={isLoading || (!isBackupCode && otpCode.join('').length !== 6)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Verify & Sign In'
                    )}
                  </Button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-4">
                  {isBackupCode ? (
                    <>
                      Have your authenticator?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsBackupCode(false);
                          setError('');
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Use authenticator code
                      </button>
                    </>
                  ) : (
                    <>
                      Lost access?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsBackupCode(true);
                          setError('');
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Use backup code
                      </button>
                    </>
                  )}
                </p>
              </>
            )}
          </div>

          {/* Security Notice */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              Secure Connection
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Access Logged
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            Restricted to authorized super administrators only
          </p>
        </div>
      </div>
    </div>
  );
}
