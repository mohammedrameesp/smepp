/**
 * Platform Route Layout
 *
 * Layout for platform-level routes like /platform-login.
 * These routes are for super admin access only.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
