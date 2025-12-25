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
  Package,
  CreditCard,
  Truck,
  CalendarDays,
  DollarSign,
  FolderKanban,
  ShoppingCart,
  FileCheck,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  subscriptionTier: string;
  enabledModules: string[];
  maxUsers: number;
  maxAssets: number;
  createdAt: string;
  industry: string | null;
  companySize: string | null;
  internalNotes: string | null;
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

interface ModuleInsights {
  assets: { total: number; requests: number; pendingRequests: number };
  subscriptions: { total: number };
  suppliers: { total: number; pending: number };
  employees: { total: number };
  leave: { totalRequests: number; pending: number };
  payroll: { totalRuns: number };
  projects: { total: number };
  'purchase-requests': { total: number; pending: number };
  documents: { total: number };
}

interface RecentActivity {
  id: string;
  action: string;
  entityType: string;
  at: string;
  actorUser: { name: string | null; email: string } | null;
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
  const [moduleInsights, setModuleInsights] = useState<ModuleInsights | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
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
        setModuleInsights(orgData.moduleInsights || null);
        setRecentActivity(orgData.recentActivity || []);

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

      {/* Installed Modules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Installed Modules
          </CardTitle>
          <CardDescription>Modules enabled for this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(org.enabledModules || []).length === 0 ? (
              <p className="text-muted-foreground">No modules installed</p>
            ) : (
              (org.enabledModules || []).map((moduleId) => {
                const moduleConfig: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
                  assets: { name: 'Assets', icon: <Package className="h-3 w-3" />, color: 'bg-blue-100 text-blue-800' },
                  subscriptions: { name: 'Subscriptions', icon: <CreditCard className="h-3 w-3" />, color: 'bg-purple-100 text-purple-800' },
                  suppliers: { name: 'Suppliers', icon: <Truck className="h-3 w-3" />, color: 'bg-green-100 text-green-800' },
                  employees: { name: 'Employees', icon: <Users className="h-3 w-3" />, color: 'bg-orange-100 text-orange-800' },
                  leave: { name: 'Leave', icon: <CalendarDays className="h-3 w-3" />, color: 'bg-teal-100 text-teal-800' },
                  payroll: { name: 'Payroll', icon: <DollarSign className="h-3 w-3" />, color: 'bg-emerald-100 text-emerald-800' },
                  projects: { name: 'Projects', icon: <FolderKanban className="h-3 w-3" />, color: 'bg-indigo-100 text-indigo-800' },
                  'purchase-requests': { name: 'Purchase Requests', icon: <ShoppingCart className="h-3 w-3" />, color: 'bg-pink-100 text-pink-800' },
                  documents: { name: 'Company Documents', icon: <FileCheck className="h-3 w-3" />, color: 'bg-amber-100 text-amber-800' },
                };
                const config = moduleConfig[moduleId] || { name: moduleId, icon: <Package className="h-3 w-3" />, color: 'bg-gray-100 text-gray-800' };
                return (
                  <Badge key={moduleId} variant="secondary" className={`${config.color} flex items-center gap-1`}>
                    {config.icon}
                    {config.name}
                  </Badge>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Module Insights */}
      {moduleInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Module Usage Insights
            </CardTitle>
            <CardDescription>Usage statistics per module</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {(org.enabledModules || []).includes('assets') && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Assets</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Total</span>
                      <span className="font-semibold text-blue-900">{moduleInsights.assets.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Requests</span>
                      <span className="font-semibold text-blue-900">{moduleInsights.assets.requests}</span>
                    </div>
                    {moduleInsights.assets.pendingRequests > 0 && (
                      <div className="flex justify-between">
                        <span className="text-orange-600">Pending</span>
                        <span className="font-semibold text-orange-700">{moduleInsights.assets.pendingRequests}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('subscriptions') && (
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-900">Subscriptions</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-700">Total</span>
                      <span className="font-semibold text-purple-900">{moduleInsights.subscriptions.total}</span>
                    </div>
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('suppliers') && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900">Suppliers</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Total</span>
                      <span className="font-semibold text-green-900">{moduleInsights.suppliers.total}</span>
                    </div>
                    {moduleInsights.suppliers.pending > 0 && (
                      <div className="flex justify-between">
                        <span className="text-orange-600">Pending</span>
                        <span className="font-semibold text-orange-700">{moduleInsights.suppliers.pending}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('employees') && (
                <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-900">Employees</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-orange-700">HR Profiles</span>
                      <span className="font-semibold text-orange-900">{moduleInsights.employees.total}</span>
                    </div>
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('leave') && (
                <div className="p-4 rounded-lg bg-teal-50 border border-teal-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="h-4 w-4 text-teal-600" />
                    <span className="font-medium text-teal-900">Leave</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-teal-700">Requests</span>
                      <span className="font-semibold text-teal-900">{moduleInsights.leave.totalRequests}</span>
                    </div>
                    {moduleInsights.leave.pending > 0 && (
                      <div className="flex justify-between">
                        <span className="text-orange-600">Pending</span>
                        <span className="font-semibold text-orange-700">{moduleInsights.leave.pending}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('payroll') && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-emerald-900">Payroll</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Payroll Runs</span>
                      <span className="font-semibold text-emerald-900">{moduleInsights.payroll.totalRuns}</span>
                    </div>
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('projects') && (
                <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderKanban className="h-4 w-4 text-indigo-600" />
                    <span className="font-medium text-indigo-900">Projects</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-indigo-700">Total</span>
                      <span className="font-semibold text-indigo-900">{moduleInsights.projects.total}</span>
                    </div>
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('purchase-requests') && (
                <div className="p-4 rounded-lg bg-pink-50 border border-pink-100">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="h-4 w-4 text-pink-600" />
                    <span className="font-medium text-pink-900">Purchase Requests</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-pink-700">Total</span>
                      <span className="font-semibold text-pink-900">{moduleInsights['purchase-requests'].total}</span>
                    </div>
                    {moduleInsights['purchase-requests'].pending > 0 && (
                      <div className="flex justify-between">
                        <span className="text-orange-600">Pending</span>
                        <span className="font-semibold text-orange-700">{moduleInsights['purchase-requests'].pending}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('documents') && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-900">Documents</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-amber-700">Total</span>
                      <span className="font-semibold text-amber-900">{moduleInsights.documents.total}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Last 10 actions in this organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">
                      {activity.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.actorUser?.name || activity.actorUser?.email || 'System'}
                      {' • '}
                      {activity.entityType}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
