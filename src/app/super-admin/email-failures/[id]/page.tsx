'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MailWarning,
  Building2,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  FileText,
  Code,
} from 'lucide-react';
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
import { formatDate } from '@/lib/core/datetime';

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

const MODULE_COLORS: Record<string, string> = {
  assets: 'bg-blue-100 text-blue-800',
  'asset-requests': 'bg-purple-100 text-purple-800',
  leave: 'bg-green-100 text-green-800',
  'purchase-requests': 'bg-orange-100 text-orange-800',
  suppliers: 'bg-cyan-100 text-cyan-800',
  users: 'bg-pink-100 text-pink-800',
  hr: 'bg-amber-100 text-amber-800',
  auth: 'bg-red-100 text-red-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function EmailFailureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [failure, setFailure] = useState<EmailFailure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve dialog
  const [resolveDialog, setResolveDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchFailure();
  }, [params.id]);

  const fetchFailure = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/email-failures/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Email failure not found');
        } else {
          throw new Error('Failed to fetch');
        }
        return;
      }
      const data = await response.json();
      setFailure(data.failure);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (resolved: boolean) => {
    if (!failure) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/super-admin/email-failures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [failure.id],
          resolved,
          resolutionNotes: resolved ? resolutionNotes : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setResolveDialog(false);
      setResolutionNotes('');
      fetchFailure();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !failure) {
    return (
      <div className="text-center py-24">
        <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
        <p className="text-gray-600 mb-4">{error || 'Not found'}</p>
        <Link href="/super-admin/email-failures">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
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
          <Link href="/super-admin/email-failures">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Email Failure Details</h1>
            <p className="text-sm text-gray-500">ID: {failure.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {failure.resolved ? (
            <Button
              variant="outline"
              onClick={() => handleResolve(false)}
              disabled={actionLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Mark Unresolved
            </Button>
          ) : (
            <Button
              onClick={() => setResolveDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolve
            </Button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <Card className={failure.resolved ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {failure.resolved ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <p className={`font-medium ${failure.resolved ? 'text-green-800' : 'text-red-800'}`}>
                  {failure.resolved ? 'Resolved' : 'Unresolved'}
                </p>
                {failure.resolved && failure.resolvedAt && (
                  <p className="text-sm text-green-600">
                    Resolved on {formatDate(failure.resolvedAt)} by {failure.resolvedBy}
                  </p>
                )}
              </div>
            </div>
            <Badge className={MODULE_COLORS[failure.module] || MODULE_COLORS.other}>
              {failure.module}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MailWarning className="h-4 w-4" />
              Email Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Subject</label>
              <p className="mt-1">{failure.emailSubject}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Action</label>
              <p className="mt-1 capitalize">{failure.action.replace(/-/g, ' ')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Timestamp</label>
              <p className="mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                {formatDate(failure.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recipient Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Recipient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 font-mono text-sm">{failure.recipientEmail}</p>
            </div>
            {failure.recipientName && (
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1">{failure.recipientName}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="mt-1">{failure.tenant?.name || failure.organizationName || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Slug</label>
              <p className="mt-1 font-mono text-sm">
                {failure.tenant?.slug || failure.organizationSlug || '-'}
              </p>
            </div>
            {failure.tenantId && (
              <div>
                <label className="text-sm font-medium text-gray-500">Tenant ID</label>
                <p className="mt-1 font-mono text-xs text-gray-500">{failure.tenantId}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Details */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Error Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Error Message</label>
              <p className="mt-1 text-red-600 bg-red-50 p-3 rounded-md text-sm">
                {failure.error}
              </p>
            </div>
            {failure.errorCode && (
              <div>
                <label className="text-sm font-medium text-gray-500">Error Code</label>
                <p className="mt-1 font-mono text-sm">{failure.errorCode}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      {failure.metadata && Object.keys(failure.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Code className="h-4 w-4" />
              Additional Metadata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm">
              {JSON.stringify(failure.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Resolution Notes */}
      {failure.resolved && failure.resolutionNotes && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <FileText className="h-4 w-4" />
              Resolution Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="bg-green-50 p-3 rounded-md">{failure.resolutionNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Email Failure</DialogTitle>
            <DialogDescription>
              Mark this failure as resolved. Optionally add notes about the resolution.
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
    </div>
  );
}
