'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Clock,
  AlertCircle,
  Crown,
  Shield,
  User,
  Briefcase,
  ChevronDown,
  Send,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { EmployeeListTable } from '@/components/domains/hr/employees';

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

type FilterType = 'all' | 'employees' | 'non-employees';

const roleIcons: Record<string, React.ReactNode> = {
  OWNER: <Crown className="h-4 w-4 text-amber-500" />,
  ADMIN: <Shield className="h-4 w-4 text-blue-500" />,
  MANAGER: <Shield className="h-4 w-4 text-green-500" />,
  MEMBER: <User className="h-4 w-4 text-gray-500" />,
};

export function TeamClient({ initialStats }: TeamClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab from URL
  const currentTab = (searchParams.get('tab') as FilterType) || 'employees';

  // Add Member dialog state
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberName, setAddMemberName] = useState('');
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<string>('EMPLOYEE');
  const [addMemberCanLogin, setAddMemberCanLogin] = useState(true);
  const [addMemberIsEmployee, setAddMemberIsEmployee] = useState(true);
  const [addMemberOnWPS, setAddMemberOnWPS] = useState(true);
  const [addingMember, setAddingMember] = useState(false);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('MEMBER');
  const [inviteIsEmployee, setInviteIsEmployee] = useState(false);
  const [inviteOnWPS, setInviteOnWPS] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Action states
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isOwner = session?.user?.orgRole === 'OWNER';
  const isAdmin = session?.user?.orgRole === 'ADMIN' || isOwner;

  // Filter non-employees for the non-employees tab
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

  function setTab(tab: FilterType) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'employees') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

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

  // Add Member directly
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddingMember(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addMemberName,
          email: addMemberCanLogin ? addMemberEmail : undefined,
          role: addMemberRole,
          canLogin: addMemberCanLogin,
          isEmployee: addMemberIsEmployee,
          isOnWps: addMemberIsEmployee ? addMemberOnWPS : false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      // Refresh data
      await fetchData();
      resetAddMemberDialog();
      setAddMemberOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  }

  // Send invitation
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/team/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          isEmployee: inviteIsEmployee,
          onWPS: inviteOnWPS,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setInviteResult({ url: data.invitation.inviteUrl });

      // Refresh invitations
      const invitesRes = await fetch('/api/admin/team/invitations');
      if (invitesRes.ok) {
        const invData = await invitesRes.json();
        setInvitations(invData.invitations);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
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

  async function copyInviteUrl() {
    if (inviteResult?.url) {
      await navigator.clipboard.writeText(inviteResult.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function resetAddMemberDialog() {
    setAddMemberName('');
    setAddMemberEmail('');
    setAddMemberRole('EMPLOYEE');
    setAddMemberCanLogin(true);
    setAddMemberIsEmployee(true);
    setAddMemberOnWPS(true);
    setError(null);
  }

  function resetInviteDialog() {
    setInviteEmail('');
    setInviteRole('MEMBER');
    setInviteIsEmployee(false);
    setInviteOnWPS(false);
    setInviteResult(null);
    setError(null);
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

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={(v) => setTab(v as FilterType)}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="employees" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Employees
              <Badge variant="secondary" className="ml-1">
                {initialStats.totalEmployees}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="non-employees" className="gap-2">
              <User className="h-4 w-4" />
              Non-Employees
              <Badge variant="secondary" className="ml-1">
                {stats.nonEmployees || initialStats.totalNonEmployees}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Users className="h-4 w-4" />
              All
              <Badge variant="secondary" className="ml-1">
                {stats.all || (initialStats.totalEmployees + initialStats.totalNonEmployees)}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Add Member Dropdown */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={!canAdd}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAddMemberOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add directly
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInviteOpen(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Send invitation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Employees Tab */}
        <TabsContent value="employees" className="mt-6">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Employees</h2>
              <p className="text-sm text-slate-500">Team members with HR profiles, leave, and payroll access</p>
            </div>
            <div className="p-4">
              <EmployeeListTable />
            </div>
          </div>
        </TabsContent>

        {/* Non-Employees Tab */}
        <TabsContent value="non-employees" className="mt-6">
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
        </TabsContent>

        {/* All Tab - Shows both */}
        <TabsContent value="all" className="mt-6 space-y-6">
          {/* Employees Section */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Employees</h2>
            </div>
            <div className="p-4">
              <EmployeeListTable />
            </div>
          </div>

          {/* Non-Employees Section */}
          {nonEmployees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Non-Employees ({nonEmployees.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {nonEmployees.map((member) => (
                    <div key={member.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                          {member.user.image ? (
                            <img
                              src={member.user.image}
                              alt={member.user.name || ''}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-slate-600">
                              {(member.user.name || member.user.email)?.[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.user.name || member.user.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{member.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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

      {/* Add Member Dialog */}
      <Dialog
        open={addMemberOpen}
        onOpenChange={(open) => {
          setAddMemberOpen(open);
          if (!open) resetAddMemberDialog();
        }}
      >
        <DialogContent>
          <form onSubmit={handleAddMember}>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Create a new team member account directly
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && (
                <Alert variant="error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Full name"
                  value={addMemberName}
                  onChange={(e) => setAddMemberName(e.target.value)}
                  required
                  disabled={addingMember}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canLogin"
                  checked={addMemberCanLogin}
                  onCheckedChange={(checked) => setAddMemberCanLogin(checked === true)}
                  disabled={addingMember}
                />
                <label htmlFor="canLogin" className="text-sm font-medium">
                  Can login to the system
                </label>
              </div>

              {addMemberCanLogin && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@company.com"
                    value={addMemberEmail}
                    onChange={(e) => setAddMemberEmail(e.target.value)}
                    required={addMemberCanLogin}
                    disabled={addingMember}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={addMemberRole}
                  onValueChange={setAddMemberRole}
                  disabled={addingMember}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
                    <SelectItem value="FINANCE_MANAGER">Finance Manager</SelectItem>
                    <SelectItem value="DIRECTOR">Director</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isEmployee"
                    checked={addMemberIsEmployee}
                    onCheckedChange={(checked) => {
                      setAddMemberIsEmployee(checked === true);
                      if (!checked) setAddMemberOnWPS(false);
                    }}
                    disabled={addingMember}
                  />
                  <label htmlFor="isEmployee" className="text-sm font-medium">
                    This is an employee (include in HR features)
                  </label>
                </div>
                {addMemberIsEmployee && (
                  <div className="flex items-center space-x-2 ml-6">
                    <Checkbox
                      id="onWPS"
                      checked={addMemberOnWPS}
                      onCheckedChange={(checked) => setAddMemberOnWPS(checked === true)}
                      disabled={addingMember}
                    />
                    <label htmlFor="onWPS" className="text-sm font-medium">
                      Include in WPS (payroll)
                    </label>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddMemberOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addingMember || !addMemberName || (addMemberCanLogin && !addMemberEmail)}>
                {addingMember ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) resetInviteDialog();
        }}
      >
        <DialogContent>
          {inviteResult ? (
            <>
              <DialogHeader>
                <DialogTitle>Invitation Created</DialogTitle>
                <DialogDescription>Share this link with {inviteEmail}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Invitation Link</Label>
                  <div className="flex gap-2">
                    <Input value={inviteResult.url} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={copyInviteUrl}>
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">This link expires in 7 days</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setInviteOpen(false)}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleInvite}>
              <DialogHeader>
                <DialogTitle>Send Invitation</DialogTitle>
                <DialogDescription>
                  Send an email invitation to join your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {error && (
                  <Alert variant="error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email Address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    disabled={inviting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteRole">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={setInviteRole}
                    disabled={inviting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="inviteIsEmployee"
                      checked={inviteIsEmployee}
                      onCheckedChange={(checked) => {
                        setInviteIsEmployee(checked === true);
                        if (!checked) setInviteOnWPS(false);
                      }}
                      disabled={inviting}
                    />
                    <label htmlFor="inviteIsEmployee" className="text-sm font-medium">
                      This person will be an employee
                    </label>
                  </div>
                  {inviteIsEmployee && (
                    <div className="flex items-center space-x-2 ml-6">
                      <Checkbox
                        id="inviteOnWPS"
                        checked={inviteOnWPS}
                        onCheckedChange={(checked) => setInviteOnWPS(checked === true)}
                        disabled={inviting}
                      />
                      <label htmlFor="inviteOnWPS" className="text-sm font-medium">
                        Include in WPS (payroll)
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviting || !inviteEmail}>
                  {inviting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
