/**
 * @file leave-approval-actions.tsx
 * @description Approval and rejection action buttons with dialogs for leave requests.
 *              Shows approval chain status and override warnings when applicable.
 * @module components/domains/hr
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { approveLeaveRequest, rejectLeaveRequest } from '@/features/leave/lib/api';
import { useSubmitAction } from '@/hooks/use-submit-action';
import { ICON_SIZES } from '@/lib/constants';
import type { LeaveApprovalActionsProps, ApprovalStep } from '@/features/leave/types';

// Role display names mapping
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  MANAGER: 'Manager',
  HR_MANAGER: 'HR',
  FINANCE_MANAGER: 'Finance',
  DIRECTOR: 'Director',
  EMPLOYEE: 'Employee',
};

function getCurrentPendingStep(chain: ApprovalStep[] | null | undefined): ApprovalStep | null {
  if (!chain || chain.length === 0) return null;
  return chain.find(step => step.status === 'PENDING') || null;
}

function getCompletedStepsInfo(chain: ApprovalStep[] | null | undefined): string | null {
  if (!chain || chain.length === 0) return null;

  const approvedSteps = chain.filter(step => step.status === 'APPROVED');
  if (approvedSteps.length === 0) return null;

  return approvedSteps
    .map(step => `${ROLE_DISPLAY_NAMES[step.requiredRole] || step.requiredRole}: ${step.approver?.name || 'Approved'}`)
    .join(', ');
}

export function LeaveApprovalActions({
  requestId,
  onApproved,
  onRejected,
  approvalChain,
  approvalSummary
}: LeaveApprovalActionsProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const hasMultiLevelApproval = approvalChain && approvalChain.length > 0;
  const currentPendingStep = getCurrentPendingStep(approvalChain);
  const completedStepsInfo = getCompletedStepsInfo(approvalChain);
  const remainingSteps = approvalChain?.filter(s => s.status === 'PENDING').length || 0;
  // Check if user would be performing an override (approving at higher level than current)
  const isUserOverride = approvalSummary?.isUserOverride ?? false;

  const approveAction = useSubmitAction({
    action: async () => approveLeaveRequest(requestId, approveNotes || undefined),
    successMessage: 'Leave request approved',
    onSuccess: () => {
      setApproveOpen(false);
      setApproveNotes('');
      onApproved?.();
    },
    showToast: false,
  });

  const rejectAction = useSubmitAction({
    action: async () => {
      if (!rejectReason.trim()) {
        throw new Error('Rejection reason is required');
      }
      return rejectLeaveRequest(requestId, rejectReason);
    },
    successMessage: 'Leave request rejected',
    onSuccess: () => {
      setRejectOpen(false);
      setRejectReason('');
      onRejected?.();
    },
    showToast: false,
  });

  const handleApproveOpenChange = (isOpen: boolean) => {
    setApproveOpen(isOpen);
    if (!isOpen) {
      setApproveNotes('');
      approveAction.resetError();
    }
  };

  const handleRejectOpenChange = (isOpen: boolean) => {
    setRejectOpen(isOpen);
    if (!isOpen) {
      setRejectReason('');
      rejectAction.resetError();
    }
  };

  return (
    <>
      <div className="flex gap-2" role="group" aria-label="Approval actions">
        <button
          onClick={() => setApproveOpen(true)}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all bg-emerald-600 text-white hover:bg-emerald-700 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 focus-visible:ring-emerald-500"
          aria-label="Approve this leave request"
          aria-describedby={hasMultiLevelApproval && remainingSteps > 1 ? 'approval-chain-info' : undefined}
        >
          <CheckCircle className={ICON_SIZES.sm} aria-hidden="true" />
          Approve
        </button>
        <button
          onClick={() => setRejectOpen(true)}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all bg-red-600 text-white hover:bg-red-700 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 focus-visible:ring-red-500"
          aria-label="Reject this leave request"
        >
          <XCircle className={ICON_SIZES.sm} aria-hidden="true" />
          Reject
        </button>
        {hasMultiLevelApproval && remainingSteps > 1 && (
          <span id="approval-chain-info" className="sr-only">
            This request requires {remainingSteps} more approval levels. Your approval will advance it to the next level.
          </span>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={handleApproveOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogDescription>
              {hasMultiLevelApproval && remainingSteps > 1
                ? 'Your approval will be recorded. Additional approvals may be required.'
                : 'Are you sure you want to approve this leave request?'}
            </DialogDescription>
          </DialogHeader>

          {/* Approval Chain Status */}
          {hasMultiLevelApproval && (
            <div className="space-y-2" role="region" aria-label="Approval chain status">
              {/* Already approved steps */}
              {completedStepsInfo && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm" role="status">
                  <CheckCircle className={`${ICON_SIZES.sm} text-emerald-700 dark:text-emerald-400 mt-0.5 flex-shrink-0`} aria-hidden="true" />
                  <div>
                    <p className="font-medium text-emerald-900 dark:text-emerald-100">Already approved by:</p>
                    <p className="text-emerald-800 dark:text-emerald-200">{completedStepsInfo}</p>
                  </div>
                </div>
              )}

              {/* Current pending step info - show when there are more steps after this one */}
              {currentPendingStep && remainingSteps > 1 && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm" role="status">
                  <Info className={`${ICON_SIZES.sm} text-blue-700 dark:text-blue-400 mt-0.5 flex-shrink-0`} aria-hidden="true" />
                  <div>
                    <p className="text-blue-900 dark:text-blue-100">
                      <span className="font-medium">Current level:</span>{' '}
                      {ROLE_DISPLAY_NAMES[currentPendingStep.requiredRole] || currentPendingStep.requiredRole}
                    </p>
                    <p className="text-blue-800 dark:text-blue-200 text-xs mt-1">
                      {remainingSteps - 1} more approval{remainingSteps - 1 > 1 ? 's' : ''} required after yours
                    </p>
                  </div>
                </div>
              )}

              {/* Override warning - only shown when user is at a higher level than current pending */}
              {isUserOverride && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm" role="alert">
                  <AlertTriangle className={`${ICON_SIZES.sm} text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0`} aria-hidden="true" />
                  <div className="text-amber-900 dark:text-amber-100">
                    <p className="font-medium">Upper-level override</p>
                    <p className="text-xs mt-0.5 text-amber-800 dark:text-amber-200">
                      You are approving at a higher level. Lower pending levels will be skipped.
                      <strong className="block mt-1">Notes are required to explain the override.</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {approveAction.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {approveAction.error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Notes {isUserOverride ? <span className="text-red-500">*</span> : '(Optional)'}
            </label>
            <Textarea
              placeholder={isUserOverride
                ? "Explain why you are overriding lower approval levels..."
                : "Add any notes for the employee..."}
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              required={isUserOverride}
            />
            {isUserOverride && (
              <p className="text-xs text-muted-foreground">
                Required when approving at a higher level than the current pending step.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveOpen(false)}
              disabled={approveAction.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => approveAction.execute(undefined)}
              disabled={approveAction.isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveAction.isSubmitting ? 'Approving...' : 'Approve Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={handleRejectOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request.
            </DialogDescription>
          </DialogHeader>

          {/* Rejection warning for multi-level chains */}
          {hasMultiLevelApproval && completedStepsInfo && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm" role="alert">
              <AlertTriangle className={`${ICON_SIZES.sm} text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0`} aria-hidden="true" />
              <div className="text-amber-900 dark:text-amber-100">
                <p className="font-medium">Previous approvals will be overridden</p>
                <p className="text-xs mt-0.5 text-amber-800 dark:text-amber-200">
                  Already approved by: {completedStepsInfo}. Rejection will terminate the approval chain.
                </p>
              </div>
            </div>
          )}

          {rejectAction.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {rejectAction.error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Rejection Reason *</label>
            <Textarea
              placeholder="Explain why the request is being rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={rejectAction.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectAction.execute(undefined)}
              disabled={rejectAction.isSubmitting}
            >
              {rejectAction.isSubmitting ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
