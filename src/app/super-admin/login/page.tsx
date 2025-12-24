'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, ShieldCheck, KeyRound, ClipboardList } from 'lucide-react';

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

  // OTP input refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already authenticated as super admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isSuperAdmin) {
      router.push('/super-admin');
    }
  }, [status, session, router]);

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

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-12 flex-col justify-between relative overflow-hidden">
        {/* Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
        />

        {/* Decorative Elements */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full">
          {/* Logo */}
          <div className="flex items-baseline gap-0.5">
            <span className="text-white font-black text-5xl tracking-tighter">SME</span>
            <span className="text-white font-black text-2xl relative -top-4">++</span>
          </div>

          {/* Center Content */}
          <div className="space-y-8">
            <div>
              <p className="text-indigo-400 font-medium text-sm uppercase tracking-widest mb-4">Admin Console</p>
              <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight">
                Platform<br />
                Control Center
              </h1>
              <p className="text-slate-400 text-lg mt-6 max-w-sm leading-relaxed">
                Manage organizations, users, and platform settings from one secure dashboard.
              </p>
            </div>

            {/* Security Features */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-slate-400 text-sm">Two-factor authentication</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-slate-400 text-sm">End-to-end encryption</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-slate-400 text-sm">Complete audit logging</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-slate-600 text-sm">
            &copy; {new Date().getFullYear()} SME<sup className="text-xs">++</sup> Platform
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-slate-900 font-black text-4xl tracking-tighter">SME</span>
              <span className="text-slate-900 font-black text-xl relative -top-3">++</span>
            </div>
            <p className="text-slate-500 text-sm mt-2">Admin Console</p>
          </div>

          {/* Login Form */}
          <div>
            {/* Step Progress Indicator */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step === 'credentials'
                    ? 'bg-slate-900 text-white'
                    : 'bg-indigo-500 text-white'
                }`}>
                  {step === '2fa' ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <span className={`text-sm font-medium ${step === 'credentials' ? 'text-slate-900' : 'text-indigo-600'}`}>
                  Credentials
                </span>
              </div>
              <div className={`w-12 h-0.5 ${step === '2fa' ? 'bg-indigo-500' : 'bg-slate-200'}`} />
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step === '2fa'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  2
                </div>
                <span className={`text-sm font-medium ${step === '2fa' ? 'text-slate-900' : 'text-slate-400'}`}>
                  Verify
                </span>
              </div>
            </div>

            {step === 'credentials' ? (
              <>
                {/* Header */}
                <div className="mb-8">
                  <h2 className="text-slate-900 text-2xl font-bold">Sign in</h2>
                  <p className="text-slate-500 mt-1">Enter your admin credentials</p>
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
                      <a href="#" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                        Forgot?
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
              </>
            ) : (
              <>
                {/* Verified User Info */}
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl mb-6">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-indigo-900 truncate">{email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('credentials');
                      setError('');
                      setOtpCode(['', '', '', '', '', '']);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Change
                  </button>
                </div>

                <div className="mb-8">
                  <h2 className="text-slate-900 text-2xl font-bold">Enter code</h2>
                  <p className="text-slate-500 mt-1">
                    {isBackupCode
                      ? 'Enter one of your backup codes'
                      : 'Check your authenticator app'}
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
                    <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
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
                          className="w-12 h-14 text-center text-xl font-bold bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
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

                <p className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBackupCode(!isBackupCode);
                      setError('');
                    }}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    {isBackupCode ? 'Use authenticator code' : 'Use backup code'}
                  </button>
                </p>
              </>
            )}
          </div>

          {/* Security Notice */}
          <p className="text-center text-slate-400 text-xs mt-8">
            Secured with two-factor authentication
          </p>
        </div>
      </div>
    </div>
  );
}
