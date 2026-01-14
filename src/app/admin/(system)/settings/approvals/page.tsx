import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';

import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Plus, Pencil } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Approval Policies | DAMP',
  description: 'Configure multi-level approval workflows',
};

const MODULE_LABELS = {
  LEAVE_REQUEST: 'Leave Requests',
  PURCHASE_REQUEST: 'Purchase Requests',
  ASSET_REQUEST: 'Asset Requests',
};

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  HR_MANAGER: 'HR Manager',
  FINANCE_MANAGER: 'Finance Manager',
  DIRECTOR: 'Director',
};

export default async function ApprovalPoliciesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.isAdmin) {
    redirect('/');
  }

  // Require organization context for tenant isolation
  if (!session.user.organizationId) {
    redirect('/');
  }

  const tenantId = session.user.organizationId;

  const policies = await prisma.approvalPolicy.findMany({
    where: { tenantId },
    include: {
      levels: {
        orderBy: { levelOrder: 'asc' },
      },
    },
    orderBy: [
      { module: 'asc' },
      { priority: 'desc' },
    ],
  });

  // Group policies by module
  const policyGroups = policies.reduce((groups, policy) => {
    const moduleKey = policy.module;
    if (!groups[moduleKey]) {
      groups[moduleKey] = [];
    }
    groups[moduleKey].push(policy);
    return groups;
  }, {} as Record<string, typeof policies>);

  return (
    <>
      <PageHeader
        title="Approval Policies"
        subtitle="Configure multi-level approval chains for leave, purchase, and asset requests"
        actions={
          <Button asChild>
            <Link href="/admin/settings/approvals/new">
              <Plus className="h-4 w-4 mr-2" />
              New Policy
            </Link>
          </Button>
        }
      />

      <PageContent>
      {policies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No approval policies configured. Requests will be sent to all admins.
            </p>
            <Button asChild>
              <Link href="/admin/settings/approvals/new">
                <Plus className="h-4 w-4 mr-2" />
                Create First Policy
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(policyGroups).map(([module, modulePolicies]) => (
            <div key={module}>
              <h2 className="text-lg font-semibold mb-4">
                {MODULE_LABELS[module as keyof typeof MODULE_LABELS] || module}
              </h2>
              <div className="space-y-4">
                {modulePolicies.map((policy) => (
                  <Card key={policy.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {policy.name}
                            {!policy.isActive && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {policy.module === 'LEAVE_REQUEST' ? (
                              <>
                                Days: {policy.minDays ?? 0} - {policy.maxDays ?? '∞'}
                              </>
                            ) : (
                              <>
                                Amount: QAR {policy.minAmount?.toString() ?? '0'} - {policy.maxAmount?.toString() ?? '∞'}
                              </>
                            )}
                            {' | Priority: '}{policy.priority}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/settings/approvals/${policy.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">Approval chain:</span>
                        {policy.levels.map((level, index) => (
                          <div key={level.id} className="flex items-center">
                            {index > 0 && <span className="mx-2 text-muted-foreground">→</span>}
                            <Badge variant="outline">
                              {ROLE_LABELS[level.approverRole] || level.approverRole}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      </PageContent>
    </>
  );
}
