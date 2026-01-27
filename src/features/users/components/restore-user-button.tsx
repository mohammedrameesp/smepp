'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Undo2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';
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

interface RestoreUserButtonProps {
  userId: string;
  userName: string;
}

export function RestoreUserButton({ userId, userName }: RestoreUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const router = useRouter();

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const response = await fetch(`/api/users/${userId}/restore`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore employee');
      }

      toast.success('Employee restored successfully', {
        description: 'The employee has been reactivated and can log in again.',
      });

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore employee');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="default" className="bg-green-600 hover:bg-green-700">
          <Undo2 className={cn(ICON_SIZES.sm, 'mr-2')} />
          Restore Employee
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore Employee</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to restore <strong>{userName}</strong>?
            <br /><br />
            This will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Reactivate the employee&apos;s account</li>
              <li>Allow them to log in again</li>
              <li>Resume gratuity and service calculations (no days lost)</li>
              <li>Cancel the scheduled permanent deletion</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleRestore();
            }}
            disabled={isRestoring}
            className="bg-green-600 hover:bg-green-700"
          >
            {isRestoring ? (
              <>
                <Loader2 className={cn(ICON_SIZES.sm, 'mr-2 animate-spin')} />
                Restoring...
              </>
            ) : (
              <>
                <Undo2 className={cn(ICON_SIZES.sm, 'mr-2')} />
                Restore Employee
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
