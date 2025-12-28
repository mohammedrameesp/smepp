'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

const APPROVER_ROLES = ['MANAGER', 'HR_MANAGER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'];

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  HR_MANAGER: 'HR Manager',
  FINANCE_MANAGER: 'Finance Manager',
  DIRECTOR: 'Director',
  ADMIN: 'Admin',
};

export default function NewDelegationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const [delegatorId, setDelegatorId] = useState('');
  const [delegateeId, setDelegateeId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [reason, setReason] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Load users with approver roles
  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch('/api/users?roles=' + APPROVER_ROLES.join(','));
        if (!response.ok) {
          throw new Error('Failed to load users');
        }
        const data = await response.json();
        setUsers(data.users || data);
      } catch (error) {
        toast.error('Failed to load users');
      } finally {
        setIsLoading(false);
      }
    }
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!delegatorId || !delegateeId) {
      toast.error('Both delegator and delegatee are required');
      return;
    }

    if (delegatorId === delegateeId) {
      toast.error('Delegator and delegatee must be different users');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date must be before end date');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegatorId,
          delegateeId,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          reason: reason.trim() || undefined,
          isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create delegation');
      }

      toast.success('Delegation created');
      router.push('/admin/settings/delegations');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create delegation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter users for delegator/delegatee selection
  const approverUsers = users.filter((u) => APPROVER_ROLES.includes(u.role));
  const delegatorUser = approverUsers.find((u) => u.id === delegatorId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="New Delegation"
        subtitle="Allow a user to approve requests on behalf of another"
        breadcrumbs={[
          { label: 'Settings', href: '/admin/settings' },
          { label: 'Delegations', href: '/admin/settings/delegations' },
          { label: 'New Delegation' },
        ]}
      />

      <PageContent>
        <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Delegation Details</CardTitle>
            <CardDescription>
              The delegatee will be able to approve requests that require the delegator&apos;s role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="delegator">Delegator (Absent User)</Label>
                <Select value={delegatorId} onValueChange={setDelegatorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who is delegating..." />
                  </SelectTrigger>
                  <SelectContent>
                    {approverUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <span>{user.name || user.email}</span>
                          <span className="text-xs text-muted-foreground">
                            ({ROLE_LABELS[user.role] || user.role})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The user who will be absent and needs someone to approve on their behalf
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delegatee">Delegatee (Acting User)</Label>
                <Select value={delegateeId} onValueChange={setDelegateeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who will approve..." />
                  </SelectTrigger>
                  <SelectContent>
                    {approverUsers
                      .filter((u) => u.id !== delegatorId)
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>{user.name || user.email}</span>
                            <span className="text-xs text-muted-foreground">
                              ({ROLE_LABELS[user.role] || user.role})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The user who will approve requests on behalf of the delegator
                </p>
              </div>
            </div>

            {delegatorUser && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Note:</strong> The delegatee will be able to approve requests that require the{' '}
                  <strong>{ROLE_LABELS[delegatorUser.role] || delegatorUser.role}</strong> role.
                </p>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Annual leave, Business trip, etc."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="isActive">Active immediately</Label>
            </div>
          </CardContent>
        </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/settings/delegations">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Delegation'}
            </Button>
          </div>
        </form>
      </PageContent>
    </>
  );
}
