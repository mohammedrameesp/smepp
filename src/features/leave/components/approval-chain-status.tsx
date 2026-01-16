/**
 * @file approval-chain-status.tsx
 * @description Horizontal approval chain stepper component showing multi-level approval progress.
 *              Displays each approval level with status, approver info, and timing.
 * @module components/domains/hr
 */
'use client';

import { CheckCircle2, Clock, XCircle, SkipForward, User, ChevronRight, Send } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  canCurrentUserApprove?: boolean;
}

interface ApprovalChainStatusProps {
  approvalChain: ApprovalStep[] | null;
  approvalSummary: ApprovalSummary | null;
  submittedAt?: string | null;
  className?: string;
}

function getStatusIcon(status: ApprovalStep['status'], size: 'sm' | 'md' = 'md') {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  switch (status) {
    case 'APPROVED':
      return <CheckCircle2 className={cn(sizeClass, 'text-emerald-500')} />;
    case 'REJECTED':
      return <XCircle className={cn(sizeClass, 'text-red-500')} />;
    case 'SKIPPED':
      return <SkipForward className={cn(sizeClass, 'text-amber-500')} />;
    case 'PENDING':
    default:
      return <Clock className={cn(sizeClass, 'text-slate-400')} />;
  }
}

function getStepStyles(status: ApprovalStep['status'], isCurrent: boolean) {
  if (isCurrent) {
    return {
      bg: 'bg-blue-50 dark:bg-blue-950',
      border: 'border-blue-300 dark:border-blue-700',
      ring: 'ring-2 ring-blue-400 ring-offset-2',
    };
  }
  switch (status) {
    case 'APPROVED':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950',
        border: 'border-emerald-300 dark:border-emerald-700',
        ring: '',
      };
    case 'REJECTED':
      return {
        bg: 'bg-red-50 dark:bg-red-950',
        border: 'border-red-300 dark:border-red-700',
        ring: '',
      };
    case 'SKIPPED':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950',
        border: 'border-amber-300 dark:border-amber-700',
        ring: '',
      };
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-900',
        border: 'border-slate-200 dark:border-slate-700',
        ring: '',
      };
  }
}

function getConnectorColor(status: ApprovalStep['status']) {
  switch (status) {
    case 'APPROVED':
      return 'bg-emerald-300 dark:bg-emerald-600';
    case 'REJECTED':
      return 'bg-red-300 dark:bg-red-600';
    case 'SKIPPED':
      return 'bg-amber-300 dark:bg-amber-600';
    default:
      return 'bg-slate-200 dark:bg-slate-700';
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

function formatShortDate(dateString: string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function getStatusLabel(status: ApprovalStep['status']) {
  switch (status) {
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'SKIPPED':
      return 'Skipped';
    default:
      return 'Pending';
  }
}

export function ApprovalChainStatus({ approvalChain, approvalSummary, submittedAt, className }: ApprovalChainStatusProps) {
  if (!approvalChain || approvalChain.length === 0) {
    return null;
  }

  const overallStatus = approvalSummary?.status || 'PENDING';
  const canCurrentUserApprove = approvalSummary?.canCurrentUserApprove || false;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Approval Progress</CardTitle>
          {approvalSummary && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{approvalSummary.completedSteps} of {approvalSummary.totalSteps}</span>
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
        {/* Horizontal approval steps - evenly spaced */}
        <TooltipProvider>
          <div className="flex items-center">
            {/* Submitted step */}
            <div className="flex items-center flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-default transition-all',
                      'bg-emerald-50 dark:bg-emerald-950',
                      'border-emerald-300 dark:border-emerald-700'
                    )}
                  >
                    <Send className="h-4 w-4 text-emerald-500" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium leading-tight">Submitted</span>
                      <span className="text-[10px] leading-tight text-muted-foreground">
                        {formatShortDate(submittedAt ?? null) || 'Done'}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">Request Submitted</p>
                    {submittedAt && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(submittedAt ?? null)}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Connector from submitted to first approval */}
              <div className="flex-1 flex items-center px-2">
                <div className="h-0.5 flex-1 bg-emerald-300 dark:bg-emerald-600" />
                <ChevronRight className="h-4 w-4 -ml-1 flex-shrink-0 text-emerald-400" />
              </div>
            </div>

            {/* Approval steps */}
            {approvalChain.map((step, index) => {
              const isLast = index === approvalChain.length - 1;
              const isCurrent = step.status === 'PENDING' &&
                !approvalChain.slice(0, index).some(s => s.status === 'PENDING');
              const styles = getStepStyles(step.status, isCurrent);

              // Determine the label to show for the current step
              const getStepLabel = () => {
                if (isCurrent) {
                  return canCurrentUserApprove ? 'You' : 'Pending';
                }
                // For completed steps, show time if available
                if (step.actionAt && (step.status === 'APPROVED' || step.status === 'REJECTED')) {
                  return formatShortDate(step.actionAt);
                }
                return getStatusLabel(step.status);
              };

              return (
                <div key={step.id} className={cn('flex items-center', !isLast && 'flex-1')}>
                  {/* Step card */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-default transition-all',
                          styles.bg,
                          styles.border,
                          styles.ring
                        )}
                      >
                        {getStatusIcon(step.status, 'sm')}
                        <div className="flex flex-col">
                          <span className="text-xs font-medium leading-tight">
                            {ROLE_DISPLAY_NAMES[step.requiredRole] || step.requiredRole}
                          </span>
                          <span className={cn(
                            'text-[10px] leading-tight',
                            isCurrent ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-muted-foreground'
                          )}>
                            {getStepLabel()}
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-medium">
                          Level {step.levelOrder}: {ROLE_DISPLAY_NAMES[step.requiredRole] || step.requiredRole}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Status: {getStatusLabel(step.status)}
                        </p>
                        {step.approver && (
                          <div className="flex items-center gap-1 text-xs">
                            <User className="h-3 w-3" />
                            <span>{step.approver.name || step.approver.email}</span>
                          </div>
                        )}
                        {step.actionAt && (
                          <p className="text-xs text-muted-foreground">
                            {formatDate(step.actionAt)}
                          </p>
                        )}
                        {step.notes && (
                          <p className="text-xs italic border-t pt-1 mt-1">
                            &ldquo;{step.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  {/* Connector line - fills remaining space */}
                  {!isLast && (
                    <div className="flex-1 flex items-center px-2">
                      <div className={cn('h-0.5 flex-1', getConnectorColor(step.status))} />
                      <ChevronRight className={cn(
                        'h-4 w-4 -ml-1 flex-shrink-0',
                        step.status === 'APPROVED' ? 'text-emerald-400' :
                        step.status === 'REJECTED' ? 'text-red-400' :
                        step.status === 'SKIPPED' ? 'text-amber-400' :
                        'text-slate-300 dark:text-slate-600'
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
