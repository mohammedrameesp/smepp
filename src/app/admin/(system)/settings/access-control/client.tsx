'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Users, Search, Loader2, Crown, UserCheck } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'HR' | 'FINANCE' | 'OPERATIONS' | 'EMPLOYEE';

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isOwner?: boolean;
  isAdmin: boolean;
  isManager: boolean;
  hasOperationsAccess: boolean;
  hasHRAccess: boolean;
  hasFinanceAccess: boolean;
  reportingTo: { id: string; name: string } | null;
}

interface RoleStats {
  total: number;
  admins: number;
  managers: number;
  employees: number;
}

// Role display configuration
const ROLE_CONFIG: Record<Role, { label: string; color: string; description: string }> = {
  OWNER: { label: 'Owner', color: 'bg-amber-500', description: 'Organization owner with full access' },
  ADMIN: { label: 'Admin', color: 'bg-red-500', description: 'Full access to all modules' },
  MANAGER: { label: 'Manager', color: 'bg-purple-500', description: 'Can approve direct reports' },
  HR: { label: 'HR', color: 'bg-green-500', description: 'HR module access' },
  FINANCE: { label: 'Finance', color: 'bg-yellow-500', description: 'Finance module access' },
  OPERATIONS: { label: 'Operations', color: 'bg-blue-500', description: 'Operations module access' },
  EMPLOYEE: { label: 'Employee', color: 'bg-gray-400', description: 'Basic self-service access' },
};

// Derive role from permission flags
function deriveRole(member: TeamMember): Role {
  if (member.isOwner) return 'OWNER';
  if (member.isAdmin) return 'ADMIN';
  if (member.isManager) return 'MANAGER';
  if (member.hasHRAccess) return 'HR';
  if (member.hasFinanceAccess) return 'FINANCE';
  if (member.hasOperationsAccess) return 'OPERATIONS';
  return 'EMPLOYEE';
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AccessControlClient() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [potentialManagers, setPotentialManagers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stats, setStats] = useState<RoleStats>({
    total: 0,
    admins: 0,
    managers: 0,
    employees: 0,
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

      // Calculate stats by derived role
      const adminCount = membersList.filter((m: TeamMember) => m.isOwner || m.isAdmin).length;
      const managerCount = membersList.filter((m: TeamMember) => !m.isOwner && !m.isAdmin && m.isManager).length;
      const employeeCount = membersList.length - adminCount - managerCount;

      setStats({
        total: membersList.length,
        admins: adminCount,
        managers: managerCount,
        employees: employeeCount,
      });

      // Get potential managers for the "Reports To" dropdown
      const managersList = membersList.filter((m: TeamMember) => m.isOwner || m.isAdmin || m.isManager);
      setPotentialManagers(managersList);
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

  // Filter members based on search
  useEffect(() => {
    if (!search) {
      setFilteredMembers(members);
      return;
    }

    const searchLower = search.toLowerCase();
    setFilteredMembers(
      members.filter(
        (m) =>
          m.name?.toLowerCase().includes(searchLower) ||
          m.email.toLowerCase().includes(searchLower)
      )
    );
  }, [members, search]);

  const updateRole = async (memberId: string, newRole: Role) => {
    if (newRole === 'OWNER') return; // Cannot set someone as owner

    setUpdatingId(memberId);
    try {
      const response = await fetch(`/api/users/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }

      // Refresh the data to get updated permissions
      await fetchMembers();
      toast.success(`Role updated to ${ROLE_CONFIG[newRole].label}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
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
      const manager = potentialManagers.find((m) => m.id === reportingToId);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? {
                ...m,
                reportingTo: manager ? { id: manager.id, name: manager.name || 'Unnamed' } : null,
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
        <Loader2 className={`${ICON_SIZES.xl} animate-spin text-gray-400`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className={`${ICON_SIZES.sm} text-gray-500`} />
              <span className="text-sm text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`${ICON_SIZES.sm} text-red-500`} />
              <span className="text-sm text-gray-600">Admins</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.admins}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className={`${ICON_SIZES.sm} text-purple-500`} />
              <span className="text-sm text-gray-600">Managers</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.managers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className={`${ICON_SIZES.sm} text-gray-400`} />
              <span className="text-sm text-gray-600">Employees</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.employees}</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Roles Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Team Roles</CardTitle>
              <CardDescription>
                Assign roles to team members. Each role grants specific access.
              </CardDescription>
            </div>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${ICON_SIZES.sm} text-gray-400`} />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full md:w-[250px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Member</TableHead>
                  <TableHead className="w-[180px]">Role</TableHead>
                  <TableHead className="w-[200px]">Reports To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      No team members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => {
                    const currentRole = deriveRole(member);
                    const isOwner = member.isOwner;

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {member.image ? (
                                <img
                                  src={member.image}
                                  alt={member.name || 'Unnamed'}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-medium text-gray-600">
                                  {getInitials(member.name, member.email)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{member.name || 'Unnamed'}</p>
                                {isOwner && (
                                  <Crown className={`${ICON_SIZES.sm} text-amber-500 flex-shrink-0`} />
                                )}
                              </div>
                              {member.name && (
                                <p className="text-sm text-gray-500 truncate">{member.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isOwner ? (
                            <Badge className={ROLE_CONFIG.OWNER.color}>
                              {ROLE_CONFIG.OWNER.label}
                            </Badge>
                          ) : (
                            <Select
                              value={currentRole}
                              onValueChange={(value) => updateRole(member.id, value as Role)}
                              disabled={updatingId === member.id}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADMIN">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-red-500" />
                                    Admin
                                  </div>
                                </SelectItem>
                                <SelectItem value="MANAGER">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                                    Manager
                                  </div>
                                </SelectItem>
                                <SelectItem value="HR">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    HR
                                  </div>
                                </SelectItem>
                                <SelectItem value="FINANCE">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                    Finance
                                  </div>
                                </SelectItem>
                                <SelectItem value="OPERATIONS">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    Operations
                                  </div>
                                </SelectItem>
                                <SelectItem value="EMPLOYEE">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                                    Employee
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.reportingTo?.id || 'none'}
                            onValueChange={(value) => updateReportingTo(member.id, value === 'none' ? null : value)}
                            disabled={updatingId === member.id || isOwner}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="No manager" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No manager</SelectItem>
                              {potentialManagers
                                .filter((m) => m.id !== member.id)
                                .map((manager) => (
                                  <SelectItem key={manager.id} value={manager.id}>
                                    {manager.name || 'Unnamed'}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Role Legend */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Role Descriptions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Admin</span>
                  <span className="text-gray-500"> - Full access to all modules</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Manager</span>
                  <span className="text-gray-500"> - Can approve direct reports</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">HR</span>
                  <span className="text-gray-500"> - Employee management</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Finance</span>
                  <span className="text-gray-500"> - Billing & budgets</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Operations</span>
                  <span className="text-gray-500"> - Assets, Subscriptions, Suppliers</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Employee</span>
                  <span className="text-gray-500"> - Self-service access only</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
