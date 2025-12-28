'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, CheckCircle, XCircle, Clock, User, ChevronRight, MessageSquare } from 'lucide-react';
import { formatDateTime } from '@/lib/date-format';
import { toast } from 'sonner';

interface ChangeRequest {
  id: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  resolverNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  hrProfile: {
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  };
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function ChangeRequestsPage() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [resolverNotes, setResolverNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/change-requests?status=${statusFilter}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setRequests(data.requests);
      setStats(data.stats);
    } catch (error) {
      toast.error('Failed to load change requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return;

    setIsResolving(true);
    try {
      const response = await fetch(`/api/admin/change-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: resolverNotes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resolve');
      }

      toast.success(`Request ${status.toLowerCase()} successfully`);
      setSelectedRequest(null);
      setResolverNotes('');
      fetchRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resolve request');
    } finally {
      setIsResolving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      {/* Dark Header */}
      <div className="bg-slate-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm mb-3">
            <Link href="/admin/employees" className="text-slate-400 hover:text-white transition-colors">
              Employees
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-300">Change Requests</span>
          </nav>

          <h1 className="text-2xl font-bold text-white">Profile Change Requests</h1>
          <p className="text-slate-400 mt-1">Review and manage employee profile change requests</p>

          {/* Summary Chips */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'all' ? 'bg-slate-600 ring-2 ring-slate-400' : 'bg-slate-700/50 hover:bg-slate-700'
              }`}
            >
              <span className="text-slate-300 text-sm font-medium">{stats.total} total</span>
            </button>
            {stats.pending > 0 && (
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'PENDING' ? 'bg-amber-500/30 ring-2 ring-amber-400' : 'bg-amber-500/20 hover:bg-amber-500/30'
                }`}
              >
                <span className="text-amber-400 text-sm font-medium">{stats.pending} pending</span>
              </button>
            )}
            {stats.approved > 0 && (
              <button
                onClick={() => setStatusFilter('APPROVED')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'APPROVED' ? 'bg-emerald-500/30 ring-2 ring-emerald-400' : 'bg-emerald-500/20 hover:bg-emerald-500/30'
                }`}
              >
                <span className="text-emerald-400 text-sm font-medium">{stats.approved} approved</span>
              </button>
            )}
            {stats.rejected > 0 && (
              <button
                onClick={() => setStatusFilter('REJECTED')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'REJECTED' ? 'bg-rose-500/30 ring-2 ring-rose-400' : 'bg-rose-500/20 hover:bg-rose-500/30'
                }`}
              >
                <span className="text-rose-400 text-sm font-medium">{stats.rejected} rejected</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Table */}
        <Card>
            <CardHeader>
              <CardTitle>Change Requests</CardTitle>
              <CardDescription>
                {statusFilter === 'all' ? 'All requests' : `${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()} requests`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No change requests found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <Link href={`/admin/employees/${request.hrProfile.user.id}`} className="flex items-center gap-2 hover:underline">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              {request.hrProfile.user.image ? (
                                <img src={request.hrProfile.user.image} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <User className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{request.hrProfile.user.name || 'No name'}</div>
                              <div className="text-xs text-gray-500">{request.hrProfile.user.email}</div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="truncate">{request.description}</p>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDateTime(new Date(request.createdAt))}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'PENDING' ? (
                            <Button size="sm" onClick={() => setSelectedRequest(request)}>
                              Review
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setSelectedRequest(request)}>
                              View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      </main>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => { setSelectedRequest(null); setResolverNotes(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.status === 'PENDING' ? 'Review Change Request' : 'Change Request Details'}
            </DialogTitle>
            <DialogDescription>
              From {selectedRequest?.hrProfile.user.name || selectedRequest?.hrProfile.user.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Request Description</label>
              <p className="mt-1 p-3 bg-gray-50 rounded-md text-sm">{selectedRequest?.description}</p>
            </div>

            {selectedRequest?.status === 'PENDING' ? (
              <div>
                <label className="text-sm font-medium text-gray-700">Admin Notes (optional)</label>
                <Textarea
                  value={resolverNotes}
                  onChange={(e) => setResolverNotes(e.target.value)}
                  placeholder="Add notes about this decision..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            ) : selectedRequest?.resolverNotes ? (
              <div>
                <label className="text-sm font-medium text-gray-700">Resolution Notes</label>
                <p className="mt-1 p-3 bg-gray-50 rounded-md text-sm">{selectedRequest.resolverNotes}</p>
              </div>
            ) : null}

            {selectedRequest?.resolvedAt && (
              <p className="text-sm text-gray-500">
                Resolved on {formatDateTime(new Date(selectedRequest.resolvedAt))}
              </p>
            )}
          </div>

          <DialogFooter>
            {selectedRequest?.status === 'PENDING' ? (
              <>
                <Button variant="outline" onClick={() => handleResolve('REJECTED')} disabled={isResolving}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button onClick={() => handleResolve('APPROVED')} disabled={isResolving}>
                  {isResolving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Edit Profile
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
