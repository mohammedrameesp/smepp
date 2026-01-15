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
import { approveLeaveRequest, rejectLeaveRequest } from '@/lib/api/leave';
import { useSubmitAction } from '@/lib/hooks';
import type { LeaveApprovalActionsProps, ApprovalStep } from '@/lib/types/leave';

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
      <div className="flex gap-2">
        <button
          onClick={() => setApproveOpen(true)}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all bg-emerald-600 text-white hover:bg-emerald-700 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 focus-visible:ring-emerald-500"
        >
          <CheckCircle className="h-4 w-4" />
          Approve
        </button>
        <button
          onClick={() => setRejectOpen(true)}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all bg-red-600 text-white hover:bg-red-700 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 focus-visible:ring-red-500"
        >
          <XCircle className="h-4 w-4" />
          Reject
        </button>
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
            <div className="space-y-2">
              {/* Already approved steps */}
              {completedStepsInfo && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-800">Already approved by:</p>
                    <p className="text-emerald-700">{completedStepsInfo}</p>
                  </div>
                </div>
              )}

              {/* Current pending step info */}
              {currentPendingStep && remainingSteps > 1 && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-blue-800">
                      <span className="font-medium">Current level:</span>{' '}
                      {ROLE_DISPLAY_NAMES[currentPendingStep.requiredRole] || currentPendingStep.requiredRole}
                    </p>
                    <p className="text-blue-700 text-xs mt-1">
                      {remainingSteps} approval level{remainingSteps > 1 ? 's' : ''} remaining
                    </p>
                  </div>
                </div>
              )}

              {/* Override warning - shown when higher level approves */}
              {currentPendingStep && remainingSteps > 1 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-amber-800">
                    <p className="font-medium">Upper-level override</p>
                    <p className="text-xs mt-0.5">
                      If you approve at a higher level, lower pending levels will be skipped.
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
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              placeholder="Add any notes for the employee..."
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
            />
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
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-amber-800">
                <p className="font-medium">Previous approvals will be overridden</p>
                <p className="text-xs mt-0.5">
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
