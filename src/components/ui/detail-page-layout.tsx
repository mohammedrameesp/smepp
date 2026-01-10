/**
 * @file detail-page-layout.tsx
 * @description Two-column layout for detail pages (main + sidebar)
 * @module components/ui
 */

import * as React from 'react';
import { cn } from '@/lib/core/utils';

export interface DetailPageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function DetailPageLayout({ children, className }: DetailPageLayoutProps) {
  return (
    <div className={cn('grid lg:grid-cols-3 gap-6', className)}>
      {children}
    </div>
  );
}

export interface DetailPageMainProps {
  children: React.ReactNode;
  className?: string;
}

export function DetailPageMain({ children, className }: DetailPageMainProps) {
  return (
    <div className={cn('lg:col-span-2 space-y-6', className)}>
      {children}
    </div>
  );
}

export interface DetailPageSidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function DetailPageSidebar({ children, className }: DetailPageSidebarProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {children}
    </div>
  );
}
