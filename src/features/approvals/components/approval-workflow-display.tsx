/**
 * @file approval-workflow-display.tsx
 * @description Visual display of approval workflow configuration.
 *              Shows current policies or default workflow when none exist.
 * @module features/approvals/components
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, ArrowRight, Info, Settings, FileText, Package, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

// Role display names
const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Line Manager',
  HR_MANAGER: 'HR',
  FINANCE_MANAGER: 'Finance',
  DIRECTOR: 'Director',
};

// Module display config
const MODULE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  LEAVE_REQUEST: { label: 'Leave Requests', icon: FileText },
  PURCHASE_REQUEST: { label: 'Purchase Requests', icon: ShoppingCart },
  ASSET_REQUEST: { label: 'Asset Requests', icon: Package },
};

// Default policies (client-safe copy from default-policies.ts)
const DEFAULT_POLICIES: Record<string, ApprovalPolicy[]> = {
  LEAVE_REQUEST: [
    {
      id: 'default-leave-short',
      name: 'Short Leave (up to 2 days)',
      module: 'LEAVE_REQUEST',
      minDays: 0,
      maxDays: 2,
      minAmount: null,
      maxAmount: null,
      isActive: true,
      isDefault: true,
      levels: [{ id: 'd1', levelOrder: 1, approverRole: 'MANAGER' }],
    },
    {
      id: 'default-leave-extended',
      name: 'Extended Leave (3+ days)',
      module: 'LEAVE_REQUEST',
      minDays: 3,
      maxDays: null,
      minAmount: null,
      maxAmount: null,
      isActive: true,
      isDefault: true,
      levels: [
        { id: 'd2', levelOrder: 1, approverRole: 'MANAGER' },
        { id: 'd3', levelOrder: 2, approverRole: 'HR_MANAGER' },
        { id: 'd4', levelOrder: 3, approverRole: 'DIRECTOR' },
      ],
    },
  ],
  PURCHASE_REQUEST: [
    {
      id: 'default-purchase-small',
      name: 'Small Purchase (up to 5,000 QAR)',
      module: 'PURCHASE_REQUEST',
      minDays: null,
      maxDays: null,
      minAmount: '0',
      maxAmount: '5000',
      isActive: true,
      isDefault: true,
      levels: [{ id: 'dp1', levelOrder: 1, approverRole: 'MANAGER' }],
    },
    {
      id: 'default-purchase-medium',
      name: 'Medium Purchase (5,001 - 50,000 QAR)',
      module: 'PURCHASE_REQUEST',
      minDays: null,
      maxDays: null,
      minAmount: '5001',
      maxAmount: '50000',
      isActive: true,
      isDefault: true,
      levels: [
        { id: 'dp2', levelOrder: 1, approverRole: 'MANAGER' },
        { id: 'dp3', levelOrder: 2, approverRole: 'FINANCE_MANAGER' },
      ],
    },
    {
      id: 'default-purchase-large',
      name: 'Large Purchase (50,001+ QAR)',
      module: 'PURCHASE_REQUEST',
      minDays: null,
      maxDays: null,
      minAmount: '50001',
      maxAmount: null,
      isActive: true,
      isDefault: true,
      levels: [
        { id: 'dp4', levelOrder: 1, approverRole: 'MANAGER' },
        { id: 'dp5', levelOrder: 2, approverRole: 'FINANCE_MANAGER' },
        { id: 'dp6', levelOrder: 3, approverRole: 'DIRECTOR' },
      ],
    },
  ],
  ASSET_REQUEST: [
    {
      id: 'default-asset-standard',
      name: 'Standard Asset (up to 10,000 QAR)',
      module: 'ASSET_REQUEST',
      minDays: null,
      maxDays: null,
      minAmount: '0',
      maxAmount: '10000',
      isActive: true,
      isDefault: true,
      levels: [{ id: 'da1', levelOrder: 1, approverRole: 'MANAGER' }],
    },
    {
      id: 'default-asset-high',
      name: 'High-Value Asset (10,001+ QAR)',
      module: 'ASSET_REQUEST',
      minDays: null,
      maxDays: null,
      minAmount: '10001',
      maxAmount: null,
      isActive: true,
      isDefault: true,
      levels: [
        { id: 'da2', levelOrder: 1, approverRole: 'MANAGER' },
        { id: 'da3', levelOrder: 2, approverRole: 'FINANCE_MANAGER' },
        { id: 'da4', levelOrder: 3, approverRole: 'DIRECTOR' },
      ],
    },
  ],
};

interface ApprovalLevel {
  id: string;
  levelOrder: number;
  approverRole: string;
}

interface ApprovalPolicy {
  id: string;
  name: string;
  module: string;
  minDays: number | null;
  maxDays: number | null;
  minAmount: string | null;
  maxAmount: string | null;
  isActive: boolean;
  isDefault?: boolean;
  levels: ApprovalLevel[];
}

interface ApprovalWorkflowDisplayProps {
  enabledModules: string[];
  className?: string;
}

function getThresholdText(policy: ApprovalPolicy): string {
  // For leave policies (days-based)
  if (policy.minDays !== null || policy.maxDays !== null) {
    if (policy.minDays === 0 && policy.maxDays !== null) {
      return `Up to ${policy.maxDays} day${policy.maxDays > 1 ? 's' : ''}`;
    }
    if (policy.maxDays === null && policy.minDays !== null) {
      return `${policy.minDays}+ days`;
    }
    if (policy.minDays !== null && policy.maxDays !== null) {
      return `${policy.minDays}-${policy.maxDays} days`;
    }
  }

  // For purchase/asset policies (amount-based)
  if (policy.minAmount !== null || policy.maxAmount !== null) {
    const minAmt = policy.minAmount ? Number(policy.minAmount) : null;
    const maxAmt = policy.maxAmount ? Number(policy.maxAmount) : null;

    if (minAmt === null && maxAmt !== null) {
      return `Up to ${maxAmt.toLocaleString()} QAR`;
    }
    if (maxAmt === null && minAmt !== null) {
      return `${minAmt.toLocaleString()}+ QAR`;
    }
    if (minAmt !== null && maxAmt !== null) {
      return `${minAmt.toLocaleString()}-${maxAmt.toLocaleString()} QAR`;
    }
  }

  return 'All requests';
}

function ApprovalChain({ levels }: { levels: ApprovalLevel[] }) {
  const sortedLevels = [...levels].sort((a, b) => a.levelOrder - b.levelOrder);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {sortedLevels.map((level, index) => (
        <div key={level.id} className="flex items-center">
          {index > 0 && <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />}
          <Badge variant="outline" className="font-normal">
            {ROLE_LABELS[level.approverRole] || level.approverRole}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function PolicyCard({ policy }: { policy: ApprovalPolicy }) {
  return (
    <div className="p-3 border rounded-lg bg-slate-50/50">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{policy.name}</span>
        <Badge variant="secondary" className="text-xs">
          {getThresholdText(policy)}
        </Badge>
      </div>
      <ApprovalChain levels={policy.levels} />
    </div>
  );
}

function ModuleSection({
  module,
  policies,
  isDefault,
}: {
  module: string;
  policies: ApprovalPolicy[];
  isDefault: boolean;
}) {
  const config = MODULE_CONFIG[module];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium">{config.label}</h4>
        </div>
        {isDefault && (
          <Badge variant="secondary" className="text-xs">
            Default
          </Badge>
        )}
      </div>
      <div className="space-y-2 pl-6">
        {policies.length > 0 ? (
          policies.map((policy) => <PolicyCard key={policy.id} policy={policy} />)
        ) : (
          <p className="text-sm text-muted-foreground italic">No policies configured</p>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ApprovalWorkflowDisplay({ enabledModules, className }: ApprovalWorkflowDisplayProps) {
  const [policies, setPolicies] = useState<ApprovalPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPolicies() {
      try {
        const res = await fetch('/api/approval-policies?isActive=true');
        if (res.ok) {
          const data = await res.json();
          setPolicies(data);
        } else {
          setError('Failed to load policies');
        }
      } catch (err) {
        console.error('Failed to fetch policies:', err);
        setError('Failed to load policies');
      } finally {
        setLoading(false);
      }
    }
    fetchPolicies();
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  // Map enabled module names to API module names
  const moduleMapping: Record<string, string> = {
    leave: 'LEAVE_REQUEST',
    'purchase-requests': 'PURCHASE_REQUEST',
    assets: 'ASSET_REQUEST',
  };

  const enabledApiModules = enabledModules
    .map((m) => moduleMapping[m])
    .filter(Boolean);

  // Group policies by module and track which use defaults
  const policiesByModule: Record<string, ApprovalPolicy[]> = {};
  const modulesUsingDefaults: Set<string> = new Set();

  for (const module of enabledApiModules) {
    const modulePolicies = policies.filter((p) => p.module === module);

    if (modulePolicies.length === 0 && DEFAULT_POLICIES[module]) {
      // No custom policies - use defaults
      policiesByModule[module] = DEFAULT_POLICIES[module];
      modulesUsingDefaults.add(module);
    } else {
      policiesByModule[module] = modulePolicies;
    }
  }

  const hasAnyDefaults = modulesUsingDefaults.size > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Approval Workflows
        </CardTitle>
        <CardDescription>
          Current approval chain configuration for your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Render each enabled module */}
            {enabledApiModules.map((module) => (
              <ModuleSection
                key={module}
                module={module}
                policies={policiesByModule[module] || []}
                isDefault={modulesUsingDefaults.has(module)}
              />
            ))}

            {/* Info alert about auto-skip */}
            {hasAnyDefaults && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Using default approval workflow for some modules. Steps are auto-skipped if no approver
                  is available (e.g., no line manager assigned to the employee).
                </AlertDescription>
              </Alert>
            )}

            {/* Customize button */}
            <div className="flex justify-end pt-2">
              <Button asChild variant="outline">
                <Link href="/admin/settings/approvals">
                  <Settings className="h-4 w-4 mr-2" />
                  Customize Policies
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
