'use client';

import { usePathname } from 'next/navigation';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isVerifyPage = pathname?.startsWith('/verify');
  const isAdminPage = pathname?.startsWith('/admin');
  const isEmployeePage = pathname?.startsWith('/employee');

  // Admin and employee pages have their own AppShell layout with sidebar
  // Don't apply wrapper styles to these pages
  if (isAdminPage || isEmployeePage) {
    return <>{children}</>;
  }

  return (
    <main className={isVerifyPage ? '' : 'min-h-screen bg-gray-50'}>
      {children}
    </main>
  );
}
