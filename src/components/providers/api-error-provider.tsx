'use client';

/**
 * @file api-error-provider.tsx
 * @description Provider that initializes the global API error interceptor.
 *              Automatically reports confusing API errors to the super admin dashboard.
 * @module components/providers
 */

import { useEffect } from 'react';
import { initApiErrorInterceptor } from '@/lib/core/api-error-interceptor';

/**
 * Provider that initializes global API error interception.
 *
 * Add this to your app's provider hierarchy to automatically catch and report
 * confusing API errors (like "Bad Request" without context) to the super admin
 * error dashboard.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { ApiErrorProvider } from '@/components/providers/api-error-provider';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ApiErrorProvider />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function ApiErrorProvider(): null {
  useEffect(() => {
    initApiErrorInterceptor();
  }, []);

  // This provider doesn't render anything
  return null;
}
