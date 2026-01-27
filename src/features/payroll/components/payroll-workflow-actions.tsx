/**
 * @file payroll-workflow-actions.tsx
 * @description Workflow action buttons for payroll run management (process, submit, approve, pay)
 * @module components/domains/hr
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PayrollStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Send,
  CheckCircle,
  Play,
  CreditCard,
  XCircle,
  FileText,
  Loader2,
  Trash2,
} from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

interface PayrollWorkflowActionsProps {
  payrollRunId: string;
  currentStatus: PayrollStatus;
  hasPayslips: boolean;
  wpsGenerated: boolean;
}

export function PayrollWorkflowActions({
  payrollRunId,
  currentStatus,
  hasPayslips,
  wpsGenerated,
}: PayrollWorkflowActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (action: string, endpoint: string) => {
    setIsLoading(action);
    try {
      const response = await fetch(`/api/payroll/runs/${payrollRunId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action}`);
      }

      toast.success(`Payroll ${action} successfully`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action}`);
    } finally {
      setIsLoading(null);
    }
  };

  const handleDelete = async () => {
    setIsLoading('delete');
    try {
      const response = await fetch(`/api/payroll/runs/${payrollRunId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      toast.success('Payroll run deleted');
      router.push('/admin/payroll/runs');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setIsLoading(null);
    }
  };

  const handleGenerateWPS = async () => {
    setIsLoading('wps');
    try {
      const response = await fetch(`/api/payroll/runs/${payrollRunId}/wps`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate WPS file');
      }

      // Get filename from header
      const filename = response.headers.get('X-Filename') || 'wps-file.sif';

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('WPS file generated and downloaded');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate WPS file');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>
          Manage the payroll run workflow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {/* Process (Generate Payslips) - First step from DRAFT */}
          {currentStatus === PayrollStatus.DRAFT && (
            <Button
              onClick={() => handleAction('processed', 'process')}
              disabled={isLoading !== null}
            >
              {isLoading === 'processed' ? (
                <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
              ) : (
                <Play className={`mr-2 ${ICON_SIZES.sm}`} />
              )}
              Generate Payslips
            </Button>
          )}

          {/* Submit for Approval - After payslips are generated */}
          {currentStatus === PayrollStatus.PROCESSED && hasPayslips && (
            <Button
              onClick={() => handleAction('submitted', 'submit')}
              disabled={isLoading !== null}
            >
              {isLoading === 'submitted' ? (
                <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
              ) : (
                <Send className={`mr-2 ${ICON_SIZES.sm}`} />
              )}
              Submit for Approval
            </Button>
          )}

          {/* Approve */}
          {currentStatus === PayrollStatus.PENDING_APPROVAL && (
            <>
              <Button
                onClick={() => handleAction('approved', 'approve')}
                disabled={isLoading !== null}
              >
                {isLoading === 'approved' ? (
                  <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
                ) : (
                  <CheckCircle className={`mr-2 ${ICON_SIZES.sm}`} />
                )}
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAction('rejected', 'cancel')}
                disabled={isLoading !== null}
              >
                {isLoading === 'rejected' ? (
                  <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
                ) : (
                  <XCircle className={`mr-2 ${ICON_SIZES.sm}`} />
                )}
                Reject
              </Button>
            </>
          )}

          {/* Mark as Paid - After approval */}
          {currentStatus === PayrollStatus.APPROVED && (
            <Button
              onClick={() => handleAction('paid', 'pay')}
              disabled={isLoading !== null}
            >
              {isLoading === 'paid' ? (
                <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
              ) : (
                <CreditCard className={`mr-2 ${ICON_SIZES.sm}`} />
              )}
              Mark as Paid
            </Button>
          )}

          {/* Generate WPS */}
          {(currentStatus === PayrollStatus.PROCESSED ||
            currentStatus === PayrollStatus.PENDING_APPROVAL ||
            currentStatus === PayrollStatus.APPROVED ||
            currentStatus === PayrollStatus.PAID) &&
            hasPayslips && (
              <Button
                variant="outline"
                onClick={handleGenerateWPS}
                disabled={isLoading !== null}
              >
                {isLoading === 'wps' ? (
                  <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
                ) : (
                  <FileText className={`mr-2 ${ICON_SIZES.sm}`} />
                )}
                {wpsGenerated ? 'Regenerate WPS File' : 'Generate WPS File'}
              </Button>
            )}

          {/* Cancel/Delete */}
          {(currentStatus === PayrollStatus.DRAFT ||
            currentStatus === PayrollStatus.PENDING_APPROVAL ||
            currentStatus === PayrollStatus.CANCELLED) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading !== null}>
                  {isLoading === 'delete' ? (
                    <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
                  ) : (
                    <Trash2 className={`mr-2 ${ICON_SIZES.sm}`} />
                  )}
                  {currentStatus === PayrollStatus.CANCELLED ? 'Delete' : 'Cancel'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {currentStatus === PayrollStatus.CANCELLED
                      ? 'Delete payroll run?'
                      : 'Cancel payroll run?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {currentStatus === PayrollStatus.CANCELLED
                      ? 'This will permanently delete the payroll run. This action cannot be undone.'
                      : 'This will cancel the payroll run. You can delete it afterwards if needed.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, keep it</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={
                      currentStatus === PayrollStatus.CANCELLED ||
                      currentStatus === PayrollStatus.DRAFT
                        ? handleDelete
                        : () => handleAction('cancelled', 'cancel')
                    }
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, {currentStatus === PayrollStatus.CANCELLED ? 'delete' : 'cancel'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Status Description */}
        <div className="mt-4 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          {currentStatus === PayrollStatus.DRAFT && (
            <p>This payroll run is in draft. Click &quot;Generate Payslips&quot; to calculate salaries for all employees.</p>
          )}
          {currentStatus === PayrollStatus.PROCESSED && (
            <p>
              Payslips have been generated. Review them and submit for approval when ready.
              You can also generate the WPS file for bank submission.
            </p>
          )}
          {currentStatus === PayrollStatus.PENDING_APPROVAL && (
            <p>This payroll run is pending approval. Review payslips and approve or reject.</p>
          )}
          {currentStatus === PayrollStatus.APPROVED && (
            <p>This payroll run is approved. Mark as paid when payment is made.</p>
          )}
          {currentStatus === PayrollStatus.PAID && (
            <p>This payroll run has been marked as paid. You can regenerate the WPS file if needed.</p>
          )}
          {currentStatus === PayrollStatus.CANCELLED && (
            <p>This payroll run has been cancelled. You can delete it if no longer needed.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
