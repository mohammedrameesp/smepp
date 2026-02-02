/**
 * @module super-admin/admins/page
 * @description Super Admins management page for inviting and managing platform administrators.
 * Provides functionality to view, invite, and remove super admin users.
 *
 * @features
 * - List all super admins with 2FA and email verification status
 * - Invite new super admins via email
 * - Remove super admin privileges with confirmation dialog
 * - Search/filter super admins by name or email
 * - Stats display (total, 2FA enabled, verified)
 *
 * @security
 * - Super admin only access
 * - Warning displayed when inviting new admins about privilege level
 * - Confirmation required before removing admin privileges
 *
 * @api
 * - GET /api/super-admin/admins - List all super admins
 * - POST /api/super-admin/admins - Invite new super admin
 * - DELETE /api/super-admin/admins/[id] - Remove super admin privileges
 */
'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  UserPlus,
  Search,
  Mail,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  X,
  Loader2,
  Trash2,
  CheckCircle,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { getDisplayInitials } from '@/lib/utils/user-display';

interface SuperAdmin {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  emailVerified: string | null;
}

export default function SuperAdminsPage() {
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Remove confirmation dialog state
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<SuperAdmin | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      const response = await fetch('/api/super-admin/admins');
      if (!response.ok) throw new Error('Failed to fetch admins');
      const data = await response.json();
      setAdmins(data.superAdmins);
    } catch {
      setError('Failed to load super admins');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);

    try {
      const response = await fetch('/api/super-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite admin');
      }

      toast.success(data.message);
      setInviteEmail('');
      setInviteName('');
      setShowInvite(false);
      fetchAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite admin');
    } finally {
      setInviting(false);
    }
  }

  function openRemoveDialog(admin: SuperAdmin) {
    setAdminToRemove(admin);
    setShowRemoveDialog(true);
  }

  function closeRemoveDialog() {
    setShowRemoveDialog(false);
    setAdminToRemove(null);
  }

  async function handleRemoveAdmin() {
    if (!adminToRemove) return;

    setRemoving(true);

    try {
      const response = await fetch(`/api/super-admin/admins/${adminToRemove.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove admin');
      }

      toast.success('Super admin privileges removed');
      closeRemoveDialog();
      fetchAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove admin');
    } finally {
      setRemoving(false);
    }
  }

  const filteredAdmins = admins.filter(admin =>
    admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: admins.length,
    with2FA: admins.filter(a => a.twoFactorEnabled).length,
    verified: admins.filter(a => a.emailVerified).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Super Admins</h1>
          <p className="text-slate-500 text-sm">Manage platform administrators with elevated privileges</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="bg-slate-900 hover:bg-slate-800 w-full sm:w-auto">
          <UserPlus className={`${ICON_SIZES.sm} mr-2`} />
          Invite Admin
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className={`${ICON_SIZES.md} text-rose-600`} />
          <p className="text-rose-800 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-rose-100 rounded">
            <X className={`${ICON_SIZES.sm} text-rose-600`} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Shield className={`${ICON_SIZES.md} text-slate-600`} />
            </div>
          </div>
          <p className="text-slate-500 text-sm">Total Super Admins</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className={`${ICON_SIZES.md} text-slate-600`} />
            </div>
          </div>
          <p className="text-slate-500 text-sm">2FA Enabled</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.with2FA}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Mail className={`${ICON_SIZES.md} text-slate-600`} />
            </div>
          </div>
          <p className="text-slate-500 text-sm">Email Verified</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.verified}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${ICON_SIZES.sm} text-slate-400`} />
          <input
            type="text"
            placeholder="Search admins by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Admins List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className={`${ICON_SIZES.xl} text-slate-400 mx-auto animate-spin`} />
            <p className="text-slate-500 mt-4">Loading super admins...</p>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className={`${ICON_SIZES['3xl']} text-slate-300 mx-auto mb-4`} />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchQuery ? 'No admins found' : 'No super admins yet'}
            </h3>
            <p className="text-slate-500 text-sm">
              {searchQuery ? 'Try a different search term' : 'Invite your first super admin to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 lg:px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Admin</th>
                    <th className="text-left px-4 lg:px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">2FA Status</th>
                    <th className="text-left px-4 lg:px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Email Status</th>
                    <th className="text-left px-4 lg:px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Added</th>
                    <th className="text-left px-4 lg:px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 lg:px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm flex-shrink-0">
                            {getDisplayInitials(admin.name, admin.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{admin.name || 'No name'}</p>
                            <p className="text-xs text-slate-400 truncate">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-5 py-4">
                        {admin.twoFactorEnabled ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <ShieldCheck className={ICON_SIZES.sm} />
                            <span className="hidden sm:inline">Enabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                            <ShieldAlert className={ICON_SIZES.sm} />
                            <span className="hidden sm:inline">Not Enabled</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 lg:px-5 py-4 hidden sm:table-cell">
                        {admin.emailVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle className={ICON_SIZES.sm} />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <AlertCircle className={ICON_SIZES.sm} />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 lg:px-5 py-4 text-slate-400 text-xs hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Calendar className={ICON_SIZES.sm} />
                          {formatDistanceToNow(new Date(admin.createdAt), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-4 lg:px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openRemoveDialog(admin)}
                            className="p-1.5 hover:bg-rose-100 rounded-lg transition-colors text-rose-600"
                            title="Remove super admin privileges"
                          >
                            <Trash2 className={ICON_SIZES.sm} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 lg:px-5 py-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-700">{filteredAdmins.length}</span> of{' '}
                <span className="font-medium text-slate-700">{admins.length}</span> super admins
              </p>
            </div>
          </>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Invite Super Admin</h2>
              <button onClick={() => setShowInvite(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className={`${ICON_SIZES.md} text-slate-400`} />
              </button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-amber-800 text-sm">
                    Super admins have full access to all platform data and settings. Only invite trusted individuals.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name (Optional)</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
                <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button type="submit" disabled={inviting} className="bg-slate-900 hover:bg-slate-800">
                  {inviting ? (
                    <>
                      <Loader2 className={`${ICON_SIZES.sm} mr-2 animate-spin`} />
                      Inviting...
                    </>
                  ) : (
                    <>
                      <UserPlus className={`${ICON_SIZES.sm} mr-2`} />
                      Invite Admin
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {showRemoveDialog && adminToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeRemoveDialog} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Remove Super Admin</h2>
              <button onClick={closeRemoveDialog} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className={`${ICON_SIZES.md} text-slate-400`} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className={`${ICON_SIZES.lg} text-rose-600`} />
                </div>
                <div>
                  <p className="text-slate-900 font-medium mb-2">
                    Remove super admin privileges?
                  </p>
                  <p className="text-slate-600 text-sm">
                    You are about to remove super admin privileges from{' '}
                    <span className="font-medium text-slate-900">
                      {adminToRemove.name || adminToRemove.email}
                    </span>
                    . They will no longer be able to access the platform admin dashboard.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <Button type="button" variant="outline" onClick={closeRemoveDialog} disabled={removing}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRemoveAdmin}
                disabled={removing}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {removing ? (
                  <>
                    <Loader2 className={`${ICON_SIZES.sm} mr-2 animate-spin`} />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className={`${ICON_SIZES.sm} mr-2`} />
                    Remove Admin
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * File: src/app/super-admin/admins/page.tsx
 * Type: Client Component
 * Last Reviewed: 2026-02-01
 *
 * PURPOSE:
 * Manages super admin user accounts including viewing, inviting, and
 * removing administrator privileges from platform users.
 *
 * ARCHITECTURE:
 * - Client component for modal interactions and real-time updates
 * - State management for admins list, modals, and loading states
 * - Search filtering performed client-side on fetched data
 * - Two modal components: InviteModal and RemoveConfirmModal
 *
 * API INTEGRATION:
 * - GET /api/super-admin/admins: Fetches all super admins
 * - POST /api/super-admin/admins: Invites new admin (email, optional name)
 * - DELETE /api/super-admin/admins/[id]: Removes admin privileges
 *
 * SECURITY CONSIDERATIONS:
 * [+] Warning banner displayed before invite about privilege level
 * [+] Confirmation dialog required for privilege removal
 * [+] Shows 2FA status to identify at-risk accounts
 * [!] No self-removal prevention in UI (should be handled by API)
 *
 * UI/UX:
 * [+] Stats cards for quick overview
 * [+] Search functionality for large admin lists
 * [+] Loading states and error handling with dismiss
 * [+] Responsive table with mobile-friendly columns
 *
 * STATE MANAGEMENT:
 * - admins: Full list from API
 * - filteredAdmins: Derived from search query
 * - showInvite/showRemoveDialog: Modal visibility
 * - adminToRemove: Selected admin for deletion confirmation
 *
 * POTENTIAL IMPROVEMENTS:
 * - Add pagination for large admin lists
 * - Implement activity log for admin actions
 * - Add role-based permissions within super admin tier
 * - Show last login timestamp for each admin
 *
 * =========================================================================== */
