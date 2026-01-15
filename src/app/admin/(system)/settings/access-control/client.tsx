'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Users, Briefcase, UserCog, CircleDollarSign, Search, Loader2, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isOwner?: boolean;
  isAdmin: boolean;
  hasOperationsAccess: boolean;
  hasHRAccess: boolean;
  hasFinanceAccess: boolean;
  reportingTo: { id: string; name: string } | null;
}

interface PermissionStats {
  total: number;
  admins: number;
  operations: number;
  hr: number;
  finance: number;
}

export function AccessControlClient() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [managers, setManagers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stats, setStats] = useState<PermissionStats>({
    total: 0,
    admins: 0,
    operations: 0,
    hr: 0,
    finance: 0,
  });

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/team-members?includeNonEmployees=true');
      if (!response.ok) throw new Error('Failed to fetch team members');

      const data = await response.json();
      const membersList = data.members || [];
      setMembers(membersList);
      setFilteredMembers(membersList);

      // Calculate stats
      setStats({
        total: membersList.length,
        admins: membersList.filter((m: TeamMember) => m.isAdmin).length,
        operations: membersList.filter((m: TeamMember) => m.hasOperationsAccess).length,
        hr: membersList.filter((m: TeamMember) => m.hasHRAccess).length,
        finance: membersList.filter((m: TeamMember) => m.hasFinanceAccess).length,
      });

      // Get managers for the "Reports To" dropdown (admins can be managers)
      const managersList = membersList.filter((m: TeamMember) => m.isAdmin);
      setManagers(managersList);
    } catch (error) {
      toast.error('Failed to load team members');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Filter members based on search and filter
  useEffect(() => {
    let result = members;

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name?.toLowerCase().includes(searchLower) ||
          m.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply filter
    if (filter !== 'all') {
      switch (filter) {
        case 'admins':
          result = result.filter((m) => m.isAdmin);
          break;
        case 'operations':
          result = result.filter((m) => m.hasOperationsAccess);
          break;
        case 'hr':
          result = result.filter((m) => m.hasHRAccess);
          break;
        case 'finance':
          result = result.filter((m) => m.hasFinanceAccess);
          break;
      }
    }

    setFilteredMembers(result);
  }, [members, search, filter]);

  const updatePermission = async (
    memberId: string,
    field: 'isAdmin' | 'hasOperationsAccess' | 'hasHRAccess' | 'hasFinanceAccess',
    value: boolean
  ) => {
    setUpdatingId(memberId);
    try {
      const response = await fetch(`/api/users/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update permission');
      }

      // Update local state
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, [field]: value } : m
        )
      );

      toast.success('Permission updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update permission');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateReportingTo = async (memberId: string, reportingToId: string | null) => {
    setUpdatingId(memberId);
    try {
      const response = await fetch(`/api/users/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportingToId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update manager');
      }

      // Update local state
      const manager = managers.find((m) => m.id === reportingToId);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? {
                ...m,
                reportingTo: manager ? { id: manager.id, name: manager.name || manager.email } : null,
              }
            : m
        )
      );

      toast.success('Manager updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update manager');
    } finally {
      setUpdatingId(null);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:border-gray-400 transition-colors" onClick={() => setFilter('all')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer hover:border-red-400 transition-colors ${filter === 'admins' ? 'border-red-500' : ''}`} onClick={() => setFilter(filter === 'admins' ? 'all' : 'admins')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-red-500" />
              <span className="text-sm text-gray-600">Admins</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.admins}</p>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer hover:border-blue-400 transition-colors ${filter === 'operations' ? 'border-blue-500' : ''}`} onClick={() => setFilter(filter === 'operations' ? 'all' : 'operations')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600">Operations</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.operations}</p>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer hover:border-green-400 transition-colors ${filter === 'hr' ? 'border-green-500' : ''}`} onClick={() => setFilter(filter === 'hr' ? 'all' : 'hr')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">HR</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.hr}</p>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer hover:border-yellow-400 transition-colors ${filter === 'finance' ? 'border-yellow-500' : ''}`} onClick={() => setFilter(filter === 'finance' ? 'all' : 'finance')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-gray-600">Finance</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.finance}</p>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Team Permissions</CardTitle>
              <CardDescription>
                Toggle permissions for each team member. Admins have full access to all modules.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Member</TableHead>
                  <TableHead className="text-center w-[80px]">Admin</TableHead>
                  <TableHead className="text-center w-[100px] hidden md:table-cell">Operations</TableHead>
                  <TableHead className="text-center w-[80px] hidden md:table-cell">HR</TableHead>
                  <TableHead className="text-center w-[80px] hidden md:table-cell">Finance</TableHead>
                  <TableHead className="w-[180px]">Reports To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No team members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {member.image ? (
                              <img
                                src={member.image}
                                alt={member.name || member.email}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-medium text-gray-600">
                                {getInitials(member.name, member.email)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{member.name || member.email}</p>
                              {member.isOwner && (
                                <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              )}
                            </div>
                            {member.name && (
                              <p className="text-sm text-gray-500 truncate">{member.email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          {member.isOwner ? (
                            <Badge variant="default" className="bg-amber-500">Owner</Badge>
                          ) : (
                            <Switch
                              checked={member.isAdmin}
                              onCheckedChange={(checked) => updatePermission(member.id, 'isAdmin', checked)}
                              disabled={updatingId === member.id}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <div className="flex justify-center">
                          <Switch
                            checked={member.hasOperationsAccess}
                            onCheckedChange={(checked) => updatePermission(member.id, 'hasOperationsAccess', checked)}
                            disabled={updatingId === member.id || member.isAdmin || member.isOwner}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <div className="flex justify-center">
                          <Switch
                            checked={member.hasHRAccess}
                            onCheckedChange={(checked) => updatePermission(member.id, 'hasHRAccess', checked)}
                            disabled={updatingId === member.id || member.isAdmin || member.isOwner}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <div className="flex justify-center">
                          <Switch
                            checked={member.hasFinanceAccess}
                            onCheckedChange={(checked) => updatePermission(member.id, 'hasFinanceAccess', checked)}
                            disabled={updatingId === member.id || member.isAdmin || member.isOwner}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.reportingTo?.id || 'none'}
                          onValueChange={(value) => updateReportingTo(member.id, value === 'none' ? null : value)}
                          disabled={updatingId === member.id}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No manager</SelectItem>
                            {managers
                              .filter((m) => m.id !== member.id)
                              .map((manager) => (
                                <SelectItem key={manager.id} value={manager.id}>
                                  {manager.name || manager.email}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-red-500" />
              <span>Admin = Full access to all modules</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-500" />
              <span>Operations = Assets, Subscriptions, Suppliers</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-green-500" />
              <span>HR = Employees, Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-yellow-600" />
              <span>Finance = Payroll, Purchase Requests</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
