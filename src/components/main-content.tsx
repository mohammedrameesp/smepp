/**
 * @file main-content.tsx
 * @description Main content wrapper handling route-specific layouts
 * @module components
 */

'use client';

import { usePathname } from 'next/navigation';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Routes that have their own complete layouts
  const customLayoutRoutes = [
    '/admin',
    '/employee',
    '/verify',
    '/login',
    '/signup',
    '/pricing',
    '/invite',
  ];

  // Check if current route has custom layout (including root marketing page)
  const hasCustomLayout =
    pathname === '/' ||
    customLayoutRoutes.some((route) => pathname?.startsWith(route));

  // Pages with custom layouts render children directly
  if (hasCustomLayout) {
    return <>{children}</>;
  }

  // Default wrapper for other pages
  return (
    <main className="min-h-screen bg-gray-50">
      {children}
    </main>
  );
}
