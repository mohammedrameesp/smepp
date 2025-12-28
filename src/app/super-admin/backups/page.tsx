'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  Download,
  RefreshCw,
  Trash2,
  Upload,
  Clock,
  Building2,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FolderArchive,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Backup {
  type: 'full' | 'organization';
  organization?: string;
  filename: string;
  path: string;
  size: number;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface RestorePreview {
  metadata: {
    version: string;
    type: string;
    organizationName?: string;
    organizationSlug?: string;
    createdAt: string;
    description: string;
  };
  counts: Record<string, number>;
  warning: string;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Backup creation
  const [backupType, setBackupType] = useState<'full' | 'organization' | 'all'>('all');
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [createdBackups, setCreatedBackups] = useState<{ type: string; organization?: string; filename: string; path: string }[]>([]);

  // Restore dialog
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [restoreBackup, setRestoreBackup] = useState<Backup | null>(null);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteBackup, setDeleteBackup] = useState<Backup | null>(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/super-admin/backups');
      if (!response.ok) throw new Error('Failed to fetch backups');
      const data = await response.json();
      setBackups(data.backups || []);
      setOrganizations(data.organizations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setActionLoading('create');
    setError(null);
    setSuccess(null);
    setCreatedBackups([]);
    try {
      const response = await fetch('/api/super-admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: backupType,
          organizationId: backupType === 'organization' ? selectedOrg : undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to create backup');
      const data = await response.json();

      // Build paths for created backups
      const backupsWithPaths = (data.results || [])
        .filter((r: { success: boolean }) => r.success)
        .map((r: { type: string; organization?: string; filename: string }) => ({
          type: r.type,
          organization: r.organization,
          filename: r.filename,
          path: r.type === 'full' ? `full/${r.filename}` : `orgs/${r.organization}/${r.filename}`,
        }));

      setCreatedBackups(backupsWithPaths);
      setSuccess(`Backup created successfully: ${backupsWithPaths.length} backup(s)`);
      fetchBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setActionLoading(null);
    }
  };

  const downloadBackup = async (backup: Backup) => {
    setActionLoading(`download-${backup.path}`);
    try {
      const response = await fetch(`/api/super-admin/backups/${encodeURIComponent(backup.path)}`);
      if (!response.ok) throw new Error('Failed to download backup');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download backup');
    } finally {
      setActionLoading(null);
    }
  };

  const openRestoreDialog = async (backup: Backup) => {
    setRestoreBackup(backup);
    setRestorePreview(null);
    setRestoreDialog(true);
    setRestoreLoading(true);

    try {
      const response = await fetch('/api/super-admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: backup.path, mode: 'preview' }),
      });
      if (!response.ok) throw new Error('Failed to preview backup');
      const data = await response.json();
      setRestorePreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview backup');
      setRestoreDialog(false);
    } finally {
      setRestoreLoading(false);
    }
  };

  const executeRestore = async () => {
    if (!restoreBackup) return;
    setRestoreLoading(true);

    try {
      const response = await fetch('/api/super-admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: restoreBackup.path, mode: 'restore' }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to restore backup');
      }
      const data = await response.json();
      setSuccess(`Restore completed: ${data.results?.length || 0} tables restored`);
      setRestoreDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup');
    } finally {
      setRestoreLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteBackup) return;
    setActionLoading(`delete-${deleteBackup.path}`);

    try {
      const response = await fetch(`/api/super-admin/backups/${encodeURIComponent(deleteBackup.path)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete backup');
      setSuccess('Backup deleted successfully');
      fetchBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete backup');
    } finally {
      setActionLoading(null);
      setDeleteDialog(false);
      setDeleteBackup(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group backups by type
  const fullBackups = backups.filter(b => b.type === 'full');
  const orgBackups = backups.filter(b => b.type === 'organization');

  // Get unique organizations from backups
  const orgGroups = orgBackups.reduce((acc, backup) => {
    const org = backup.organization || 'unknown';
    if (!acc[org]) acc[org] = [];
    acc[org].push(backup);
    return acc;
  }, {} as Record<string, Backup[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Backup & Recovery</h1>
          <p className="text-slate-500 text-sm">Manage platform backups and disaster recovery</p>
        </div>
        <Button onClick={fetchBackups} variant="outline" className="gap-2" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
            Dismiss
          </Button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-green-700 flex-1">{success}</p>
            <Button variant="ghost" size="sm" onClick={() => { setSuccess(null); setCreatedBackups([]); }}>
              Dismiss
            </Button>
          </div>
          {createdBackups.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-sm text-green-700 mb-2">Download your backup(s):</p>
              <div className="flex flex-wrap gap-2">
                {createdBackups.map((backup) => (
                  <Button
                    key={backup.path}
                    size="sm"
                    variant="outline"
                    className="gap-2 bg-white"
                    onClick={() => downloadBackup({
                      type: backup.type as 'full' | 'organization',
                      organization: backup.organization,
                      filename: backup.filename,
                      path: backup.path,
                      size: 0,
                      createdAt: new Date().toISOString()
                    })}
                    disabled={actionLoading === `download-${backup.path}`}
                  >
                    {actionLoading === `download-${backup.path}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {backup.type === 'full' ? 'Full Platform' : backup.organization}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Create Backup
          </CardTitle>
          <CardDescription>
            Create a manual backup of the entire platform or specific organizations.
            Automatic backups run daily at 4:00 AM Qatar time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Backup Type</label>
              <Select value={backupType} onValueChange={(v) => setBackupType(v as typeof backupType)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Full + All Organizations</SelectItem>
                  <SelectItem value="full">Full Platform Only</SelectItem>
                  <SelectItem value="organization">Single Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {backupType === 'organization' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Organization</label>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} ({org.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={createBackup}
              disabled={actionLoading === 'create' || (backupType === 'organization' && !selectedOrg)}
              className="gap-2"
            >
              {actionLoading === 'create' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <HardDrive className="h-4 w-4" />
              )}
              Create Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Full Platform Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderArchive className="h-5 w-5" />
            Full Platform Backups
          </CardTitle>
          <CardDescription>
            Complete platform backups including all organizations and data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : fullBackups.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No full backups found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fullBackups.slice(0, 10).map(backup => (
                  <TableRow key={backup.path}>
                    <TableCell className="font-medium">{backup.filename}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatDate(backup.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>{formatSize(backup.size)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadBackup(backup)}
                          disabled={actionLoading === `download-${backup.path}`}
                        >
                          {actionLoading === `download-${backup.path}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setDeleteBackup(backup); setDeleteDialog(true); }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Organization Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Backups
          </CardTitle>
          <CardDescription>
            Individual organization backups - can be restored independently
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : Object.keys(orgGroups).length === 0 ? (
            <p className="text-slate-500 text-center py-8">No organization backups found</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(orgGroups).map(([orgName, orgBackupList]) => (
                <div key={orgName}>
                  <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {orgName}
                    <Badge variant="secondary">{orgBackupList.length} backups</Badge>
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgBackupList.slice(0, 5).map(backup => (
                        <TableRow key={backup.path}>
                          <TableCell className="font-medium">{backup.filename}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              {formatDate(backup.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>{formatSize(backup.size)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadBackup(backup)}
                                disabled={actionLoading === `download-${backup.path}`}
                              >
                                {actionLoading === `download-${backup.path}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRestoreDialog(backup)}
                                className="gap-1"
                              >
                                <Upload className="h-4 w-4" />
                                Restore
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setDeleteBackup(backup); setDeleteDialog(true); }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      <Dialog open={restoreDialog} onOpenChange={setRestoreDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              {restoreBackup?.filename}
            </DialogDescription>
          </DialogHeader>

          {restoreLoading && !restorePreview ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : restorePreview ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">Warning</p>
                    <p className="text-sm text-amber-700">{restorePreview.warning}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Backup Details</h4>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Version</dt>
                    <dd>{restorePreview.metadata.version}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Created</dt>
                    <dd>{formatDate(restorePreview.metadata.createdAt)}</dd>
                  </div>
                  {restorePreview.metadata.organizationName && (
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Organization</dt>
                      <dd>{restorePreview.metadata.organizationName}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h4 className="font-medium mb-2">Data Counts</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(restorePreview.counts).map(([key, value]) => (
                    <div key={key} className="flex justify-between bg-slate-50 px-3 py-1.5 rounded">
                      <span className="text-slate-500 capitalize">{key}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={executeRestore}
              disabled={restoreLoading || !restorePreview}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {restoreLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Restore Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Backup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this backup? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteBackup && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="font-medium">{deleteBackup.filename}</p>
              <p className="text-sm text-slate-500">{formatDate(deleteBackup.createdAt)}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={actionLoading?.startsWith('delete-')}
              variant="destructive"
            >
              {actionLoading?.startsWith('delete-') ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
