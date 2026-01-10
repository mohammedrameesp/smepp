'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
  Search,
  Plus,
  Loader2,
  Check,
  KeyRound,
  ClipboardList,
  HardDrive,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/core/utils';

const mainNavItems = [
  { icon: LayoutDashboard, href: '/super-admin', title: 'Dashboard' },
  { icon: Building2, href: '/super-admin/organizations', title: 'Organizations' },
  { icon: Users, href: '/super-admin/users', title: 'Users' },
];

const systemNavItems = [
  { icon: ShieldCheck, href: '/super-admin/admins', title: 'Super Admins' },
  { icon: HardDrive, href: '/super-admin/backups', title: 'Backups' },
  { icon: Settings, href: '/super-admin/settings', title: 'Settings' },
];

// Login Form Component
function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [pending2faToken, setPending2faToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
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
    for (let i = 0; i < pastedData.length; i++) newOtp[i] = pastedData[i];
    setOtpCode(newOtp);
    if (pastedData.length === 6) otpRefs.current[5]?.focus();
  };

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
      if (!response.ok) { setError(data.error || 'Login failed'); return; }
      if (data.requires2FA) {
        setPending2faToken(data.pending2faToken);
        setStep('2fa');
      } else {
        await completeLogin(data.loginToken);
      }
    } catch { setError('An error occurred. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const code = isBackupCode ? backupCode : otpCode.join('');
    try {
      const response = await fetch('/api/super-admin/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending2faToken, code, isBackupCode }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Verification failed'); return; }
      await completeLogin(data.loginToken);
    } catch { setError('Verification failed. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const completeLogin = async (token: string) => {
    const result = await signIn('super-admin-credentials', { loginToken: token, redirect: false });
    if (result?.error) setError('Login failed. Please try again.');
    else router.refresh();
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-center gap-3">
            <img src="/sme-wordmark-white.png" alt="Durj" className="h-10 w-auto" />
          </div>
          <div className="space-y-8">
            <div>
              <p className="text-indigo-400 font-medium text-sm uppercase tracking-widest mb-4">Admin Console</p>
              <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight">Platform<br />Control Center</h1>
              <p className="text-slate-400 text-lg mt-6 max-w-sm leading-relaxed">Manage organizations, users, and platform settings from one secure dashboard.</p>
            </div>
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-indigo-400" /></div>
                <span className="text-slate-400 text-sm">Two-factor authentication</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center"><KeyRound className="w-4 h-4 text-indigo-400" /></div>
                <span className="text-slate-400 text-sm">End-to-end encryption</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center"><ClipboardList className="w-4 h-4 text-indigo-400" /></div>
                <span className="text-slate-400 text-sm">Complete audit logging</span>
              </div>
            </div>
          </div>
          <p className="text-slate-600 text-sm">&copy; {new Date().getFullYear()} Durj Platform</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-10">
            <div className="flex items-center justify-center gap-2">
              <img src="/sme-icon-shield-512.png" alt="Durj" className="h-10 w-10" />
              <span className="text-slate-900 font-bold text-2xl">Durj</span>
            </div>
            <p className="text-slate-500 text-sm mt-2">Admin Console</p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${step === 'credentials' ? 'bg-slate-900 text-white' : 'bg-indigo-500 text-white'}`}>
                {step === '2fa' ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className={`text-sm font-medium ${step === 'credentials' ? 'text-slate-900' : 'text-indigo-600'}`}>Credentials</span>
            </div>
            <div className={`w-12 h-0.5 ${step === '2fa' ? 'bg-indigo-500' : 'bg-slate-200'}`} />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${step === '2fa' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>2</div>
              <span className={`text-sm font-medium ${step === '2fa' ? 'text-slate-900' : 'text-slate-400'}`}>Verify</span>
            </div>
          </div>

          {step === 'credentials' ? (
            <>
              <div className="mb-8">
                <h2 className="text-slate-900 text-2xl font-bold">Sign in</h2>
                <p className="text-slate-500 mt-1">Enter your admin credentials</p>
              </div>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="email" className="text-slate-700">Email address</Label>
                  <Input id="email" type="email" placeholder="admin@smeplus.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 bg-slate-50 border-slate-200 rounded-xl h-12" required />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700">Password</Label>
                  </div>
                  <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 bg-slate-50 border-slate-200 rounded-xl h-12" required />
                </div>
                <Button type="submit" className="w-full h-12 bg-slate-800 hover:bg-slate-700 rounded-xl" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl mb-6">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-white" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-indigo-900 truncate">{email}</p></div>
                <button type="button" onClick={() => { setStep('credentials'); setError(''); setOtpCode(['', '', '', '', '', '']); }} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Change</button>
              </div>
              <div className="mb-8">
                <h2 className="text-slate-900 text-2xl font-bold">Enter code</h2>
                <p className="text-slate-500 mt-1">{isBackupCode ? 'Enter one of your backup codes' : 'Check your authenticator app'}</p>
              </div>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
              <form onSubmit={handleVerify2FA} className="space-y-6">
                {isBackupCode ? (
                  <Input type="text" placeholder="XXXX-XXXX" value={backupCode} onChange={(e) => setBackupCode(e.target.value.toUpperCase())} className="text-center text-lg font-mono tracking-wider bg-slate-50 border-slate-200 rounded-xl h-14" required />
                ) : (
                  <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                    {otpCode.map((digit, index) => (
                      <input key={index} ref={(el) => { otpRefs.current[index] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(index, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(index, e)} className="w-12 h-14 text-center text-xl font-bold bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all" />
                    ))}
                  </div>
                )}
                <Button type="submit" className="w-full h-12 bg-slate-800 hover:bg-slate-700 rounded-xl" disabled={isLoading || (!isBackupCode && otpCode.join('').length !== 6)}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Sign In'}
                </Button>
              </form>
              <p className="text-center mt-6">
                <button type="button" onClick={() => { setIsBackupCode(!isBackupCode); setError(''); }} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  {isBackupCode ? 'Use authenticator code' : 'Use backup code'}
                </button>
              </p>
            </>
          )}
          <p className="text-center text-slate-400 text-xs mt-8">Secured with two-factor authentication</p>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && !session?.user?.isSuperAdmin) {
      router.push('/');
    }
  }, [status, session, router]);

  // Close mobile menu when route changes - MUST be before early returns to maintain consistent hook order
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user?.isSuperAdmin) {
    return <LoginForm />;
  }

  const isActive = (href: string) => {
    if (href === '/super-admin') return pathname === href;
    return pathname.startsWith(href);
  };

  const getPageInfo = () => {
    if (pathname === '/super-admin') return { title: 'Dashboard', description: 'Platform overview and organization management' };
    if (pathname.startsWith('/super-admin/organizations')) return { title: 'Organizations', description: 'Manage all registered organizations' };
    if (pathname.startsWith('/super-admin/users')) return { title: 'Users', description: 'View all platform users' };
    if (pathname.startsWith('/super-admin/admins')) return { title: 'Super Admins', description: 'Manage super admin accounts' };
    if (pathname.startsWith('/super-admin/settings')) return { title: 'Settings', description: 'Platform configuration' };
    return { title: 'Super Admin', description: 'Platform management' };
  };

  const pageInfo = getPageInfo();

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <img src="/sme-icon-shield-512.png" alt="Durj" className="h-8 w-8" />
          <span className="font-semibold">Durj Admin</span>
        </div>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 mb-2"><span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Main</span></div>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 px-4 py-2.5 text-sm transition-colors', active ? 'bg-white/10 text-white border-l-2 border-white' : 'text-slate-300 hover:text-white hover:bg-white/5')}>
              <Icon className="h-4 w-4 opacity-70" />{item.title}
            </Link>
          );
        })}
        <div className="px-3 mb-2 mt-6"><span className="text-xs font-medium text-slate-400 uppercase tracking-wider">System</span></div>
        {systemNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 px-4 py-2.5 text-sm transition-colors', active ? 'bg-white/10 text-white border-l-2 border-white' : 'text-slate-300 hover:text-white hover:bg-white/5')}>
              <Icon className="h-4 w-4 opacity-70" />{item.title}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-sm font-medium">{session.user.name?.charAt(0).toUpperCase() || 'SA'}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{session.user.name || 'Super Admin'}</div>
            <div className="text-xs text-slate-400 truncate">{session.user.email}</div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/super-admin' })} className="text-slate-400 hover:text-white transition-colors" title="Sign Out"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex flex-col z-50">
            <div className="absolute right-2 top-2">
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 bg-slate-900 text-white flex-col fixed h-full">
        <SidebarContent />
      </aside>

      <main className="flex-1 lg:ml-56">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 lg:px-8 py-4 flex items-center justify-between gap-4">
            {/* Mobile menu button */}
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg lg:text-xl font-semibold text-gray-900 truncate">{pageInfo.title}</h1>
              <p className="text-sm text-gray-500 hidden sm:block">{pageInfo.description}</p>
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input type="text" placeholder="Search organizations..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <Link href="/super-admin/organizations/new">
                <Button className="bg-indigo-600 hover:bg-indigo-700" size="sm">
                  <Plus className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">New Organization</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
