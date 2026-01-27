/**
 * @file loan-actions.tsx
 * @description Action buttons for managing employee loan status (pause, resume, write-off)
 * @module components/domains/hr
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoanStatus } from '@prisma/client';
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
import { Pause, Play, XCircle, Loader2 } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

interface LoanActionsProps {
  loanId: string;
  currentStatus: LoanStatus;
  remainingAmount: number;
}

export function LoanActions({ loanId, currentStatus, remainingAmount }: LoanActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (action: string, endpoint: string) => {
    setIsLoading(action);
    try {
      const response = await fetch(`/api/payroll/loans/${loanId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} loan`);
      }

      toast.success(`Loan ${action} successfully`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} loan`);
    } finally {
      setIsLoading(null);
    }
  };

  if (currentStatus === 'COMPLETED' || currentStatus === 'WRITTEN_OFF') {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            {currentStatus === 'COMPLETED'
              ? 'This loan has been fully repaid.'
              : 'This loan has been written off.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>Manage loan status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {/* Pause Loan */}
          {currentStatus === 'ACTIVE' && (
            <Button
              variant="outline"
              onClick={() => handleAction('paused', 'pause')}
              disabled={isLoading !== null}
            >
              {isLoading === 'paused' ? (
                <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
              ) : (
                <Pause className={`mr-2 ${ICON_SIZES.sm}`} />
              )}
              Pause Deductions
            </Button>
          )}

          {/* Resume Loan */}
          {currentStatus === 'PAUSED' && (
            <Button
              onClick={() => handleAction('resumed', 'resume')}
              disabled={isLoading !== null}
            >
              {isLoading === 'resumed' ? (
                <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
              ) : (
                <Play className={`mr-2 ${ICON_SIZES.sm}`} />
              )}
              Resume Deductions
            </Button>
          )}

          {/* Write Off */}
          {remainingAmount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading !== null}>
                  {isLoading === 'write-off' ? (
                    <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
                  ) : (
                    <XCircle className={`mr-2 ${ICON_SIZES.sm}`} />
                  )}
                  Write Off
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Write off this loan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the loan as written off. The remaining balance will not be recovered.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleAction('write-off', 'write-off')}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Write Off
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          {currentStatus === 'ACTIVE' && (
            <p>
              This loan is active. Monthly deductions will be applied automatically during payroll processing.
              You can pause deductions temporarily if needed.
            </p>
          )}
          {currentStatus === 'PAUSED' && (
            <p>
              Deductions are currently paused. No deductions will be made until the loan is resumed.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
