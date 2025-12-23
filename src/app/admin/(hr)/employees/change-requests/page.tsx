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
import { Loader2, CheckCircle, XCircle, Clock, User, ArrowLeft, MessageSquare } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/admin/employees" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Employees
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Change Requests</h1>
            <p className="text-gray-600">Review and manage employee profile change requests</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className={statusFilter === 'all' ? 'ring-2 ring-blue-500' : 'cursor-pointer hover:ring-2 hover:ring-gray-200'} onClick={() => setStatusFilter('all')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className={statusFilter === 'PENDING' ? 'ring-2 ring-yellow-500' : 'cursor-pointer hover:ring-2 hover:ring-gray-200'} onClick={() => setStatusFilter('PENDING')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card className={statusFilter === 'APPROVED' ? 'ring-2 ring-green-500' : 'cursor-pointer hover:ring-2 hover:ring-gray-200'} onClick={() => setStatusFilter('APPROVED')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              </CardContent>
            </Card>
            <Card className={statusFilter === 'REJECTED' ? 'ring-2 ring-red-500' : 'cursor-pointer hover:ring-2 hover:ring-gray-200'} onClick={() => setStatusFilter('REJECTED')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Rejected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              </CardContent>
            </Card>
          </div>

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
        </div>
      </div>

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
    </div>
  );
}
