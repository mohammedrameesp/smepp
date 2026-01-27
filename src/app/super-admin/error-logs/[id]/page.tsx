'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertOctagon,
  Building2,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  FileText,
  Code,
  Globe,
  Server,
  Monitor,
  Bug,
} from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/core/datetime';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

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
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  critical: 'bg-red-600 text-white',
};

export default function ErrorLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [error, setError] = useState<ErrorLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Resolve dialog
  const [resolveDialog, setResolveDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchError_();
  }, [params.id]);

  const fetchError_ = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(`/api/super-admin/error-logs/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setFetchError('Error log not found');
        } else {
          throw new Error('Failed to fetch');
        }
        return;
      }
      const data = await response.json();
      setError(data.error);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (resolved: boolean) => {
    if (!error) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/super-admin/error-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [error.id],
          resolved,
          resolutionNotes: resolved ? resolutionNotes : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setResolveDialog(false);
      setResolutionNotes('');
      fetchError_();
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const TypeIcon = ({ type }: { type: string }) => {
    const Icon = TYPE_ICONS[type] || Bug;
    return <Icon className={ICON_SIZES.sm} />;
  };

  const copyErrorDetails = async () => {
    if (!error) return;
    const lines = [
      `Error: ${error.message}`,
      `Path: ${error.method || 'N/A'} ${error.path || 'N/A'}`,
      `Source: ${error.source}${error.action ? ` → ${error.action}` : ''}`,
      '',
      'Stack:',
      error.stack || 'No stack trace available',
    ];
    if (error.metadata && Object.keys(error.metadata).length > 0) {
      lines.push('', 'Metadata:', JSON.stringify(error.metadata, null, 2));
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className={`${ICON_SIZES.xl} animate-spin text-gray-400`} />
      </div>
    );
  }

  if (fetchError || !error) {
    return (
      <div className="text-center py-24">
        <AlertTriangle className={`${ICON_SIZES['3xl']} mx-auto text-amber-500 mb-4`} />
        <p className="text-gray-600 mb-4">{fetchError || 'Not found'}</p>
        <Link href="/super-admin/error-logs">
          <Button variant="outline">
            <ArrowLeft className={`${ICON_SIZES.sm} mr-2`} />
            Back to List
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/error-logs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className={`${ICON_SIZES.sm} mr-2`} />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Error Log Details</h1>
            <p className="text-sm text-gray-500">ID: {error.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyErrorDetails}>
            <Copy className={`${ICON_SIZES.sm} mr-2`} />
            Copy Debug Info
          </Button>
          {error.resolved ? (
            <Button
              variant="outline"
              onClick={() => handleResolve(false)}
              disabled={actionLoading}
            >
              <XCircle className={`${ICON_SIZES.sm} mr-2`} />
              Mark Unresolved
            </Button>
          ) : (
            <Button
              onClick={() => setResolveDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className={`${ICON_SIZES.sm} mr-2`} />
              Resolve
            </Button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <Card className={error.resolved ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {error.resolved ? (
                <CheckCircle className={`${ICON_SIZES.lg} text-green-600`} />
              ) : (
                <AlertTriangle className={`${ICON_SIZES.lg} text-red-600`} />
              )}
              <div>
                <p className={`font-medium ${error.resolved ? 'text-green-800' : 'text-red-800'}`}>
                  {error.resolved ? 'Resolved' : 'Unresolved'}
                </p>
                {error.resolved && error.resolvedAt && (
                  <p className="text-sm text-green-600">
                    Resolved on {formatDateTime(error.resolvedAt)} by {error.resolvedBy}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={TYPE_COLORS[error.type] || TYPE_COLORS.API_ERROR}>
                <TypeIcon type={error.type} />
                <span className="ml-1">{error.type.replace('_', ' ')}</span>
              </Badge>
              <Badge className={SEVERITY_COLORS[error.severity] || SEVERITY_COLORS.error}>
                {error.severity}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertOctagon className={ICON_SIZES.sm} />
              Error Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Source</label>
              <p className="mt-1 font-medium">{error.source}</p>
            </div>
            {error.action && (
              <div>
                <label className="text-sm font-medium text-gray-500">Action</label>
                <p className="mt-1">{error.action}</p>
              </div>
            )}
            {error.statusCode && (
              <div>
                <label className="text-sm font-medium text-gray-500">HTTP Status</label>
                <p className="mt-1 font-mono">{error.statusCode}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Timestamp</label>
              <p className="mt-1 flex items-center gap-2">
                <Clock className={`${ICON_SIZES.sm} text-gray-400`} />
                {formatDateTime(error.createdAt)}
              </p>
            </div>
            {error.requestId && (
              <div>
                <label className="text-sm font-medium text-gray-500">Request ID</label>
                <p className="mt-1 font-mono text-xs text-gray-500">{error.requestId}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Info */}
        {(error.method || error.path) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className={ICON_SIZES.sm} />
                Request Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error.method && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Method</label>
                  <p className="mt-1">
                    <Badge variant="outline">{error.method}</Badge>
                  </p>
                </div>
              )}
              {error.path && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Path</label>
                  <p className="mt-1 font-mono text-sm break-all">{error.path}</p>
                </div>
              )}
              {error.userAgent && (
                <div>
                  <label className="text-sm font-medium text-gray-500">User Agent</label>
                  <p className="mt-1 text-sm text-gray-600 break-all">{error.userAgent}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Info */}
        {(error.userId || error.userEmail) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className={ICON_SIZES.sm} />
                User Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error.userEmail && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 font-mono text-sm">{error.userEmail}</p>
                </div>
              )}
              {error.userRole && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <p className="mt-1">
                    <Badge variant="outline">{error.userRole}</Badge>
                  </p>
                </div>
              )}
              {error.userId && (
                <div>
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="mt-1 font-mono text-xs text-gray-500">{error.userId}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className={ICON_SIZES.sm} />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="mt-1">{error.tenant?.name || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Slug</label>
              <p className="mt-1 font-mono text-sm">{error.tenant?.slug || '-'}</p>
            </div>
            {error.tenantId && (
              <div>
                <label className="text-sm font-medium text-gray-500">Tenant ID</label>
                <p className="mt-1 font-mono text-xs text-gray-500">{error.tenantId}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-700">
            <AlertTriangle className={ICON_SIZES.sm} />
            Error Message
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 bg-red-50 p-3 rounded-md text-sm">
            {error.message}
          </p>
          {error.errorCode && (
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-500">Error Code</label>
              <p className="mt-1 font-mono text-sm">{error.errorCode}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stack Trace */}
      {error.stack && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Code className={ICON_SIZES.sm} />
              Stack Trace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-xs font-mono whitespace-pre-wrap">
              {error.stack}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {error.metadata && Object.keys(error.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Code className={ICON_SIZES.sm} />
              Additional Metadata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm">
              {JSON.stringify(error.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Resolution Notes */}
      {error.resolved && error.resolutionNotes && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <FileText className={ICON_SIZES.sm} />
              Resolution Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="bg-green-50 p-3 rounded-md">{error.resolutionNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Error</DialogTitle>
            <DialogDescription>
              Mark this error as resolved. Optionally add notes about the resolution.
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
    </div>
  );
}
