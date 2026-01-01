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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

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

type FilterType = 'all' | 'employees' | 'non-employees';

const roleIcons: Record<string, React.ReactNode> = {
  OWNER: <Crown className="h-4 w-4 text-amber-500" />,
  ADMIN: <Shield className="h-4 w-4 text-blue-500" />,
  MANAGER: <Shield className="h-4 w-4 text-green-500" />,
  MEMBER: <User className="h-4 w-4 text-gray-500" />,
};

export default function TeamPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state from URL
  const currentFilter = (searchParams.get('filter') as FilterType) || 'all';

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'MANAGER' | 'ADMIN'>('MEMBER');
  const [inviteIsEmployee, setInviteIsEmployee] = useState(false);
  const [inviteOnWPS, setInviteOnWPS] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Action states
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const isOwner = session?.user?.orgRole === 'OWNER';
  const isAdmin = session?.user?.orgRole === 'ADMIN' || isOwner;

  // Filter members based on current filter
  const filteredMembers = useMemo(() => {
    switch (currentFilter) {
      case 'employees':
        return members.filter((m) => m.isEmployee);
      case 'non-employees':
        return members.filter((m) => !m.isEmployee);
      default:
        return members;
    }
  }, [members, currentFilter]);

  // Stats for filter tabs
  const stats = useMemo(() => ({
    all: members.length,
    employees: members.filter((m) => m.isEmployee).length,
    nonEmployees: members.filter((m) => !m.isEmployee).length,
  }), [members]);

  useEffect(() => {
    fetchData();
  }, []);

  function setFilter(filter: FilterType) {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
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

      // Refresh invitations list
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

      // Copy URL to clipboard
      await navigator.clipboard.writeText(data.invitation.inviteUrl);
      setCopiedInviteId(id);
      setTimeout(() => setCopiedInviteId(null), 3000);

      // Update invitation in state
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
    if (!confirm(`Change this member's role to ${newRole}?`)) {
      return;
    }

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

      // Update member in state
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

  function resetInviteDialog() {
    setInviteEmail('');
    setInviteRole('MEMBER');
    setInviteIsEmployee(false);
    setInviteOnWPS(false);
    setInviteResult(null);
    setError(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canInvite = limits && limits.currentUsers + invitations.length < limits.maxUsers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            Manage your organization members
            {limits && (
              <span className="ml-2 text-sm">
                ({limits.currentUsers} / {limits.maxUsers} users)
              </span>
            )}
          </p>
        </div>

        {isAdmin && (
          <Dialog
            open={inviteOpen}
            onOpenChange={(open) => {
              setInviteOpen(open);
              if (!open) resetInviteDialog();
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={!canInvite}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
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
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your organization
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
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        disabled={inviting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(v) => setInviteRole(v as 'MEMBER' | 'MANAGER' | 'ADMIN')}
                        disabled={inviting}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">
                            <div className="flex flex-col">
                              <span>Member</span>
                              <span className="text-xs text-muted-foreground">Basic access</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="MANAGER">
                            <div className="flex flex-col">
                              <span>Manager</span>
                              <span className="text-xs text-muted-foreground">
                                Approve requests, view reports
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="ADMIN">
                            <div className="flex flex-col">
                              <span>Admin</span>
                              <span className="text-xs text-muted-foreground">
                                Manage users and settings
                              </span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Employee options */}
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-sm font-medium">Employee Settings</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isEmployee"
                          checked={inviteIsEmployee}
                          onCheckedChange={(checked) => {
                            setInviteIsEmployee(checked === true);
                            if (!checked) setInviteOnWPS(false);
                          }}
                          disabled={inviting}
                        />
                        <label
                          htmlFor="isEmployee"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          This person will be an employee
                        </label>
                      </div>
                      {inviteIsEmployee && (
                        <div className="flex items-center space-x-2 ml-6">
                          <Checkbox
                            id="onWPS"
                            checked={inviteOnWPS}
                            onCheckedChange={(checked) => setInviteOnWPS(checked === true)}
                            disabled={inviting}
                          />
                          <label
                            htmlFor="onWPS"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
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
        )}
      </div>

      {!canInvite && limits && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You&apos;ve reached the user limit ({limits.maxUsers}). Upgrade your plan to add more
            team members.
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Tabs */}
      <Tabs value={currentFilter} onValueChange={(v) => setFilter(v as FilterType)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            All Members
            <Badge variant="secondary" className="ml-1">
              {stats.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Employees
            <Badge variant="secondary" className="ml-1">
              {stats.employees}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="non-employees" className="gap-2">
            <User className="h-4 w-4" />
            Non-Employees
            <Badge variant="secondary" className="ml-1">
              {stats.nonEmployees}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {currentFilter === 'all'
              ? 'Members'
              : currentFilter === 'employees'
                ? 'Employees'
                : 'Non-Employees'}
          </CardTitle>
          <CardDescription>
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
            {currentFilter !== 'all' && ` (filtered from ${members.length} total)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                No {currentFilter === 'employees' ? 'employees' : currentFilter === 'non-employees' ? 'non-employees' : 'members'} found
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredMembers.map((member) => (
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
                        {member.isEmployee && (
                          <Badge variant="outline" className="text-xs">
                            <Briefcase className="h-3 w-3 mr-1" />
                            Employee
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      {member.isEmployee && (member.employeeCode || member.designation) && (
                        <p className="text-xs text-muted-foreground">
                          {member.employeeCode && <span>{member.employeeCode}</span>}
                          {member.employeeCode && member.designation && <span> • </span>}
                          {member.designation && <span>{member.designation}</span>}
                        </p>
                      )}
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
                            <SelectItem value="MANAGER">Manager</SelectItem>
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

                    {/* Employee link */}
                    {member.isEmployee && (
                      <Link href={`/admin/employees/${member.id}`}>
                        <Button variant="ghost" size="icon" title="View employee details">
                          <ExternalLink className="h-4 w-4 text-blue-500" />
                        </Button>
                      </Link>
                    )}

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

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} waiting to be
              accepted
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
