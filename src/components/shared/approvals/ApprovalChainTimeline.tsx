/**
 * @file ApprovalChainTimeline.tsx
 * @description Timeline component for displaying approval workflow steps and status
 * @module components/shared
 */

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, Clock, ChevronDown, ChevronUp, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface ApprovalStepData {
  id: string;
  levelOrder: number;
  requiredRole: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  approverId?: string | null;
  approver?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  actionAt?: string | null;
  notes?: string | null;
}

interface ApprovalChainTimelineProps {
  steps: ApprovalStepData[];
  entityType: 'LEAVE_REQUEST' | 'PURCHASE_REQUEST' | 'ASSET_REQUEST';
  entityId: string;
  canApprove?: boolean;
  currentUserId?: string;
  onApprovalComplete?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  HR_MANAGER: 'HR Manager',
  FINANCE_MANAGER: 'Finance Manager',
  DIRECTOR: 'Director',
  ADMIN: 'Admin',
};

const STATUS_CONFIG = {
  PENDING: {
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 border-yellow-200',
    label: 'Pending',
  },
  APPROVED: {
    icon: Check,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    label: 'Approved',
  },
  REJECTED: {
    icon: X,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    label: 'Rejected',
  },
  SKIPPED: {
    icon: ChevronDown,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 border-gray-200',
    label: 'Skipped',
  },
};

export function ApprovalChainTimeline({
  steps,
  entityType,
  entityId,
  canApprove = false,
  currentUserId,
  onApprovalComplete,
  showActions = true,
  compact = false,
}: ApprovalChainTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const currentPendingStep = steps.find((s) => s.status === 'PENDING');
  const isFullyApproved = steps.every((s) => s.status === 'APPROVED');
  const isRejected = steps.some((s) => s.status === 'REJECTED');

  const handleAction = async () => {
    if (!selectedStepId || !actionType) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/approval-steps/${selectedStepId}/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes.trim() || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${actionType} request`);
      }

      toast.success(actionType === 'approve' ? 'Request approved' : 'Request rejected');
      onApprovalComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${actionType} request`);
    } finally {
      setIsSubmitting(false);
      setActionType(null);
      setSelectedStepId(null);
      setNotes('');
    }
  };

  const openActionDialog = (stepId: string, action: 'approve' | 'reject') => {
    setSelectedStepId(stepId);
    setActionType(action);
    setNotes('');
  };

  if (steps.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
        No approval workflow configured for this request.
      </div>
    );
  }

  // Compact horizontal view
  if (compact && !isExpanded) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Approval Chain</span>
          <ChevronDown className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1 flex-wrap">
          {steps.map((step, index) => {
            const config = STATUS_CONFIG[step.status];
            const Icon = config.icon;
            return (
              <div key={step.id} className="flex items-center">
                {index > 0 && <span className="mx-1 text-muted-foreground">→</span>}
                <Badge variant="outline" className={cn('gap-1', config.bgColor)}>
                  <Icon className={cn('h-3 w-3', config.color)} />
                  <span>{ROLE_LABELS[step.requiredRole] || step.requiredRole}</span>
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {compact && (
        <button
          onClick={() => setIsExpanded(false)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Approval Chain</span>
          <ChevronUp className="h-4 w-4" />
        </button>
      )}

      {/* Status summary */}
      <div className="flex items-center gap-2">
        {isFullyApproved ? (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <Check className="h-3 w-3 mr-1" />
            Fully Approved
          </Badge>
        ) : isRejected ? (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <X className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        ) : (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Pending Approval
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {steps.filter((s) => s.status === 'APPROVED').length} of {steps.length} approved
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {steps.map((step, index) => {
          const config = STATUS_CONFIG[step.status];
          const Icon = config.icon;
          const isCurrentStep = step.status === 'PENDING' && currentPendingStep?.id === step.id;
          const canActOnStep = isCurrentStep && canApprove && showActions;

          return (
            <div key={step.id} className="relative flex gap-4">
              {/* Vertical line connector */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-4 top-8 w-0.5 h-full -translate-x-1/2',
                    step.status === 'APPROVED' ? 'bg-green-300' : 'bg-gray-200'
                  )}
                />
              )}

              {/* Step indicator */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white shrink-0',
                  step.status === 'APPROVED' && 'border-green-500 bg-green-50',
                  step.status === 'REJECTED' && 'border-red-500 bg-red-50',
                  step.status === 'PENDING' && 'border-yellow-500 bg-yellow-50',
                  step.status === 'SKIPPED' && 'border-gray-300 bg-gray-50'
                )}
              >
                <Icon className={cn('h-4 w-4', config.color)} />
              </div>

              {/* Step content */}
              <div className={cn('flex-1 pb-6', index === steps.length - 1 && 'pb-0')}>
                <div
                  className={cn(
                    'rounded-lg border p-4',
                    isCurrentStep && 'ring-2 ring-yellow-400 ring-offset-2',
                    config.bgColor
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Level {step.levelOrder}: {ROLE_LABELS[step.requiredRole] || step.requiredRole}
                        </span>
                        <Badge variant="outline" className={cn('text-xs', config.bgColor)}>
                          {config.label}
                        </Badge>
                      </div>

                      {/* Approver info */}
                      {step.approver && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{step.approver.name || step.approver.email}</span>
                          {step.actionAt && (
                            <span className="ml-2">
                              • {format(new Date(step.actionAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {step.notes && (
                        <div className="flex items-start gap-1 mt-2 text-sm">
                          <MessageSquare className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{step.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {canActOnStep && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => openActionDialog(step.id, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openActionDialog(step.id, 'reject')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action confirmation dialog */}
      <AlertDialog open={actionType !== null} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve'
                ? 'Are you sure you want to approve this request? This action cannot be undone.'
                : 'Are you sure you want to reject this request? This will cancel the entire approval chain.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium">
              Notes {actionType === 'reject' && <span className="text-red-500">*</span>}
            </label>
            <Textarea
              placeholder={
                actionType === 'approve'
                  ? 'Optional notes for approval...'
                  : 'Please provide a reason for rejection...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isSubmitting || (actionType === 'reject' && !notes.trim())}
              className={cn(
                actionType === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
            >
              {isSubmitting ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
