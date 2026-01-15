/**
 * @file approval-chain-status.tsx
 * @description Visual approval chain timeline component showing multi-level approval progress.
 *              Displays each approval level with status, approver info, and timing.
 * @module components/domains/hr
 */
'use client';

import { CheckCircle2, Clock, XCircle, SkipForward, User } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Role display names mapping
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  MANAGER: 'Manager',
  HR_MANAGER: 'HR',
  FINANCE_MANAGER: 'Finance',
  DIRECTOR: 'Director',
  EMPLOYEE: 'Employee',
};

interface ApprovalStep {
  id: string;
  levelOrder: number;
  requiredRole: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  approverId: string | null;
  approver: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  actionAt: string | null;
  notes: string | null;
}

interface ApprovalSummary {
  totalSteps: number;
  completedSteps: number;
  currentStep: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_STARTED';
}

interface ApprovalChainStatusProps {
  approvalChain: ApprovalStep[] | null;
  approvalSummary: ApprovalSummary | null;
  className?: string;
}

function getStatusIcon(status: ApprovalStep['status']) {
  switch (status) {
    case 'APPROVED':
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case 'REJECTED':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'SKIPPED':
      return <SkipForward className="h-5 w-5 text-amber-500" />;
    case 'PENDING':
    default:
      return <Clock className="h-5 w-5 text-slate-400" />;
  }
}

function getStatusBadge(status: ApprovalStep['status']) {
  switch (status) {
    case 'APPROVED':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>;
    case 'REJECTED':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
    case 'SKIPPED':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Skipped</Badge>;
    case 'PENDING':
    default:
      return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">Pending</Badge>;
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ApprovalChainStatus({ approvalChain, approvalSummary, className }: ApprovalChainStatusProps) {
  if (!approvalChain || approvalChain.length === 0) {
    return null;
  }

  const overallStatus = approvalSummary?.status || 'PENDING';

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Approval Progress</CardTitle>
          {approvalSummary && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{approvalSummary.completedSteps} of {approvalSummary.totalSteps} completed</span>
              {overallStatus === 'APPROVED' && (
                <Badge className="bg-emerald-500 hover:bg-emerald-600">Approved</Badge>
              )}
              {overallStatus === 'REJECTED' && (
                <Badge variant="destructive">Rejected</Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        {approvalSummary && (
          <div className="mb-4">
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  overallStatus === 'REJECTED' ? "bg-red-500" : "bg-emerald-500"
                )}
                style={{
                  width: `${(approvalSummary.completedSteps / approvalSummary.totalSteps) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Approval steps timeline */}
        <div className="relative">
          {approvalChain.map((step, index) => {
            const isLast = index === approvalChain.length - 1;
            const isCurrent = step.status === 'PENDING' &&
              !approvalChain.slice(0, index).some(s => s.status === 'PENDING');

            return (
              <div key={step.id} className="relative flex gap-4">
                {/* Timeline connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute left-[10px] top-[28px] w-0.5 h-[calc(100%-8px)]",
                      step.status === 'APPROVED' ? "bg-emerald-200" :
                      step.status === 'REJECTED' ? "bg-red-200" :
                      step.status === 'SKIPPED' ? "bg-amber-200" :
                      "bg-slate-200 dark:bg-slate-700"
                    )}
                  />
                )}

                {/* Status icon */}
                <div className={cn(
                  "relative z-10 flex-shrink-0 w-5 h-5 mt-0.5 rounded-full flex items-center justify-center",
                  isCurrent && "ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                )}>
                  {getStatusIcon(step.status)}
                </div>

                {/* Step content */}
                <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          Level {step.levelOrder}: {ROLE_DISPLAY_NAMES[step.requiredRole] || step.requiredRole}
                        </span>
                        {isCurrent && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            Current
                          </Badge>
                        )}
                      </div>

                      {/* Approver info */}
                      {step.approver && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>{step.approver.name || step.approver.email}</span>
                          {step.actionAt && (
                            <>
                              <span className="mx-1">-</span>
                              <span>{formatDate(step.actionAt)}</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {step.notes && (
                        <p className="mt-1.5 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded px-2 py-1.5">
                          {step.notes}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className="flex-shrink-0">
                      {getStatusBadge(step.status)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
