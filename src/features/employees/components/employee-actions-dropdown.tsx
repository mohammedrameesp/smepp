/**
 * @file employee-actions-dropdown.tsx
 * @description Dropdown menu for sensitive admin actions on employees (offboard, delete)
 * @module features/employees/components
 */
'use client';

import { useState } from 'react';
import { MoreVertical, UserMinus, Trash2 } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OffboardEmployeeDialog } from './offboard-employee-dialog';
import { DeleteUserButton } from '@/features/users/components';

interface EmployeeActionsDropdownProps {
  employeeId: string;
  employeeName: string;
  isSelf: boolean;
  isDeleted: boolean;
  isOffboarded: boolean;
  dateOfJoining?: Date | null;
}

export function EmployeeActionsDropdown({
  employeeId,
  employeeName,
  isSelf,
  isDeleted,
  isOffboarded,
  dateOfJoining,
}: EmployeeActionsDropdownProps) {
  const [offboardDialogOpen, setOffboardDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Don't show dropdown if user is self or already deleted
  if (isSelf || isDeleted) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
            aria-label="Admin actions"
          >
            <MoreVertical className={ICON_SIZES.sm} />
            <span className="hidden sm:inline">Actions</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!isOffboarded && (
            <DropdownMenuItem
              onClick={() => setOffboardDialogOpen(true)}
              className="cursor-pointer"
            >
              <UserMinus className={`${ICON_SIZES.sm} mr-2`} />
              Offboard Employee
            </DropdownMenuItem>
          )}
          {!isOffboarded && <DropdownMenuSeparator />}
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <Trash2 className={`${ICON_SIZES.sm} mr-2`} />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <OffboardEmployeeDialog
        open={offboardDialogOpen}
        onOpenChange={setOffboardDialogOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        dateOfJoining={dateOfJoining}
      />

      {/* Reuse existing delete dialog logic but with controlled open state */}
      {deleteDialogOpen && (
        <DeleteUserDialogControlled
          userId={employeeId}
          userName={employeeName}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
        />
      )}
    </>
  );
}

// Wrapper to make DeleteUserButton controllable
function DeleteUserDialogControlled({
  userId,
  userName,
  open,
  onOpenChange,
}: {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DeleteUserDialogInner
      userId={userId}
      userName={userName}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

// Inline the delete dialog since we need controlled state
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function DeleteUserDialogInner({
  userId,
  userName,
  open,
  onOpenChange,
}: {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      toast.success('User deleted permanently');
      onOpenChange(false);
      router.push('/admin/employees');
      router.refresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user', { duration: 10000 });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Delete User Permanently</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{userName}</strong>. This action cannot be undone.
            Make sure the user has no assigned assets or subscriptions before deleting.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className={`${ICON_SIZES.sm} mr-2 animate-spin`} />
                Deleting...
              </>
            ) : (
              'Delete Permanently'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
