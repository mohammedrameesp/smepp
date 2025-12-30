'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  UserPlus,
  MoreVertical,
  Mail,
  Shield,
  Crown,
  Loader2,
  Trash2,
} from 'lucide-react';
import { OrgRole } from '@prisma/client';

interface TeamMember {
  id: string;
  role: OrgRole;
  isOwner: boolean;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface PendingInvitation {
  id: string;
  email: string;
  role: OrgRole;
  expiresAt: string;
}

interface TeamMembersProps {
  organizationId: string;
  members: TeamMember[];
  invitations: PendingInvitation[];
  currentUserOrgRole: OrgRole;
  isOwner: boolean;
}

const ROLE_LABELS: Record<OrgRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  MEMBER: 'Member',
};

const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  OWNER: 'Full control, billing access',
  ADMIN: 'Manage users, settings',
  MANAGER: 'Approve requests, view reports',
  MEMBER: 'Basic access',
};

export function TeamMembers({
  organizationId,
  members,
  invitations,
  currentUserOrgRole,
  isOwner,
}: TeamMembersProps) {
  const { data: session } = useSession();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManageMembers = isOwner || currentUserOrgRole === 'ADMIN';

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setError('Email is required');
      return;
    }

    setIsInviting(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      setInviteEmail('');
      setInviteRole('MEMBER');
      setIsInviteOpen(false);
      // Trigger page refresh to show new invitation
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel invitation');
      }

      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel invitation');
    }
  };

  const getRoleBadgeColor = (role: OrgRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-amber-100 text-amber-800';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'MEMBER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage who has access to your organization
              </CardDescription>
            </div>
          </div>
          {canManageMembers && (
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['MEMBER', 'MANAGER', 'ADMIN'] as OrgRole[]).map((role) => (
                          <SelectItem key={role} value={role}>
                            <div>
                              <span className="font-medium">{ROLE_LABELS[role]}</span>
                              <span className="text-gray-500 ml-2 text-sm">
                                - {ROLE_DESCRIPTIONS[role]}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInvite} disabled={isInviting}>
                    {isInviting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Active Members */}
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    {member.user.image ? (
                      <img
                        src={member.user.image}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <span className="text-gray-600 font-medium">
                        {(member.user.name || member.user.email)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {member.user.name || member.user.email}
                      </span>
                      {member.isOwner && (
                        <Crown className="h-4 w-4 text-amber-500" />
                      )}
                      {member.user.id === session?.user.id && (
                        <span className="text-xs text-gray-500">(you)</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{member.user.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getRoleBadgeColor(member.role)}>
                    {ROLE_LABELS[member.role]}
                  </Badge>
                  {canManageMembers && !member.isOwner && member.user.id !== session?.user.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Pending Invitations</h4>
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-dashed rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <span className="font-medium">{invitation.email}</span>
                        <p className="text-xs text-gray-500">
                          Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{ROLE_LABELS[invitation.role]}</Badge>
                      {canManageMembers && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleCancelInvitation(invitation.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
