import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';

import { prisma } from '@/lib/core/prisma';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ArrowRight, Calendar } from 'lucide-react';
import Link from 'next/link';
import { DelegationActions } from './delegation-actions';

export const metadata: Metadata = {
  title: 'Approval Delegations | DAMP',
  description: 'Manage approval delegations',
};

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  HR_MANAGER: 'HR Manager',
  FINANCE_MANAGER: 'Finance Manager',
  DIRECTOR: 'Director',
  ADMIN: 'Admin',
};

export default async function DelegationsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.teamMemberRole !== 'ADMIN') {
    redirect('/');
  }

  const delegations = await prisma.approverDelegation.findMany({
    include: {
      delegator: {
        select: { id: true, name: true, email: true, role: true },
      },
      delegatee: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: [
      { isActive: 'desc' },
      { endDate: 'desc' },
    ],
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Delegations</h1>
          <p className="text-muted-foreground">
            Manage temporary delegation of approval authority
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/settings/delegations/new">
            <Plus className="h-4 w-4 mr-2" />
            New Delegation
          </Link>
        </Button>
      </div>

      {delegations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No delegations configured. Delegations allow users to temporarily approve requests on behalf of others.
            </p>
            <Button asChild>
              <Link href="/admin/settings/delegations/new">
                <Plus className="h-4 w-4 mr-2" />
                Create First Delegation
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active & Recent Delegations</CardTitle>
            <CardDescription>
              Users who can approve on behalf of others
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delegator</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Delegatee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delegations.map((delegation) => {
                  const isCurrentlyActive =
                    delegation.isActive &&
                    delegation.startDate <= now &&
                    delegation.endDate >= now;
                  const isPast = delegation.endDate < now;
                  const isFuture = delegation.startDate > now;

                  return (
                    <TableRow key={delegation.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {delegation.delegator.name || delegation.delegator.email}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {ROLE_LABELS[delegation.delegator.role] || delegation.delegator.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {delegation.delegatee.name || delegation.delegatee.email}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {ROLE_LABELS[delegation.delegatee.role] || delegation.delegatee.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(delegation.startDate, 'MMM d')} -{' '}
                          {format(delegation.endDate, 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {!delegation.isActive ? (
                          <Badge variant="secondary">Inactive</Badge>
                        ) : isCurrentlyActive ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : isPast ? (
                          <Badge variant="secondary">Expired</Badge>
                        ) : isFuture ? (
                          <Badge className="bg-blue-100 text-blue-700">Scheduled</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="text-sm text-muted-foreground truncate block">
                          {delegation.reason || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DelegationActions delegation={delegation} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
