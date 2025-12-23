import { ReactNode } from 'react';
import { theme } from '@/lib/theme';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageWrapper provides consistent gradient background and styling
 * matching the professional login page design
 */
export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.loginGradient} ${className}`}>
      <div className="absolute inset-0 bg-black/5" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

/**
 * ContentContainer provides max-width and padding for page content
 */
export function ContentContainer({ children, className = '' }: PageWrapperProps) {
  return (
    <div className={`container mx-auto py-8 px-4 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}
