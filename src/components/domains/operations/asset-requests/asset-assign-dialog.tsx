'use client';

import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, UserPlus } from 'lucide-react';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch users when dialog opens
  useEffect(() => {
    if (open && users.length === 0) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
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
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      setError('Please select a user to assign the asset to');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/asset-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          type: 'ADMIN_ASSIGNMENT',
          userId: selectedUserId,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create assignment');
      }

      setOpen(false);
      setSelectedUserId('');
      setNotes('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
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
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email} {user.name && `(${user.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
