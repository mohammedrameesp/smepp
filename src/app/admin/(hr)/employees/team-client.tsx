'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  UserPlus,
  Mail,
  Loader2,
  Check,
  RefreshCw,
  Trash2,
  Clock,
  AlertCircle,
  Crown,
  Shield,
  User,
  Briefcase,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { EmployeeListTable } from '@/components/domains/hr/employees';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  role: string;
  isOwner: boolean;
  joinedAt: string;
  isEmployee: boolean;
  employeeCode: string | null;
  designation: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
}

interface Limits {
  maxUsers: number;
  currentUsers: number;
}

interface TeamClientProps {
  initialStats: {
    totalEmployees: number;
    totalNonEmployees: number;
    onLeaveToday: number;
    expiringDocuments: number;
    pendingChangeRequests: number;
  };
}

type FilterType = 'employees' | 'non-employees' | 'all';

const roleIcons: Record<string, React.ReactNode> = {
  OWNER: <Crown className="h-4 w-4 text-amber-500" />,
  ADMIN: <Shield className="h-4 w-4 text-blue-500" />,
  MANAGER: <Shield className="h-4 w-4 text-green-500" />,
  MEMBER: <User className="h-4 w-4 text-gray-500" />,
};

export function TeamClient({ initialStats }: TeamClientProps) {
  const { data: session } = useSession();

  // State
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state - local for instant switching
  const [currentTab, setCurrentTab] = useState<FilterType>('employees');

  // Action states
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isOwner = session?.user?.orgRole === 'OWNER';
  const isAdmin = session?.user?.orgRole === 'ADMIN' || isOwner;

  // Filter non-employees
  const nonEmployees = useMemo(() =>
    members.filter((m) => !m.isEmployee),
    [members]
  );

  // Stats
  const stats = useMemo(() => ({
    all: members.length,
    employees: members.filter((m) => m.isEmployee).length,
    nonEmployees: members.filter((m) => !m.isEmployee).length,
  }), [members]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/admin/team'),
        fetch('/api/admin/team/invitations'),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members);
        setLimits(data.limits);
      }

      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvitations(data.invitations);
      }
    } catch (err) {
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendInvite(id: string) {
    setResendingId(id);
    try {
      const response = await fetch(`/api/admin/team/invitations/${id}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      await navigator.clipboard.writeText(data.invitation.inviteUrl);
      setCopiedInviteId(id);
      setTimeout(() => setCopiedInviteId(null), 3000);

      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === id
            ? { ...inv, expiresAt: data.invitation.expiresAt, isExpired: false }
            : inv
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setResendingId(null);
    }
  }

  async function handleCancelInvite(id: string) {
    if (!confirm('Cancel this invitation?')) return;

    try {
      const response = await fetch(`/api/admin/team/invitations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    }
  }

  async function handleRemoveMember(id: string, name: string) {
    if (!confirm(`Remove ${name} from the organization?`)) return;

    setRemovingId(id);
    try {
      const response = await fetch(`/api/admin/team/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setMembers((prev) => prev.filter((m) => m.id !== id));
      if (limits) {
        setLimits({ ...limits, currentUsers: limits.currentUsers - 1 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setRemovingId(null);
    }
  }

  async function handleUpdateRole(memberId: string, newRole: string) {
    setUpdatingRoleId(memberId);
    try {
      const response = await fetch(`/api/admin/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setUpdatingRoleId(null);
    }
  }

  const canAdd = limits && limits.currentUsers + invitations.length < limits.maxUsers;

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!canAdd && limits && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You&apos;ve reached the user limit ({limits.maxUsers}). Upgrade your plan to add more
            team members.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          <button
            onClick={() => setCurrentTab('employees')}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2',
              currentTab === 'employees'
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:bg-background/50'
            )}
          >
            <Briefcase className="h-4 w-4" />
            Employees
            <Badge variant="secondary" className="ml-1">
              {stats.employees || initialStats.totalEmployees}
            </Badge>
          </button>
          <button
            onClick={() => setCurrentTab('non-employees')}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2',
              currentTab === 'non-employees'
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:bg-background/50'
            )}
          >
            <User className="h-4 w-4" />
            Non-Employees
            <Badge variant="secondary" className="ml-1">
              {stats.nonEmployees || initialStats.totalNonEmployees}
            </Badge>
          </button>
          <button
            onClick={() => setCurrentTab('all')}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2',
              currentTab === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:bg-background/50'
            )}
          >
            <Users className="h-4 w-4" />
            All
            <Badge variant="secondary" className="ml-1">
              {stats.all || (initialStats.totalEmployees + initialStats.totalNonEmployees)}
            </Badge>
          </button>
        </div>

        {/* Add Member Button */}
        {isAdmin && (
          <Button asChild disabled={!canAdd}>
            <Link href="/admin/employees/new">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Link>
          </Button>
        )}
      </div>

      {/* Employees Tab Content */}
      <div className={currentTab === 'employees' ? '' : 'hidden'}>
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Employees</h2>
            <p className="text-sm text-slate-500">Team members with HR profiles, leave, and payroll access</p>
          </div>
          <div className="p-4">
            <EmployeeListTable />
          </div>
        </div>
      </div>

      {/* Non-Employees Tab Content */}
      <div className={currentTab === 'non-employees' ? '' : 'hidden'}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Non-Employees
            </CardTitle>
            <CardDescription>
              Team members without HR profiles (contractors, external users, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : nonEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No non-employees found</p>
              </div>
            ) : (
              <div className="divide-y">
                {nonEmployees.map((member) => (
                  <div key={member.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                        {member.user.image ? (
                          <img
                            src={member.user.image}
                            alt={member.user.name || ''}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-slate-600">
                            {(member.user.name || member.user.email)?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {member.user.name || 'No name'}
                            {member.user.id === session?.user?.id && (
                              <span className="text-muted-foreground ml-1">(you)</span>
                            )}
                          </p>
                          {roleIcons[member.role]}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {isOwner && !member.isOwner && member.user.id !== session?.user?.id ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleUpdateRole(member.id, value)}
                            disabled={updatingRoleId === member.id}
                          >
                            <SelectTrigger className="w-[120px]">
                              {updatingRoleId === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="MEMBER">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={member.isOwner ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                        </p>
                      </div>

                      {isOwner && !member.isOwner && member.user.id !== session?.user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleRemoveMember(member.id, member.user.name || member.user.email)
                          }
                          disabled={removingId === member.id}
                        >
                          {removingId === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Tab Content - Shows summary with links to specific tabs */}
      <div className={currentTab === 'all' ? 'space-y-6' : 'hidden'}>
        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-blue-300 transition-colors"
            onClick={() => setCurrentTab('employees')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{stats.employees || initialStats.totalEmployees}</p>
              <p className="text-sm text-muted-foreground mt-1">Team members with HR profiles</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-slate-400 transition-colors"
            onClick={() => setCurrentTab('non-employees')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-slate-600" />
                Non-Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-600">{stats.nonEmployees || initialStats.totalNonEmployees}</p>
              <p className="text-sm text-muted-foreground mt-1">Contractors, external users</p>
            </CardContent>
          </Card>
        </div>

        {/* Combined List - Simple view of all members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Team Members ({stats.all || (initialStats.totalEmployees + initialStats.totalNonEmployees)})
            </CardTitle>
            <CardDescription>
              Click on Employees or Non-Employees tab for detailed view
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No team members found</p>
              </div>
            ) : (
              <div className="divide-y">
                {members.map((member) => (
                  <div key={member.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                        {member.user.image ? (
                          <img
                            src={member.user.image}
                            alt={member.user.name || ''}
                            className="h-9 w-9 rounded-full"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-slate-600">
                            {(member.user.name || member.user.email)?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.user.name || member.user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.isEmployee ? (
                            <span className="text-blue-600">Employee</span>
                          ) : (
                            <span className="text-slate-500">Non-employee</span>
                          )}
                          {member.designation && ` • ${member.designation}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {roleIcons[member.role]}
                      <Badge variant="secondary">{member.role}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} waiting to be accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {invitations.map((inv) => (
                <div key={inv.id} className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{inv.role}</Badge>
                      {inv.isExpired ? (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Expired
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires {format(new Date(inv.expiresAt), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendInvite(inv.id)}
                      disabled={resendingId === inv.id}
                    >
                      {resendingId === inv.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : copiedInviteId === inv.id ? (
                        <>
                          <Check className="h-4 w-4 mr-1 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          {inv.isExpired ? 'Regenerate' : 'Resend'}
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleCancelInvite(inv.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
