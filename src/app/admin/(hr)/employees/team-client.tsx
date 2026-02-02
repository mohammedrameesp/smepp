/**
 * @module app/admin/(hr)/employees/team-client
 * @description Client component for managing organization team members.
 * Provides a unified interface for viewing employees vs. service accounts,
 * managing pending invitations, and handling member lifecycle operations.
 *
 * @features
 * - Tab-based view: Employees vs Service Accounts
 * - Pending invitations management (resend, cancel, copy link)
 * - Pending members management (users awaiting authentication)
 * - Role management for non-owner members (owner only)
 * - Member removal with confirmation dialog
 * - Real-time expiration status display for invites
 *
 * @roles
 * - Owner: Full access including role changes and member removal
 * - Admin: Can add members and view all sections
 * - Member: Read-only access to team views
 *
 * @dependencies
 * - GET /api/admin/team - Fetches team members
 * - GET /api/admin/team/invitations - Fetches pending invitations
 * - POST /api/admin/team/invitations/:id - Resends invitation
 * - DELETE /api/admin/team/invitations/:id - Cancels invitation
 * - PATCH /api/admin/team/:id - Updates member role
 * - DELETE /api/admin/team/:id - Removes member
 * - POST /api/admin/team/:id/resend - Resends auth invite to pending member
 */
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
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
  AtSign,
} from 'lucide-react';
import { formatDistanceToNow, format, differenceInDays, differenceInHours } from 'date-fns';
import { EmployeeListTableClient } from '@/features/employees/components';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

interface PendingStatus {
  isPending: boolean;
  type: 'credentials' | 'sso' | null;
  message: string | null;
  isExpired?: boolean;
  expiresAt?: string;
}

interface Member {
  id: string;
  role: string;
  isOwner: boolean;
  joinedAt: string;
  isEmployee: boolean;
  employeeCode: string | null;
  designation: string | null;
  department: string | null;
  pendingStatus: PendingStatus | null;
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
  isEmployee: boolean;
}


interface AuthConfig {
  allowedMethods: string[];
  hasCredentials: boolean;
  hasSSO: boolean;
  hasCustomGoogleOAuth: boolean;
  hasCustomAzureOAuth: boolean;
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

type FilterType = 'employees' | 'service-accounts';

const roleIcons: Record<string, React.ReactNode> = {
  OWNER: <Crown className={cn(ICON_SIZES.sm, 'text-amber-500')} />,
  ADMIN: <Shield className={cn(ICON_SIZES.sm, 'text-red-500')} />,
  MANAGER: <Shield className={cn(ICON_SIZES.sm, 'text-purple-500')} />,
  HR: <Shield className={cn(ICON_SIZES.sm, 'text-green-500')} />,
  FINANCE: <Shield className={cn(ICON_SIZES.sm, 'text-yellow-500')} />,
  OPERATIONS: <Shield className={cn(ICON_SIZES.sm, 'text-blue-500')} />,
  EMPLOYEE: <User className={cn(ICON_SIZES.sm, 'text-gray-500')} />,
  MEMBER: <User className={cn(ICON_SIZES.sm, 'text-gray-500')} />,
};

const roleLabels: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  HR: 'HR',
  FINANCE: 'Finance',
  OPERATIONS: 'Operations',
  EMPLOYEE: 'Employee',
  MEMBER: 'Employee', // Legacy fallback
};

