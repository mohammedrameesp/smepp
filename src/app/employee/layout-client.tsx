'use client';

import Link from 'next/link';
import { EmployeeTopNav } from '@/components/layout/employee-top-nav';
import { EmployeeViewBanner } from '@/components/layout/employee-view-banner';
import { ChatWidget } from '@/components/chat/chat-widget';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface EmployeeLayoutClientProps {
  children: React.ReactNode;
  enabledModules: string[];
  aiChatEnabled: boolean;
  onboardingComplete?: boolean;
  isAdminInEmployeeView?: boolean;
  hasPartialAdminAccess?: boolean;
}

export function EmployeeLayoutClient({
  children,
  enabledModules,
  aiChatEnabled,
  onboardingComplete = true,
  isAdminInEmployeeView = false,
  hasPartialAdminAccess = false,
}: EmployeeLayoutClientProps) {
  return (
    <>
      {/* Top Navigation Header */}
      <EmployeeTopNav
        enabledModules={enabledModules}
        isAdminInEmployeeView={isAdminInEmployeeView}
        hasPartialAdminAccess={hasPartialAdminAccess}
      />

      {/* Admin in Employee View Banner */}
      <EmployeeViewBanner isVisible={isAdminInEmployeeView} />

      {/* Onboarding incomplete banner */}
      {!onboardingComplete && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                Your profile is incomplete. Please complete your onboarding to access all features.
              </span>
            </div>
            <Link
              href="/employee-onboarding"
              className="inline-flex items-center gap-1 text-sm font-medium text-amber-900 hover:text-amber-700 whitespace-nowrap"
            >
              Complete now
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50">
        {children}
      </div>

      {/* AI Chat Widget - only shown if enabled for organization */}
      {aiChatEnabled && <ChatWidget />}
    </>
  );
}
