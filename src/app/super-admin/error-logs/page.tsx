'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
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
  Bug,
  Monitor,
  Server,
} from 'lucide-react';
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

interface ErrorLog {
  id: string;
  tenantId: string | null;
  type: string;
  source: string;
  action: string | null;
  requestId: string | null;
  method: string | null;
  path: string | null;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  message: string;
  stack: string | null;
  statusCode: number | null;
  errorCode: string | null;
  metadata: Record<string, unknown> | null;
  userAgent: string | null;
  severity: string;
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
  critical: number;
  last24Hours: number;
  byType: { type: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
}

interface Tenant {
  tenantId: string;
  name: string | null;
  slug: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  API_ERROR: 'bg-red-100 text-red-800',
  CLIENT_ERROR: 'bg-orange-100 text-orange-800',
  SERVICE_ERROR: 'bg-purple-100 text-purple-800',
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  API_ERROR: Server,
  CLIENT_ERROR: Monitor,
  SERVICE_ERROR: Bug,
};

const SEVERITY_COLORS: Record<string, string> = {
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-red-600 text-white border-red-600',
};

export default function ErrorLogsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
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

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });

      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (tenantFilter !== 'all') params.set('tenantId', tenantFilter);
      if (resolvedFilter !== 'all') params.set('resolved', resolvedFilter);

      const response = await fetch(`/api/super-admin/error-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch error logs');

      const data = await response.json();
      setErrors(data.errors);
      setStats(data.stats);
      setTenants(data.tenants);
      setSources(data.sources);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, sourceFilter, severityFilter, tenantFilter, resolvedFilter]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(errors.map(e => e.id)));
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
      const response = await fetch('/api/super-admin/error-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          resolved,
          resolutionNotes: resolved ? resolutionNotes : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update errors');

      setSelectedIds(new Set());
      setResolveDialog(false);
      setResolutionNotes('');
      fetchErrors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteResolved = async (deleteAll: boolean) => {
    setActionLoading(true);
    try {
      const url = deleteAll
        ? '/api/super-admin/error-logs?all=true'
        : '/api/super-admin/error-logs?olderThanDays=30';

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete errors');

      const data = await response.json();
      setDeleteDialog(false);
      fetchErrors();
      toast.success(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const resetFilters = () => {
    setTypeFilter('all');
    setSourceFilter('all');
    setSeverityFilter('all');
    setTenantFilter('all');
    setResolvedFilter('false');
    setPage(1);
  };

  const TypeIcon = ({ type }: { type: string }) => {
    const Icon = TYPE_ICONS[type] || Bug;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-gray-400" />
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
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold text-amber-600">{stats?.unresolved || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Critical (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{stats?.critical || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Last 24 Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats?.last24Hours || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="API_ERROR">API Error</SelectItem>
                <SelectItem value="CLIENT_ERROR">Client Error</SelectItem>
                <SelectItem value="SERVICE_ERROR">Service Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
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
                    {t.name || t.slug || t.tenantId}
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

            <Button variant="outline" size="sm" onClick={fetchErrors} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {selectedIds.size > 0 && (
              <>
                <Button
                  size="sm"
                  onClick={() => setResolveDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve ({selectedIds.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolve(false)}
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
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
              <Trash2 className="h-4 w-4 mr-2" />
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
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : errors.length === 0 ? (
            <div className="text-center py-12">
              <AlertOctagon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No error logs found</p>
              <p className="text-gray-400 text-sm mt-1">
                {resolvedFilter === 'false' ? 'All errors have been resolved!' : 'Try adjusting your filters'}
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
                          checked={selectedIds.size === errors.length && errors.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((err) => (
                      <TableRow key={err.id} className={err.resolved ? 'bg-gray-50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(err.id)}
                            onCheckedChange={(checked) => handleSelectOne(err.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={TYPE_COLORS[err.type] || TYPE_COLORS.API_ERROR}>
                              <TypeIcon type={err.type} />
                              <span className="ml-1">{err.type.replace('_', ' ')}</span>
                            </Badge>
                          </div>
                          {err.method && err.path && (
                            <div className="text-xs text-gray-500 mt-1 font-mono">
                              {err.method} {err.path.length > 30 ? err.path.substring(0, 30) + '...' : err.path}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{err.source}</div>
                          {err.action && (
                            <div className="text-xs text-gray-500">{err.action}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {err.tenant?.name || '-'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {err.tenant?.slug || ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[250px] truncate text-sm" title={err.message}>
                            {err.message}
                          </div>
                          {err.userEmail && (
                            <div className="text-xs text-gray-500 mt-1">{err.userEmail}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={SEVERITY_COLORS[err.severity] || SEVERITY_COLORS.error}>
                            {err.severity}
                          </Badge>
                          {err.statusCode && (
                            <div className="text-xs text-gray-500 mt-1">HTTP {err.statusCode}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {err.resolved ? (
                            <div>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Resolved
                              </Badge>
                              {err.resolvedBy && (
                                <div className="text-xs text-gray-500 mt-1">
                                  by {err.resolvedBy}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="destructive">Unresolved</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(err.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/super-admin/error-logs/${err.id}`}>
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
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
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
            <DialogTitle>Resolve Errors</DialogTitle>
            <DialogDescription>
              Mark {selectedIds.size} error(s) as resolved. Optionally add notes about the resolution.
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
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clean Up Resolved Errors</DialogTitle>
            <DialogDescription>
              Choose how to clean up resolved errors. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              onClick={() => handleDeleteResolved(false)}
              disabled={actionLoading}
              className="justify-start"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete resolved errors older than 30 days
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteResolved(true)}
              disabled={actionLoading}
              className="justify-start"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete ALL resolved errors
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
