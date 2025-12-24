'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Users, CheckCircle, Lock, Shield, Loader2, Check, Mail } from 'lucide-react';

/**
 * MOCKUP PAGE FOR REVIEW
 *
 * This is a static mockup of the super-admin login page.
 * Use the toggle buttons below to switch between states.
 *
 * URL: /super-admin/login-mockup
 *
 * COMMENTS/FEEDBACK:
 * - Add your comments here
 * -
 *
 */

type LoginStep = 'credentials' | '2fa';

export default function SuperAdminLoginMockup() {
  // Toggle states for mockup review
  const [step, setStep] = useState<LoginStep>('credentials');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [showError, setShowError] = useState(false);

  // Static mockup data
  const mockEmail = 'admin@quriosityhub.com';
  const stats = { organizations: 12, users: 156, uptime: '99.9%' };

  return (
    <div className="min-h-screen">
      {/* Mockup Controls - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-100 border-b-2 border-yellow-400 p-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <span className="font-bold text-yellow-800">MOCKUP REVIEW MODE</span>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setStep('credentials')}
              className={`px-3 py-1 rounded text-sm ${step === 'credentials' ? 'bg-yellow-500 text-white' : 'bg-white'}`}
            >
              Step 1: Credentials
            </button>
            <button
              onClick={() => setStep('2fa')}
              className={`px-3 py-1 rounded text-sm ${step === '2fa' ? 'bg-yellow-500 text-white' : 'bg-white'}`}
            >
              Step 2: 2FA
            </button>
            <button
              onClick={() => setShowError(!showError)}
              className={`px-3 py-1 rounded text-sm ${showError ? 'bg-red-500 text-white' : 'bg-white'}`}
            >
              {showError ? 'Hide Error' : 'Show Error'}
            </button>
            {step === '2fa' && (
              <button
                onClick={() => setIsBackupCode(!isBackupCode)}
                className={`px-3 py-1 rounded text-sm ${isBackupCode ? 'bg-blue-500 text-white' : 'bg-white'}`}
              >
                {isBackupCode ? 'Backup Code Mode' : 'OTP Mode'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actual Login Page (with top padding for mockup controls) */}
      <div className="min-h-screen flex bg-slate-900 pt-16">
        {/* Left Panel - Branding & Stats */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 to-slate-900 p-12 flex-col justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-white font-semibold text-xl">SME++ Admin</span>
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
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500 rounded-xl mb-4">
                <Shield className="w-6 h-6 text-white" />
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
                  {showError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      Invalid email or password
                    </div>
                  )}

                  {/* Credentials Form */}
                  <form className="space-y-5">
                    <div>
                      <Label htmlFor="email" className="text-slate-700">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@smeplus.com"
                        defaultValue=""
                        className="mt-1.5 bg-slate-50 border-slate-200 rounded-xl h-12"
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
                        className="mt-1.5 bg-slate-50 border-slate-200 rounded-xl h-12"
                      />
                    </div>

                    <Button
                      type="button"
                      className="w-full h-12 bg-slate-800 hover:bg-slate-700 rounded-xl"
                      onClick={() => setStep('2fa')}
                    >
                      Continue
                    </Button>
                  </form>
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
                      <p className="text-sm text-green-600 truncate">{mockEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep('credentials')}
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
                  {showError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      Invalid verification code
                    </div>
                  )}

                  <form className="space-y-6">
                    {isBackupCode ? (
                      <Input
                        type="text"
                        placeholder="XXXX-XXXX"
                        className="text-center text-lg font-mono tracking-wider bg-slate-50 border-slate-200 rounded-xl h-14"
                      />
                    ) : (
                      <div className="flex justify-center gap-2">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <input
                            key={index}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            defaultValue=""
                            className="w-12 h-14 text-center text-xl font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                          />
                        ))}
                      </div>
                    )}

                    <Button
                      type="button"
                      className="w-full h-12 bg-slate-800 hover:bg-slate-700 rounded-xl"
                    >
                      Verify & Sign In
                    </Button>
                  </form>

                  <p className="text-center text-sm text-slate-500 mt-4">
                    {isBackupCode ? (
                      <>
                        Have your authenticator?{' '}
                        <button
                          type="button"
                          onClick={() => setIsBackupCode(false)}
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
                          onClick={() => setIsBackupCode(true)}
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
    </div>
  );
}
