'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, X, GripVertical, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
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

const MODULES = [
  { value: 'LEAVE_REQUEST', label: 'Leave Requests' },
  { value: 'PURCHASE_REQUEST', label: 'Purchase Requests' },
  { value: 'ASSET_REQUEST', label: 'Asset Requests' },
];

const APPROVER_ROLES = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'HR_MANAGER', label: 'HR Manager' },
  { value: 'FINANCE_MANAGER', label: 'Finance Manager' },
  { value: 'DIRECTOR', label: 'Director' },
];

interface ApprovalLevel {
  levelOrder: number;
  approverRole: string;
}

export default function EditApprovalPolicyPage() {
  const router = useRouter();
  const params = useParams();
  const policyId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [module, setModule] = useState('LEAVE_REQUEST');
  const [isActive, setIsActive] = useState(true);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [minDays, setMinDays] = useState('');
  const [maxDays, setMaxDays] = useState('');
  const [priority, setPriority] = useState('0');
  const [levels, setLevels] = useState<ApprovalLevel[]>([]);

  const isLeaveModule = module === 'LEAVE_REQUEST';

  useEffect(() => {
    async function loadPolicy() {
      try {
        const response = await fetch(`/api/approval-policies/${policyId}`);
        if (!response.ok) {
          throw new Error('Failed to load policy');
        }
        const policy = await response.json();

        setName(policy.name);
        setModule(policy.module);
        setIsActive(policy.isActive);
        setMinAmount(policy.minAmount?.toString() || '');
        setMaxAmount(policy.maxAmount?.toString() || '');
        setMinDays(policy.minDays?.toString() || '');
        setMaxDays(policy.maxDays?.toString() || '');
        setPriority(policy.priority?.toString() || '0');
        setLevels(policy.levels.map((l: { levelOrder: number; approverRole: string }) => ({
          levelOrder: l.levelOrder,
          approverRole: l.approverRole,
        })));
      } catch {
        toast.error('Failed to load policy');
        router.push('/admin/settings/approvals');
      } finally {
        setIsLoading(false);
      }
    }
    loadPolicy();
  }, [policyId, router]);

  const addLevel = () => {
    if (levels.length >= 5) {
      toast.error('Maximum 5 approval levels allowed');
      return;
    }
    setLevels([...levels, { levelOrder: levels.length + 1, approverRole: 'MANAGER' }]);
  };

  const removeLevel = (index: number) => {
    if (levels.length <= 1) {
      toast.error('At least one approval level is required');
      return;
    }
    const newLevels = levels.filter((_, i) => i !== index);
    setLevels(newLevels.map((level, i) => ({ ...level, levelOrder: i + 1 })));
  };

  const updateLevelRole = (index: number, role: string) => {
    const newLevels = [...levels];
    newLevels[index].approverRole = role;
    setLevels(newLevels);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Policy name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/approval-policies/${policyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          isActive,
          minAmount: minAmount ? parseFloat(minAmount) : null,
          maxAmount: maxAmount ? parseFloat(maxAmount) : null,
          minDays: minDays ? parseInt(minDays) : null,
          maxDays: maxDays ? parseInt(maxDays) : null,
          priority: parseInt(priority) || 0,
          levels,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update policy');
      }

      toast.success('Approval policy updated');
      router.push('/admin/settings/approvals');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/approval-policies/${policyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete policy');
      }

      toast.success('Approval policy deleted');
      router.push('/admin/settings/approvals');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete policy');
    } finally {
      setIsDeleting(false);
    }
  };

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
        title="Edit Approval Policy"
        subtitle="Modify the approval chain configuration"
        breadcrumbs={[
          { label: 'Settings', href: '/admin/settings' },
          { label: 'Approvals', href: '/admin/settings/approvals' },
          { label: 'Edit' },
        ]}
        actions={
          <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Approval Policy?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this approval policy. Existing approval
                chains for pending requests will not be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        }
      />

      <PageContent>
        <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Policy Details</CardTitle>
            <CardDescription>
              Update the policy name and threshold criteria
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Policy Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., High Value Purchase Approval"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Module</Label>
                <Input value={MODULES.find(m => m.value === module)?.label || module} disabled />
                <p className="text-xs text-muted-foreground">Module cannot be changed</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {isLeaveModule ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="minDays">Minimum Days</Label>
                    <Input
                      id="minDays"
                      type="number"
                      min="0"
                      value={minDays}
                      onChange={(e) => setMinDays(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDays">Maximum Days</Label>
                    <Input
                      id="maxDays"
                      type="number"
                      min="0"
                      value={maxDays}
                      onChange={(e) => setMaxDays(e.target.value)}
                      placeholder="No limit"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="minAmount">Minimum Amount (QAR)</Label>
                    <Input
                      id="minAmount"
                      type="number"
                      min="0"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAmount">Maximum Amount (QAR)</Label>
                    <Input
                      id="maxAmount"
                      type="number"
                      min="0"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="No limit"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Higher priority policies are checked first
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Approval Chain</CardTitle>
            <CardDescription>
              Define the sequence of approvers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {levels.map((level, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <span className="w-8">#{level.levelOrder}</span>
                </div>
                <Select
                  value={level.approverRole}
                  onValueChange={(value) => updateLevelRole(index, value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVER_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLevel(index)}
                  disabled={levels.length <= 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addLevel}
              disabled={levels.length >= 5}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Level
            </Button>
          </CardContent>
        </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/settings/approvals">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </PageContent>
    </>
  );
}
