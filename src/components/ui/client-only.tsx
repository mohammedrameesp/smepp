'use client';

import * as React from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  /**
   * Fallback to render during SSR. Should match the dimensions of children
   * to prevent layout shift. If not provided, nothing is rendered during SSR.
   */
  fallback?: React.ReactNode;
}

/**
 * ClientOnly wrapper component that prevents hydration mismatches.
 *
 * Use this to wrap components that use Radix UI primitives (Popover, DropdownMenu,
 * Tooltip, etc.) which generate unique IDs that can differ between server and client.
 *
 * @example
 * ```tsx
 * <ClientOnly fallback={<div className="w-9 h-9" />}>
 *   <DropdownMenu>...</DropdownMenu>
 * </ClientOnly>
 * ```
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
