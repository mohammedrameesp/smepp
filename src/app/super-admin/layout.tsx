'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { icon: LayoutDashboard, href: '/super-admin', title: 'Dashboard' },
  { icon: Building2, href: '/super-admin/organizations', title: 'Organizations' },
  { icon: Users, href: '/super-admin/users', title: 'Users' },
  { icon: BarChart3, href: '/super-admin/analytics', title: 'Analytics' },
  { icon: Settings, href: '/super-admin/settings', title: 'Settings' },
];

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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Minimal Sidebar */}
      <aside className="w-16 bg-slate-900 min-h-screen sticky top-0 flex flex-col items-center py-4">
        {/* Logo */}
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-6">
          <span className="text-slate-900 font-black text-xs">S++</span>
        </div>

        {/* Nav Icons */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/super-admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.title}
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-500 hover:text-white hover:bg-slate-800'
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>

        {/* User Avatar */}
        <button
          onClick={() => signOut({ callbackUrl: '/super-admin/login' })}
          title="Sign Out"
          className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {session.user.name?.charAt(0).toUpperCase() || 'SA'}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-sm text-slate-500 mt-1">Platform overview and metrics</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <button className="p-2 text-slate-400 hover:text-slate-600 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <Link href="/super-admin/organizations/new">
                <Button className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="h-4 w-4 mr-2" />
                  New Org
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
