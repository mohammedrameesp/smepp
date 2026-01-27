'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, XCircle, User, Search } from 'lucide-react';
import { formatDate } from '@/lib/core/datetime';
import { ICON_SIZES } from '@/lib/constants';
import { cn } from '@/lib/core/utils';

interface ExpiringDocument {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  documentType: 'QID' | 'Passport' | 'Health Card' | 'Driving License';
  expiryDate: string;
  status: 'expired' | 'expiring';
  daysRemaining: number;
}

export function DocumentExpiryClient() {
  const [alerts, setAlerts] = useState<ExpiringDocument[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<ExpiringDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');

  const fetchExpiryAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/employees/expiry-alerts');

      if (!response.ok) {
        throw new Error('Failed to fetch expiry alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching expiry alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filterAlerts = useCallback(() => {
    let filtered = [...alerts];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (alert) =>
          alert.employeeName.toLowerCase().includes(term) ||
          alert.employeeEmail.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((alert) => alert.status === statusFilter);
    }

    // Document type filter
    if (documentTypeFilter !== 'all') {
      filtered = filtered.filter((alert) => alert.documentType === documentTypeFilter);
    }

    setFilteredAlerts(filtered);
  }, [alerts, searchTerm, statusFilter, documentTypeFilter]);

  useEffect(() => {
    fetchExpiryAlerts();
  }, [fetchExpiryAlerts]);

  useEffect(() => {
    filterAlerts();
  }, [filterAlerts]);

  const getDocumentBadge = (type: string) => {
    const colors: Record<string, string> = {
      QID: 'bg-blue-100 text-blue-800 border-blue-300',
      Passport: 'bg-purple-100 text-purple-800 border-purple-300',
      'Health Card': 'bg-green-100 text-green-800 border-green-300',
      'Driving License': 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusBadge = (status: 'expired' | 'expiring', daysRemaining: number) => {
    if (status === 'expired') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className={ICON_SIZES.xs} />
          Expired {Math.abs(daysRemaining)}d ago
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center gap-1">
        <AlertTriangle className={ICON_SIZES.xs} />
        {daysRemaining}d remaining
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className={cn(ICON_SIZES.xl, "animate-spin text-gray-400")} />
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${ICON_SIZES.sm} text-gray-400`} />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
              </SelectContent>
            </Select>
            <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="QID">QID</SelectItem>
                <SelectItem value="Passport">Passport</SelectItem>
                <SelectItem value="Health Card">Health Card</SelectItem>
                <SelectItem value="Driving License">Driving License</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Document Alerts</CardTitle>
          <CardDescription>
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className={`${ICON_SIZES['3xl']} text-green-500 mx-auto mb-4`} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {alerts.length === 0 ? 'No Expiring Documents' : 'No Matching Results'}
              </h3>
              <p className="text-gray-500">
                {alerts.length === 0
                  ? 'All employee documents are up to date.'
                  : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert, index) => (
                    <TableRow
                      key={`${alert.employeeId}-${alert.documentType}-${index}`}
                      className={alert.status === 'expired' ? 'bg-red-50' : 'bg-yellow-50'}
                    >
                      <TableCell>
                        <Link
                          href={`/admin/employees/${alert.employeeId}`}
                          className="flex items-center gap-3 hover:opacity-80"
                        >
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className={cn(ICON_SIZES.md, "text-gray-400")} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {alert.employeeName || 'No name'}
                            </div>
                            <div className="text-sm text-gray-500">{alert.employeeEmail}</div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getDocumentBadge(alert.documentType)}>
                          {alert.documentType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(new Date(alert.expiryDate))}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(alert.status, alert.daysRemaining)}</TableCell>
                      <TableCell className="text-center">
                        <Link href={`/admin/employees/${alert.employeeId}`}>
                          <Button variant="outline" size="sm">
                            View Profile
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
