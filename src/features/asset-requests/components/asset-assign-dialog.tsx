/**
 * @file asset-assign-dialog.tsx
 * @description Dialog component for admins to assign assets to users
 * @module components/domains/operations/asset-requests
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { getDisplayEmail } from '@/lib/utils/user-display';

interface Asset {
  id: string;
  assetTag: string | null;
  model: string;
  brand: string | null;
  type: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface AssetAssignDialogProps {
  asset: Asset;
  trigger?: React.ReactNode;
}

export function AssetAssignDialog({ asset, trigger }: AssetAssignDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [assignmentDate, setAssignmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if users have been fetched
  const hasFetchedUsersRef = useRef(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users?active=true');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch users when dialog opens
  useEffect(() => {
    if (open && !hasFetchedUsersRef.current) {
      hasFetchedUsersRef.current = true;
      fetchUsers();
    }
  }, [open, fetchUsers]);

  const handleSubmit = async () => {
    if (!selectedUserId) {
      setError('Please select a user to assign the asset to');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Use the assign endpoint which handles approval workflow properly
      const response = await fetch(`/api/assets/${asset.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedMemberId: selectedUserId,
          notes: notes.trim() || undefined,
          assignmentDate: assignmentDate || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create assignment');
      }

      setOpen(false);
      setSelectedUserId('');
      setNotes('');
      setAssignmentDate(new Date().toISOString().split('T')[0]);

      // Show appropriate message based on response
      if (data.type === 'pending_acceptance') {
        toast.success(`Assignment pending acceptance by ${data.request?.member?.name || 'user'}`);
      } else if (data.type === 'direct_assignment') {
        toast.success('Asset assigned successfully');
      } else {
        toast.success(data.message || 'Asset assigned successfully');
      }

      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create assignment';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Assign to User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Asset</DialogTitle>
          <DialogDescription>
            Assign this asset to a user. They will receive a notification to accept or decline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm text-gray-700">Asset Details</h4>
            <div className="mt-2 space-y-1 text-sm">
              <p><span className="text-gray-500">Model:</span> {asset.model}</p>
              {asset.brand && <p><span className="text-gray-500">Brand:</span> {asset.brand}</p>}
              <p><span className="text-gray-500">Type:</span> {asset.type}</p>
              {asset.assetTag && <p><span className="text-gray-500">Asset Tag:</span> {asset.assetTag}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user">Assign to User *</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={isLoading || isSubmitting}
            >
              <SelectTrigger id="user">
                <SelectValue placeholder={isLoading ? 'Loading users...' : 'Select a user'} />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} {getDisplayEmail(user.email) && `(${getDisplayEmail(user.email)})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignmentDate">Assignment Date</Label>
            <Input
              id="assignmentDate"
              type="date"
              value={assignmentDate}
              onChange={(e) => setAssignmentDate(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">
              The date when the asset is/was assigned to the user.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes for User (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes or instructions for the user..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">
              These notes will be shown to the user when they accept/decline.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedUserId}>
            {isSubmitting ? 'Assigning...' : 'Assign Asset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
