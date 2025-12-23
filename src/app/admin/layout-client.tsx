'use client';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  badgeCounts: Record<string, number>;
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  return <>{children}</>;
}