export function TeamClient({ initialStats }: TeamClientProps) {
  const { data: session } = useSession();

  // State
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [, setAuthConfig] = useState<AuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state - local for instant switching
  const [currentTab, setCurrentTab] = useState<FilterType>('employees');

  // Action states
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendingMemberId, setResendingMemberId] = useState<string | null>(null);
  const [resendMemberSuccess, setResendMemberSuccess] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  const isOwner = session?.user?.isOwner;
  const isAdmin = session?.user?.isOwner || session?.user?.isAdmin;

  // Filter non-employees (exclude pending members - they show in Pending section)
  const nonEmployees = useMemo(() =>
    members.filter((m) => !m.isEmployee && !m.pendingStatus?.isPending),
    [members]
  );

  // Filter pending members based on current tab
  const pendingMembers = useMemo(() =>
    members.filter((m) =>
      m.pendingStatus?.isPending &&
      (currentTab === 'employees' ? m.isEmployee : !m.isEmployee)
    ),
    [members, currentTab]
  );

  // Filter invitations based on current tab
  const filteredInvitations = useMemo(() =>
    invitations.filter((inv) =>
      currentTab === 'employees' ? inv.isEmployee : !inv.isEmployee
    ),
    [invitations, currentTab]
  );

  // Stats (exclude pending from counts - they show in Pending section)
  const stats = useMemo(() => ({
    employees: members.filter((m) => m.isEmployee && !m.pendingStatus?.isPending).length,
    serviceAccounts: members.filter((m) => !m.isEmployee && !m.pendingStatus?.isPending).length,
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
        setAuthConfig(data.authConfig);
      }

      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvitations(data.invitations);
      }
    } catch {
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

  function openRemoveDialog(id: string, name: string) {
    setMemberToRemove({ id, name });
    setRemoveDialogOpen(true);
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return;

    const { id } = memberToRemove;
    setRemovingId(id);
    setRemoveDialogOpen(false);

    try {
      const response = await fetch(`/api/admin/team/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setRemovingId(null);
      setMemberToRemove(null);
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

  async function handleResendMemberInvite(memberId: string, pendingType: 'credentials' | 'sso' | null) {
    setResendingMemberId(memberId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/team/${memberId}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: pendingType }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend');
      }

      setResendMemberSuccess(memberId);
      setTimeout(() => setResendMemberSuccess(null), 3000);

      // Refresh data to get updated expiry times
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setResendingMemberId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <AlertCircle className={ICON_SIZES.sm} />
          <AlertDescription>{error}</AlertDescription>
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
            <Briefcase className={ICON_SIZES.sm} />
            Employees
            <Badge variant="secondary" className="ml-1">
              {stats.employees || initialStats.totalEmployees}
            </Badge>
          </button>
          <button
            onClick={() => setCurrentTab('service-accounts')}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2',
              currentTab === 'service-accounts'
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:bg-background/50'
            )}
          >
            <AtSign className={ICON_SIZES.sm} />
            Service Accounts
            <Badge variant="secondary" className="ml-1">
              {stats.serviceAccounts || initialStats.totalNonEmployees}
            </Badge>
          </button>
        </div>

        {/* Add Member Button */}
        {isAdmin && (
          <Button asChild>
            <Link href="/admin/employees/new">
              <UserPlus className={cn(ICON_SIZES.sm, 'mr-2')} />
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
            <EmployeeListTableClient />
          </div>
        </div>
      </div>

      {/* Service Accounts Tab Content */}
      <div className={currentTab === 'service-accounts' ? '' : 'hidden'}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AtSign className={ICON_SIZES.md} />
              Service Accounts
            </CardTitle>
            <CardDescription>
              Shared accounts for system use (info@, admin@, support@, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className={cn(ICON_SIZES.xl, 'animate-spin text-muted-foreground')} />
              </div>
            ) : nonEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AtSign className={cn(ICON_SIZES['3xl'], 'mx-auto mb-4 opacity-50')} />
                <p>No service accounts found</p>
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
                          {member.isOwner ? roleIcons['OWNER'] : roleIcons[member.role]}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        {(member.designation || member.department) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {member.designation}
                            {member.designation && member.department && ' · '}
                            {member.department}
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
                            <SelectTrigger className="w-[140px]">
                              {updatingRoleId === member.id ? (
                                <Loader2 className={cn(ICON_SIZES.sm, 'animate-spin')} />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                              <SelectItem value="HR">HR</SelectItem>
                              <SelectItem value="FINANCE">Finance</SelectItem>
                              <SelectItem value="OPERATIONS">Operations</SelectItem>
                              {!['ADMIN', 'MANAGER', 'HR', 'FINANCE', 'OPERATIONS'].includes(member.role) && (
                                <SelectItem value={member.role}>{roleLabels[member.role] || member.role}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={member.isOwner ? 'default' : 'secondary'}>
                            {member.isOwner ? 'Owner' : (roleLabels[member.role] || member.role)}
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
                            openRemoveDialog(member.id, member.user.name || member.user.email)
                          }
                          disabled={removingId === member.id}
                        >
                          {removingId === member.id ? (
                            <Loader2 className={cn(ICON_SIZES.sm, 'animate-spin')} />
                          ) : (
                            <Trash2 className={cn(ICON_SIZES.sm, 'text-red-500')} />
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

      {/* Pending Invitations - People who haven't accepted yet */}
      {filteredInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className={ICON_SIZES.md} />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {filteredInvitations.length} invitation{filteredInvitations.length !== 1 ? 's' : ''} waiting to be accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {filteredInvitations.map((inv) => (
                <div key={inv.id} className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{roleLabels[inv.role] || inv.role}</Badge>
                      {inv.isExpired ? (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className={ICON_SIZES.xs} />
                          Expired
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <Clock className={ICON_SIZES.xs} />
                          {(() => {
                            const expiryDate = new Date(inv.expiresAt);
                            const daysLeft = differenceInDays(expiryDate, new Date());
                            const hoursLeft = differenceInHours(expiryDate, new Date());
                            if (daysLeft > 1) return `${daysLeft} days to accept`;
                            if (daysLeft === 1) return '1 day to accept';
                            if (hoursLeft > 0) return `${hoursLeft} hours to accept`;
                            return 'Expires soon';
                          })()}
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
                        <Loader2 className={cn(ICON_SIZES.sm, 'animate-spin')} />
                      ) : copiedInviteId === inv.id ? (
                        <>
                          <Check className={cn(ICON_SIZES.sm, 'mr-1 text-green-600')} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <RefreshCw className={cn(ICON_SIZES.sm, 'mr-1')} />
                          {inv.isExpired ? 'Regenerate' : 'Resend'}
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleCancelInvite(inv.id)}>
                      <Trash2 className={cn(ICON_SIZES.sm, 'text-red-500')} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Members - Members who haven't authenticated yet */}
      {pendingMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className={ICON_SIZES.md} />
              Pending Members
            </CardTitle>
            <CardDescription>
              {pendingMembers.length} member{pendingMembers.length !== 1 ? 's' : ''} awaiting authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {pendingMembers.map((member) => (
                <div key={member.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-lg font-semibold text-slate-600">
                        {(member.user.name || member.user.email)?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.user.name || 'No name'}</p>
                        {member.employeeCode && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {member.employeeCode}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{roleLabels[member.role] || member.role}</Badge>
                        {(member.designation || member.department) && (
                          <span className="text-xs text-muted-foreground">
                            {member.designation}
                            {member.designation && member.department && ' · '}
                            {member.department}
                          </span>
                        )}
                        {member.pendingStatus?.isExpired ? (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className={ICON_SIZES.xs} />
                            Expired
                          </span>
                        ) : member.pendingStatus?.expiresAt ? (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <Clock className={ICON_SIZES.xs} />
                            {(() => {
                              const expiryDate = new Date(member.pendingStatus.expiresAt);
                              const daysLeft = differenceInDays(expiryDate, new Date());
                              const hoursLeft = differenceInHours(expiryDate, new Date());
                              if (daysLeft > 1) return `${daysLeft} days to accept`;
                              if (daysLeft === 1) return '1 day to accept';
                              if (hoursLeft > 0) return `${hoursLeft} hours to accept`;
                              return 'Expires soon';
                            })()}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <Clock className={ICON_SIZES.xs} />
                            {member.pendingStatus?.message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendMemberInvite(member.id, member.pendingStatus?.type || null)}
                      disabled={resendingMemberId === member.id}
                    >
                      {resendingMemberId === member.id ? (
                        <Loader2 className={cn(ICON_SIZES.sm, "animate-spin")} />
                      ) : resendMemberSuccess === member.id ? (
                        <>
                          <Check className={cn(ICON_SIZES.sm, "mr-1 text-green-600")} />
                          Sent!
                        </>
                      ) : (
                        <>
                          <RefreshCw className={`${ICON_SIZES.sm} mr-1`} />
                          {member.pendingStatus?.isExpired ? 'Regenerate' : 'Resend'}
                        </>
                      )}
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openRemoveDialog(member.id, member.user.name || member.user.email)}
                        disabled={removingId === member.id}
                        title="Remove pending member"
                      >
                        {removingId === member.id ? (
                          <Loader2 className={cn(ICON_SIZES.sm, "animate-spin")} />
                        ) : (
                          <Trash2 className={cn(ICON_SIZES.sm, "text-red-500")} />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from the organization?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose: Comprehensive team member management for organization admins
 *
 * Strengths:
 * - Clean tab-based UI separating employees from service accounts
 * - Proper role-based UI rendering (owner vs admin vs member)
 * - Comprehensive pending state handling (invitations + pending auth)
 * - Good UX with confirmation dialogs for destructive actions
 * - Expiration countdown with hours/days granularity
 * - Clipboard integration for invite link sharing
 *
 * Weaknesses:
 * - Large component (700+ lines) could benefit from extraction
 * - Role icons and labels could be extracted to shared constants
 * - Uses native confirm() instead of custom dialog for cancel invite
 * - No pagination for large team lists
 * - Empty dependency array in fetchData useEffect
 *
 * Security:
 * - Proper session-based role checks before showing actions
 * - Cannot modify own role or remove self
 * - Owner role required for role changes and removals
 *
 * Recommendations:
 * - Extract PendingInvitations and PendingMembers to sub-components
 * - Replace native confirm() with AlertDialog component
 * - Add eslint-disable comment or fix fetchData dependency
 * - Consider virtualized list for large organizations
 * - Add bulk operations for enterprise use cases
 */
