'use client';

import { EmployeeTopNav } from '@/components/layout/employee-top-nav';
import { ChatWidget } from '@/components/chat/chat-widget';

interface EmployeeLayoutClientProps {
  children: React.ReactNode;
  enabledModules: string[];
  aiChatEnabled: boolean;
}

export function EmployeeLayoutClient({ children, enabledModules, aiChatEnabled }: EmployeeLayoutClientProps) {
  return (
    <>
      {/* Top Navigation Header */}
      <EmployeeTopNav enabledModules={enabledModules} />

      {/* Main content */}
      <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50">
        {children}
      </div>

      {/* AI Chat Widget - only shown if enabled for organization */}
      {aiChatEnabled && <ChatWidget />}
    </>
  );
}
