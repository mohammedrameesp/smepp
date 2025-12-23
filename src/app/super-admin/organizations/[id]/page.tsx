'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  ArrowLeft,
  Building2,
  Users,
  Mail,
  Calendar,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  subscriptionTier: string;
  maxUsers: number;
  maxAssets: number;
  createdAt: string;
  _count: {
    members: number;
    assets: number;
  };
  members: Array<{
    id: string;
    role: string;
    isOwner: boolean;
    joinedAt: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
}

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [org, setOrg] = useState<Organization | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMaxUsers, setEditMaxUsers] = useState(0);
  const [editMaxAssets, setEditMaxAssets] = useState(0);
  const [updating, setUpdating] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [orgRes, invRes] = await Promise.all([
          fetch(`/api/super-admin/organizations/${orgId}`),
          fetch(`/api/super-admin/organizations/${orgId}/invitations`),
        ]);

        if (!orgRes.ok) {
          throw new Error('Organization not found');
        }

        const orgData = await orgRes.json();
        setOrg(orgData.organization);

        if (invRes.ok) {
          const invData = await invRes.json();
          setInvitations(invData.invitations || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load organization');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgId]);

  const handleResendInvitation = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      const response = await fetch(`/api/super-admin/invitations/${invitationId}/resend`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }

      const data = await response.json();

      // Update the invitation in state
      setInvitations(prev =>
        prev.map(inv =>
          inv.id === invitationId
            ? { ...inv, expiresAt: data.invitation.expiresAt, isExpired: false }
            : inv
        )
      );

      // Copy to clipboard
      if (data.invitation.inviteUrl) {
        await navigator.clipboard.writeText(data.invitation.inviteUrl);
        setCopiedUrl(invitationId);
        setTimeout(() => setCopiedUrl(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setResendingId(null);
    }
  };

  const openEditDialog = () => {
    if (org) {
      setEditName(org.name);
      setEditMaxUsers(org.maxUsers);
      setEditMaxAssets(org.maxAssets);
      setEditDialogOpen(true);
    }
  };

  const handleEditOrg = async () => {
    setUpdating(true);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          maxUsers: editMaxUsers,
          maxAssets: editMaxAssets,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update organization');
      }

      const data = await response.json();
      setOrg(prev => prev ? { ...prev, ...data.organization } : null);
      setEditDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (deleteConfirmText !== org?.slug) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete organization');
      }

      router.push('/super-admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    setInviteSuccess(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      // Add new invitation to list
      setInvitations(prev => [
        {
          id: data.invitation.id,
          email: data.invitation.email,
          role: data.invitation.role,
          expiresAt: data.invitation.expiresAt,
          createdAt: new Date().toISOString(),
          isExpired: false,
        },
        ...prev,
      ]);

      // Copy invite URL to clipboard
      if (data.invitation.inviteUrl) {
        await navigator.clipboard.writeText(data.invitation.inviteUrl);
        setInviteSuccess('Invitation sent! Link copied to clipboard.');
      } else {
        setInviteSuccess('Invitation sent!');
      }

      setInviteEmail('');
      setInviteRole('MEMBER');

      // Close dialog after short delay
      setTimeout(() => {
        setInviteDialogOpen(false);
        setInviteSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Organization not found'}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/super-admin">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const owner = org.members.find(m => m.isOwner);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link
          href="/super-admin"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      {/* Organization Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {org.logoUrl ? (
            <img
              src={org.logoUrl}
              alt={org.name}
              className="h-16 w-16 rounded-xl object-contain bg-gray-100"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className="text-muted-foreground font-mono">{org.slug}.{APP_DOMAIN.split(':')[0]}</p>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={org.subscriptionTier === 'FREE' ? 'secondary' : 'default'}>
                {org.subscriptionTier}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created {formatDistanceToNow(new Date(org.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openEditDialog}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => setInviteDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
          <a
            href={`${window.location.protocol}//${org.slug}.${APP_DOMAIN}/admin`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Portal
            </Button>
          </a>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-2xl">{org._count.members} / {org.maxUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assets</CardDescription>
            <CardTitle className="text-2xl">{org._count.assets} / {org.maxAssets}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Owner</CardDescription>
            <CardTitle className="text-lg truncate">{owner?.user.email || 'No owner'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Invitations</CardDescription>
            <CardTitle className="text-2xl">{invitations.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
          </CardTitle>
          <CardDescription>Users in this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {org.members.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No members yet</p>
          ) : (
            <div className="divide-y">
              {org.members.map((member) => (
                <div key={member.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {member.user.name || member.user.email}
                      {member.isOwner && (
                        <Badge variant="outline" className="ml-2">Owner</Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{member.role}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
          <CardDescription>Invitations waiting to be accepted</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending invitations</p>
          ) : (
            <div className="divide-y">
              {invitations.map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
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
                          Expires {format(new Date(inv.expiresAt), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResendInvitation(inv.id)}
                    disabled={resendingId === inv.id}
                  >
                    {resendingId === inv.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : copiedUrl === inv.id ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        {inv.isExpired ? 'Regenerate' : 'Resend & Copy'}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Organization Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Organization Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Organization name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-max-users">Max Users</Label>
                <Input
                  id="edit-max-users"
                  type="number"
                  min={1}
                  value={editMaxUsers}
                  onChange={(e) => setEditMaxUsers(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-assets">Max Assets</Label>
                <Input
                  id="edit-max-assets"
                  type="number"
                  min={1}
                  value={editMaxAssets}
                  onChange={(e) => setEditMaxAssets(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleEditOrg} disabled={updating || !editName.trim()}>
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to join {org.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {inviteSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <Check className="h-4 w-4" />
                <AlertDescription>{inviteSuccess}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={inviting || !!inviteSuccess}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={setInviteRole}
                disabled={inviting || !!inviteSuccess}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {inviteRole === 'OWNER' && 'Full control over the organization'}
                {inviteRole === 'ADMIN' && 'Can manage users and settings'}
                {inviteRole === 'MANAGER' && 'Can manage team members'}
                {inviteRole === 'MEMBER' && 'Standard access to organization features'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={inviting}>
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={inviting || !inviteEmail.trim() || !!inviteSuccess}
            >
              {inviting ? (
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

      {/* Delete Organization Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Organization</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the organization and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Deleting this organization will remove:
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li>{org._count.members} member(s)</li>
                  <li>{org._count.assets} asset(s)</li>
                  <li>{invitations.length} pending invitation(s)</li>
                  <li>All organization data</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <span className="font-mono font-bold">{org.slug}</span> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={org.slug}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrg}
              disabled={deleting || deleteConfirmText !== org.slug}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Organization
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
