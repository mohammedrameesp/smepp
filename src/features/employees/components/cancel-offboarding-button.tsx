/**
 * @file cancel-offboarding-button.tsx
 * @description Button to cancel offboarding and restore employee to ACTIVE status
 * @module features/employees/components
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

interface CancelOffboardingButtonProps {
  employeeId: string;
  employeeName: string;
}

export function CancelOffboardingButton({ employeeId, employeeName }: CancelOffboardingButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${employeeId}/offboard`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel offboarding');
      }

      toast.success(`${employeeName} has been restored to active status`);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Cancel offboarding error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel offboarding', {
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Undo2 className="h-4 w-4 mr-2" />
          Cancel Offboarding
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Cancel Offboarding</DialogTitle>
          <DialogDescription>
            This will restore <strong>{employeeName}</strong> to active status. They will regain
            full access to the system.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Keep Offboarded
          </Button>
          <Button type="button" onClick={handleCancel} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              'Restore Employee'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
