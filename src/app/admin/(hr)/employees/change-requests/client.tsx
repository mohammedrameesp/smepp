'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Loader2, CheckCircle, XCircle, Clock, User, MessageSquare } from 'lucide-react';
import { formatDateTime } from '@/lib/core/datetime';
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

export function ChangeRequestsClient() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [resolverNotes, setResolverNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/change-requests?status=${statusFilter}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setRequests(data.requests);
    } catch {
      toast.error('Failed to load change requests');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Change Requests</CardTitle>
              <CardDescription>
                {statusFilter === 'all' ? 'All requests' : `${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()} requests`}
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
