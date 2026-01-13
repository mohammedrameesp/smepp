'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, XCircle, User, ChevronRight, Search } from 'lucide-react';
import { formatDate } from '@/lib/core/datetime';

interface ExpiringDocument {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  documentType: 'QID' | 'Passport' | 'Health Card' | 'Driving License';
  expiryDate: string;
  status: 'expired' | 'expiring';
  daysRemaining: number;
}

interface Summary {
  total: number;
  expired: number;
  expiring: number;
}

export default function DocumentExpiryPage() {
  const [alerts, setAlerts] = useState<ExpiringDocument[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<ExpiringDocument[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, expired: 0, expiring: 0 });
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
      setSummary(data.summary || { total: 0, expired: 0, expiring: 0 });
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
          <XCircle className="h-3 w-3" />
          Expired {Math.abs(daysRemaining)}d ago
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        {daysRemaining}d remaining
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <>
        <div className="bg-slate-800 shadow-lg">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <nav className="flex items-center gap-1 text-sm mb-3">
              <Link href="/admin/employees" className="text-slate-400 hover:text-white transition-colors">
                Employees
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-slate-300">Document Expiry</span>
            </nav>
            <h1 className="text-2xl font-bold text-white">Document Expiry Alerts</h1>
            <p className="text-slate-400 mt-1">Track and manage expiring employee documents</p>
          </div>
        </div>
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </main>
      </>
    );
  }

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
            <span className="text-slate-300">Document Expiry</span>
          </nav>

          <h1 className="text-2xl font-bold text-white">Document Expiry Alerts</h1>
          <p className="text-slate-400 mt-1">Track and manage expiring and expired employee documents</p>

          {/* Summary Chips */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'all' ? 'bg-slate-600 ring-2 ring-slate-400' : 'bg-slate-700/50 hover:bg-slate-700'
              }`}
            >
              <span className="text-slate-300 text-sm font-medium">{summary.total} total alerts</span>
            </button>
            {summary.expired > 0 && (
              <button
                onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'expired' ? 'bg-rose-500/30 ring-2 ring-rose-400' : 'bg-rose-500/20 hover:bg-rose-500/30'
                }`}
              >
                <span className="text-rose-400 text-sm font-medium">{summary.expired} expired</span>
              </button>
            )}
            {summary.expiring > 0 && (
              <button
                onClick={() => setStatusFilter(statusFilter === 'expiring' ? 'all' : 'expiring')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'expiring' ? 'bg-amber-500/30 ring-2 ring-amber-400' : 'bg-amber-500/20 hover:bg-amber-500/30'
                }`}
              >
                <span className="text-amber-400 text-sm font-medium">{summary.expiring} expiring soon</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters */}
        <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                  <AlertTriangle className="h-12 w-12 text-green-500 mx-auto mb-4" />
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
                                <User className="h-5 w-5 text-gray-400" />
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
      </main>
    </>
  );
}
