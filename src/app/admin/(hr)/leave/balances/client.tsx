'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdjustBalanceDialog } from '@/features/leave/components';
import { Search, Plus, User, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { getAnnualLeaveDetails } from '@/features/leave/lib/leave-utils';
import Link from 'next/link';
import { toast } from 'sonner';

interface LeaveBalance {
  id: string;
  memberId: string;
  leaveTypeId: string;
  year: number;
  entitlement: number | string;
  used: number | string;
  pending: number | string;
  carriedForward: number | string;
  adjustment: number | string;
  member: {
    id: string;
    name: string | null;
    email: string;
  };
  leaveType: {
    id: string;
    name: string;
    color: string;
    isPaid?: boolean;
    accrualBased?: boolean;
  };
}

interface UserGroup {
  member: {
    id: string;
    name: string | null;
    email: string;
  };
  balances: LeaveBalance[];
  totalEntitlement: number;
  totalUsed: number;
  totalPending: number;
  totalRemaining: number;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  hrProfile?: {
    dateOfJoining?: string | null;
  } | null;
}

interface LeaveType {
  id: string;
  name: string;
  color: string;
  defaultDays: number;
}

export function LeaveBalancesClient() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState(currentYear.toString());
  const [searchQuery, setSearchQuery] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');

  // Initialize dialog state
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [initUserId, setInitUserId] = useState('');
  const [initLeaveTypeId, setInitLeaveTypeId] = useState('');
  const [initEntitlement, setInitEntitlement] = useState('');
  const [initSubmitting, setInitSubmitting] = useState(false);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('ps', '1000'); // Fetch all balances for grouping
      params.set('year', yearFilter);

      if (leaveTypeFilter) params.set('leaveTypeId', leaveTypeFilter);

      const response = await fetch(`/api/leave/balances?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBalances(data.balances);
      }
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setLoading(false);
    }
  }, [yearFilter, leaveTypeFilter]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?ps=1000&includeHrProfile=true');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch('/api/leave/types');
      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(data.leaveTypes || []);
      }
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  useEffect(() => {
    fetchUsers();
    fetchLeaveTypes();
  }, []);

  // Helper to get effective entitlement (accrued for accrual-based leave types)
  const getEffectiveEntitlement = (balance: LeaveBalance, dateOfJoining: Date | null) => {
    if (balance.leaveType.accrualBased && dateOfJoining) {
      const year = parseInt(yearFilter);
      const annualDetails = getAnnualLeaveDetails(dateOfJoining, year, new Date());
      return annualDetails.accrued;
    }
    return Number(balance.entitlement);
  };

  // Get user's dateOfJoining from the users array
  const getUserDateOfJoining = (userId: string): Date | null => {
    const user = users.find(u => u.id === userId);
    if (user?.hrProfile?.dateOfJoining) {
      return new Date(user.hrProfile.dateOfJoining);
    }
    return null;
  };

  // Group balances by user
  const userGroups: UserGroup[] = (() => {
    const groupMap = new Map<string, UserGroup>();

    balances.forEach((balance) => {
      const odId = balance.member.id;
      if (!groupMap.has(odId)) {
        groupMap.set(odId, {
          member: balance.member,
          balances: [],
          totalEntitlement: 0,
          totalUsed: 0,
          totalPending: 0,
          totalRemaining: 0,
        });
      }

      const group = groupMap.get(odId)!;
      group.balances.push(balance);

      const dateOfJoining = getUserDateOfJoining(odId);
      const effectiveEntitlement = getEffectiveEntitlement(balance, dateOfJoining);
      const remaining = effectiveEntitlement + Number(balance.carriedForward) + Number(balance.adjustment) - Number(balance.used) - Number(balance.pending);

      group.totalEntitlement += effectiveEntitlement;
      group.totalUsed += Number(balance.used);
      group.totalPending += Number(balance.pending);
      group.totalRemaining += remaining;
    });

    return Array.from(groupMap.values());
  })();

  // Filter by search query
  const filteredGroups = userGroups.filter((group) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      group.member.name?.toLowerCase().includes(query) ||
      group.member.email.toLowerCase().includes(query)
    );
  });

  const toggleExpand = (userId: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedUsers(new Set(filteredGroups.map((g) => g.member.id)));
  };

  const collapseAll = () => {
    setExpandedUsers(new Set());
  };

  const handleInitializeBalance = async () => {
    if (!initUserId || !initLeaveTypeId) {
      toast.error('Please select a user and leave type');
      return;
    }

    setInitSubmitting(true);
    try {
      const response = await fetch('/api/leave/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: initUserId,
          leaveTypeId: initLeaveTypeId,
          year: parseInt(yearFilter),
          entitlement: initEntitlement ? parseFloat(initEntitlement) : undefined,
        }),
      });

      if (response.ok) {
        setInitDialogOpen(false);
        setInitUserId('');
        setInitLeaveTypeId('');
        setInitEntitlement('');
        toast.success('Leave balance created successfully');
        fetchBalances();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to initialize balance');
      }
    } catch (error) {
      console.error('Failed to initialize balance:', error);
      toast.error('An error occurred while creating balance');
    } finally {
      setInitSubmitting(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Employee Balances ({filteredGroups.length})</CardTitle>
              <CardDescription>
                Click on an employee to view their leave balance breakdown
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setInitDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Initialize Balance
              </Button>
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={leaveTypeFilter} onValueChange={(v) => setLeaveTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Leave Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {leaveTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }} />
                      {type.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Groups */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No balances found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map((group) => {
                const isExpanded = expandedUsers.has(group.member.id);

                return (
                  <div
                    key={group.member.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Employee Header */}
                    <div
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleExpand(group.member.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {group.member.name || 'No Name'}
                          </div>
                          <div className="text-sm text-gray-500">{group.member.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Summary Stats */}
                        <div className="hidden md:flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <div className="text-gray-500">Entitlement</div>
                            <div className="font-semibold">{group.totalEntitlement}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500">Used</div>
                            <div className="font-semibold text-red-600">{group.totalUsed}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500">Pending</div>
                            <div className="font-semibold text-amber-600">{group.totalPending}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500">Remaining</div>
                            <div className="font-semibold text-green-600">{group.totalRemaining.toFixed(1)}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/employees/${group.member.id}?tab=leave`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="sm" title="View Employee Profile">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content - Leave Type Breakdown */}
                    {isExpanded && (
                      <div className="p-4 border-t bg-white">
                        <div className="grid gap-3">
                          {group.balances.map((balance) => {
                            const dateOfJoining = getUserDateOfJoining(group.member.id);
                            const isAccrualBased = balance.leaveType.accrualBased === true;
                            const effectiveEntitlement = getEffectiveEntitlement(balance, dateOfJoining);

                            // Get accrual details for display
                            let annualDetails: { annualEntitlement: number; monthsWorked: number } | null = null;
                            if (isAccrualBased && dateOfJoining) {
                              const year = parseInt(yearFilter);
                              annualDetails = getAnnualLeaveDetails(dateOfJoining, year, new Date());
                            }

                            const total = effectiveEntitlement + Number(balance.carriedForward) + Number(balance.adjustment);
                            const remaining = total - Number(balance.used) - Number(balance.pending);

                            return (
                              <div
                                key={balance.id}
                                className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-gray-50 rounded-lg gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: balance.leaveType.color }}
                                  />
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{balance.leaveType.name}</span>
                                    {balance.leaveType.isPaid === false && (
                                      <Badge variant="outline" className="text-xs">Unpaid</Badge>
                                    )}
                                    {isAccrualBased && annualDetails && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        Accrual ({annualDetails.monthsWorked} mo)
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500">
                                      {isAccrualBased && annualDetails ? 'Accrued:' : 'Entitlement:'}
                                    </span>
                                    <span className="font-medium">
                                      {effectiveEntitlement.toFixed(1)}
                                      {isAccrualBased && annualDetails && (
                                        <span className="text-gray-400 text-xs ml-1">of {annualDetails.annualEntitlement}/yr</span>
                                      )}
                                    </span>
                                  </div>
                                  {Number(balance.carriedForward) > 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-500">Carried:</span>
                                      <span className="font-medium text-blue-600">+{Number(balance.carriedForward)}</span>
                                    </div>
                                  )}
                                  {Number(balance.adjustment) !== 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-500">Adj:</span>
                                      <span className={`font-medium ${Number(balance.adjustment) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {Number(balance.adjustment) >= 0 ? '+' : ''}{Number(balance.adjustment)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500">Used:</span>
                                    <span className="font-medium text-red-600">{Number(balance.used)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500">Pending:</span>
                                    <span className="font-medium text-amber-600">{Number(balance.pending)}</span>
                                  </div>
                                  <div className="flex items-center gap-1 font-semibold">
                                    <span className="text-gray-500">Remaining:</span>
                                    <span className="text-green-600">{remaining.toFixed(1)}</span>
                                  </div>

                                  <AdjustBalanceDialog
                                    balanceId={balance.id}
                                    userName={balance.member.name || balance.member.email}
                                    leaveTypeName={balance.leaveType.name}
                                    currentBalance={remaining}
                                    onAdjusted={fetchBalances}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Initialize Balance Dialog */}
      {initDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Initialize Leave Balance</CardTitle>
              <CardDescription>Create a new balance for an employee</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Employee *</label>
                <Select value={initUserId} onValueChange={setInitUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Leave Type *</label>
                <Select value={initLeaveTypeId} onValueChange={setInitLeaveTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }} />
                          {type.name} ({type.defaultDays} days default)
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Input value={yearFilter} disabled />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Entitlement (Optional)</label>
                <Input
                  type="number"
                  placeholder="Leave blank to use default"
                  value={initEntitlement}
                  onChange={(e) => setInitEntitlement(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  If not specified, the default entitlement for the leave type will be used.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setInitDialogOpen(false)}
                  disabled={initSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInitializeBalance}
                  disabled={initSubmitting}
                >
                  {initSubmitting ? 'Creating...' : 'Create Balance'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
