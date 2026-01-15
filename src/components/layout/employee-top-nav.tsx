/**
 * @file employee-top-nav.tsx
 * @description Employee self-service top navigation bar with user menu
 * @module components/layout
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  User,
  LogOut,
  HelpCircle,
  PalmtreeIcon,
  ShoppingCart,
  Package,
  Shield,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/features/notifications/components';
import { FeedbackTrigger } from '@/components/feedback/feedback-trigger';
import { ClientOnly } from '@/components/ui/client-only';
import { cn } from '@/lib/core/utils';
import { Button } from '@/components/ui/button';

// Fallback avatar button shown during SSR to prevent layout shift
function UserAvatarFallback({ initials }: { initials: string }) {
  return (
    <div
      className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-slate-700"
      aria-label="User menu"
    >
      <span className="text-white text-xs font-medium" aria-hidden="true">
        {initials}
      </span>
    </div>
  );
}

interface EmployeeTopNavProps {
  enabledModules?: string[];
  isAdminInEmployeeView?: boolean;
}

export function EmployeeTopNav({ enabledModules = [], isAdminInEmployeeView = false }: EmployeeTopNavProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isSwitching, setIsSwitching] = React.useState(false);

  const isModuleEnabled = (moduleId: string) => enabledModules.includes(moduleId);

  const handleReturnToAdmin = async () => {
    setIsSwitching(true);
    try {
      await fetch('/api/view-mode', { method: 'DELETE' });
      window.location.href = '/admin';
    } catch (error) {
      console.error('Failed to return to admin view:', error);
      setIsSwitching(false);
    }
  };

  // Navigation items for employees
  const navItems = [
    { label: 'Dashboard', href: '/employee', exact: true },
    { label: 'Leave', href: '/employee/leave', moduleId: 'leave' },
    { label: 'Purchases', href: '/employee/purchase-requests', moduleId: 'purchase-requests' },
    { label: 'My Holdings', href: '/employee/my-assets', moduleId: 'assets' },
  ].filter(item => !item.moduleId || isModuleEnabled(item.moduleId));

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + Org Name */}
          <div className="flex items-center gap-6">
            <Link href="/employee" className="flex items-center gap-3">
              {/* Use inverted logo for dark background, with CSS filter fallback */}
              {session?.user?.organizationLogoUrl ? (
                <img
                  src={session.user.organizationLogoUrlInverse || session.user.organizationLogoUrl}
                  alt={session.user.organizationName || 'Organization'}
                  className="h-7 w-auto max-w-[120px] object-contain"
                  style={!session.user.organizationLogoUrlInverse ? { filter: 'brightness(0) invert(1)' } : undefined}
                />
              ) : (
                <img src="/sme-wordmark-white.png" alt="Durj" className="h-7 w-auto" />
              )}
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-sm font-medium text-slate-200 hidden sm:inline">
                {session?.user?.organizationName || 'Organization'}
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    isActive(item.href, item.exact)
                      ? 'text-white bg-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: Feedback + Notifications + User */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-600">
            {/* Return to Admin (only for admins in employee view) */}
            {isAdminInEmployeeView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReturnToAdmin}
                disabled={isSwitching}
                className="text-amber-400 hover:text-amber-300 hover:bg-slate-700"
              >
                <Shield className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{isSwitching ? 'Switching...' : 'Admin'}</span>
              </Button>
            )}

            {/* Feedback */}
            <FeedbackTrigger />

            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <ClientOnly
              fallback={
                <UserAvatarFallback
                  initials={session?.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                />
              }
            >
              <DropdownMenu>
                <DropdownMenuTrigger className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center cursor-pointer outline-none ring-2 ring-slate-700">
                  <span className="text-white text-xs font-medium">
                    {session?.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2">
                    <p className="font-medium text-slate-900 text-sm">{session?.user?.name || 'User'}</p>
                    <p className="text-xs text-slate-500">{session?.user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4 text-slate-400" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isModuleEnabled('assets') && (
                    <DropdownMenuItem asChild>
                      <Link href="/employee/my-assets" className="flex items-center gap-2 cursor-pointer">
                        <Package className="h-4 w-4 text-slate-400" />
                        My Holdings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isModuleEnabled('leave') && (
                    <DropdownMenuItem asChild>
                      <Link href="/employee/leave" className="flex items-center gap-2 cursor-pointer">
                        <PalmtreeIcon className="h-4 w-4 text-slate-400" />
                        Leave Requests
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isModuleEnabled('purchase-requests') && (
                    <DropdownMenuItem asChild>
                      <Link href="/employee/purchase-requests" className="flex items-center gap-2 cursor-pointer">
                        <ShoppingCart className="h-4 w-4 text-slate-400" />
                        Purchase Requests
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/help" className="flex items-center gap-2 cursor-pointer">
                      <HelpCircle className="h-4 w-4 text-slate-400" />
                      Help & Support
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: '/login?signedOut=true' })}
                    className="flex items-center gap-2 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ClientOnly>
          </div>
        </div>
      </div>
    </header>
  );
}
