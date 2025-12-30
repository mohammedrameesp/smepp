'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/header';

interface ConditionalHeaderProps {
  enabledModules: string[];
}

export function ConditionalHeader({ enabledModules }: ConditionalHeaderProps) {
  const pathname = usePathname();

  // Routes that have their own header/navigation
  const routesWithOwnHeader = [
    '/admin',        // Admin dashboard has AdminTopNav
    '/employee',     // Employee dashboard has EmployeeTopNav
    '/super-admin',  // Super admin has its own layout
    '/login',
    '/signup',
    '/onboarding',
    '/invite',
    '/platform-login',
    '/forgot-password',
    '/reset-password',
    '/set-password',
  ];

  // Don't render header for routes with their own header
  const shouldHideHeader =
    pathname === '/' ||  // Marketing landing page
    routesWithOwnHeader.some((route) => pathname?.startsWith(route));

  if (shouldHideHeader) {
    return null;
  }

  return <Header enabledModules={enabledModules} />;
}
