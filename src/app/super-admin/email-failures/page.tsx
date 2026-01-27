'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MailWarning,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  AlertTriangle,
  Loader2,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/core/datetime';
import { toast } from 'sonner';

interface EmailFailure {
  id: string;
  tenantId: string | null;
  module: string;
  action: string;
  organizationName: string | null;
  organizationSlug: string | null;
  recipientEmail: string;
  recipientName: string | null;
  emailSubject: string;
  error: string;
  errorCode: string | null;
  metadata: Record<string, unknown> | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  tenant?: {
    name: string;
    slug: string;
  } | null;
}

interface Stats {
  total: number;
  unresolved: number;
  last24Hours: number;
  byModule: { module: string; count: number }[];
}

interface Tenant {
  tenantId: string;
  organizationName: string | null;
  organizationSlug: string | null;
}

const MODULE_COLORS: Record<string, string> = {
  assets: 'bg-blue-100 text-blue-800',
  'asset-requests': 'bg-purple-100 text-purple-800',
  leave: 'bg-green-100 text-green-800',
  'spend-requests': 'bg-orange-100 text-orange-800',
  suppliers: 'bg-cyan-100 text-cyan-800',
  users: 'bg-pink-100 text-pink-800',
  hr: 'bg-amber-100 text-amber-800',
  auth: 'bg-red-100 text-red-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function EmailFailuresPage() {
  const [failures, setFailures] = useState<EmailFailure[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [moduleFilter, setModuleFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [resolvedFilter, setResolvedFilter] = useState('false'); // Default to unresolved
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [resolveDialog, setResolveDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const fetchFailures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });

      if (moduleFilter !== 'all') params.set('module', moduleFilter);
      if (tenantFilter !== 'all') params.set('tenantId', tenantFilter);
      if (resolvedFilter !== 'all') params.set('resolved', resolvedFilter);

      const response = await fetch(`/api/super-admin/email-failures?${params}`);
      if (!response.ok) throw new Error('Failed to fetch email failures');

      const data = await response.json();
      setFailures(data.failures);
      setStats(data.stats);
      setTenants(data.tenants);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [page, moduleFilter, tenantFilter, resolvedFilter]);

  useEffect(() => {
    fetchFailures();
  }, [fetchFailures]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(failures.map(f => f.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleResolve = async (resolved: boolean) => {
    if (selectedIds.size === 0) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/super-admin/email-failures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          resolved,
          resolutionNotes: resolved ? resolutionNotes : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update failures');

      setSelectedIds(new Set());
      setResolveDialog(false);
      setResolutionNotes('');
      fetchFailures();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOld = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/super-admin/email-failures?olderThanDays=30', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete old failures');

      const data = await response.json();
      setDeleteDialog(false);
      fetchFailures();
      toast.success(`Deleted ${data.deleted} resolved failures older than 30 days`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const resetFilters = () => {
    setModuleFilter('all');
    setTenantFilter('all');
    setResolvedFilter('false');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Failures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MailWarning className={`${ICON_SIZES.md} text-gray-400`} />
              <span className="text-2xl font-bold">{stats?.total || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Unresolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`${ICON_SIZES.md} text-amber-500`} />
              <span className="text-2xl font-bold text-amber-600">{stats?.unresolved || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Last 24 Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className={`${ICON_SIZES.md} text-blue-500`} />
              <span className="text-2xl font-bold">{stats?.last24Hours || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Top Module</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className={`${ICON_SIZES.md} text-purple-500`} />
              <span className="text-lg font-medium capitalize">
                {stats?.byModule?.[0]?.module || 'N/A'}
              </span>
              {stats?.byModule?.[0]?.count && (
                <Badge variant="secondary">{stats.byModule[0].count}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className={`${ICON_SIZES.sm} text-gray-500`} />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="assets">Assets</SelectItem>
                <SelectItem value="asset-requests">Asset Requests</SelectItem>
                <SelectItem value="leave">Leave</SelectItem>
                <SelectItem value="spend-requests">Spend Requests</SelectItem>
                <SelectItem value="suppliers">Suppliers</SelectItem>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tenantFilter} onValueChange={(v) => { setTenantFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Tenants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {tenants.map(t => (
                  <SelectItem key={t.tenantId} value={t.tenantId}>
                    {t.organizationName || t.organizationSlug || t.tenantId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resolvedFilter} onValueChange={(v) => { setResolvedFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="false">Unresolved</SelectItem>
                <SelectItem value="true">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset
            </Button>

            <div className="flex-1" />

            <Button variant="outline" size="sm" onClick={fetchFailures} disabled={loading}>
              <RefreshCw className={`${ICON_SIZES.sm} mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {selectedIds.size > 0 && (
              <>
                <Button
                  size="sm"
                  onClick={() => setResolveDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className={`${ICON_SIZES.sm} mr-2`} />
                  Resolve ({selectedIds.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolve(false)}
                  disabled={actionLoading}
                >
                  <XCircle className={`${ICON_SIZES.sm} mr-2`} />
                  Unresolve
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialog(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className={`${ICON_SIZES.sm} mr-2`} />
              Clean Up
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className={`${ICON_SIZES.xl} animate-spin text-gray-400`} />
            </div>
          ) : failures.length === 0 ? (
            <div className="text-center py-12">
              <MailWarning className={`${ICON_SIZES['3xl']} mx-auto text-gray-300 mb-4`} />
              <p className="text-gray-500">No email failures found</p>
              <p className="text-gray-400 text-sm mt-1">
                {resolvedFilter === 'false' ? 'All failures have been resolved!' : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === failures.length && failures.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failures.map((failure) => (
                      <TableRow key={failure.id} className={failure.resolved ? 'bg-gray-50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(failure.id)}
                            onCheckedChange={(checked) => handleSelectOne(failure.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={MODULE_COLORS[failure.module] || MODULE_COLORS.other}>
                            {failure.module}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">{failure.action}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {failure.tenant?.name || failure.organizationName || '-'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {failure.tenant?.slug || failure.organizationSlug || ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] truncate" title={failure.recipientEmail}>
                            {failure.recipientName || failure.recipientEmail}
                          </div>
                          {failure.recipientName && (
                            <div className="text-xs text-gray-500 truncate" title={failure.recipientEmail}>
                              {failure.recipientEmail}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={failure.emailSubject}>
                            {failure.emailSubject}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate text-red-600 text-sm" title={failure.error}>
                            {failure.error}
                          </div>
                        </TableCell>
                        <TableCell>
                          {failure.resolved ? (
                            <div>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Resolved
                              </Badge>
                              {failure.resolvedBy && (
                                <div className="text-xs text-gray-500 mt-1">
                                  by {failure.resolvedBy}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="destructive">Unresolved</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(failure.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/super-admin/email-failures/${failure.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className={ICON_SIZES.sm} />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className={ICON_SIZES.sm} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Email Failures</DialogTitle>
            <DialogDescription>
              Mark {selectedIds.size} failure(s) as resolved. Optionally add notes about the resolution.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Resolution notes (optional)..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleResolve(true)}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? <Loader2 className={`${ICON_SIZES.sm} animate-spin mr-2`} /> : null}
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clean Up Old Failures</DialogTitle>
            <DialogDescription>
              This will permanently delete all resolved failures older than 30 days. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOld}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className={`${ICON_SIZES.sm} animate-spin mr-2`} /> : null}
              Delete Old Failures
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
