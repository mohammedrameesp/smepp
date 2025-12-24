'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, Users, Settings, LogOut, Shield } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Skip auth check for login page
  const isLoginPage = pathname === '/super-admin/login';

  useEffect(() => {
    if (isLoginPage) return; // Don't redirect on login page

    if (status === 'unauthenticated') {
      router.push('/super-admin/login');
    } else if (status === 'authenticated' && !session?.user?.isSuperAdmin) {
      router.push('/');
    }
  }, [status, session, router, isLoginPage]);

  // Login page renders without auth check
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session?.user?.isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">SME++ Platform Admin</h1>
                <p className="text-xs text-slate-400">Super Admin Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300">
                {session.user.name || session.user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/super-admin/login' })}
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sub Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 h-12">
            <Link
              href="/super-admin"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-blue-500 transition-colors"
            >
              <Building2 className="h-4 w-4" />
              Organizations
            </Link>
            <Link
              href="/super-admin/users"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-blue-500 transition-colors"
            >
              <Users className="h-4 w-4" />
              Users
            </Link>
            <Link
              href="/super-admin/settings"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-blue-500 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
