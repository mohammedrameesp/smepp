'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';
import { APPROVER_ROLES } from '@/features/approvals';
import Link from 'next/link';
import { toast } from 'sonner';

const MODULES = [
  { value: 'LEAVE_REQUEST', label: 'Leave Requests' },
  { value: 'SPEND_REQUEST', label: 'Spend Requests' },
  { value: 'ASSET_REQUEST', label: 'Asset Requests' },
];

interface ApprovalLevel {
  levelOrder: number;
  approverRole: string;
}

export default function NewApprovalPolicyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [module, setModule] = useState('LEAVE_REQUEST');
  const [isActive, setIsActive] = useState(true);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [minDays, setMinDays] = useState('');
  const [maxDays, setMaxDays] = useState('');
  const [priority, setPriority] = useState('0');
  const [levels, setLevels] = useState<ApprovalLevel[]>([
    { levelOrder: 1, approverRole: 'MANAGER' },
  ]);

  const isLeaveModule = module === 'LEAVE_REQUEST';

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
    // Reorder levels
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
      const response = await fetch('/api/approval-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          module,
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
        throw new Error(data.error || 'Failed to create policy');
      }

      toast.success('Approval policy created');
      router.push('/admin/settings/approvals');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="New Approval Policy"
        subtitle="Create a new multi-level approval chain"
        breadcrumbs={[
          { label: 'Settings', href: '/admin/settings' },
          { label: 'Approvals', href: '/admin/settings/approvals' },
          { label: 'New Policy' },
        ]}
      />

      <PageContent>
        <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Policy Details</CardTitle>
            <CardDescription>
              Define the policy name, module, and threshold criteria
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
                <Label htmlFor="module">Module</Label>
                <Select value={module} onValueChange={setModule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              Define the sequence of approvers. Each level must approve before moving to the next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {levels.map((level, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className={ICON_SIZES.sm} />
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
                  <X className={ICON_SIZES.sm} />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addLevel}
              disabled={levels.length >= 5}
            >
              <Plus className={`${ICON_SIZES.sm} mr-2`} />
              Add Level
            </Button>
          </CardContent>
        </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/settings/approvals">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Policy'}
            </Button>
          </div>
        </form>
      </PageContent>
    </>
  );
}
