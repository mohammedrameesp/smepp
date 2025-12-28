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
  MoreHorizontal,
  X,
  Loader2,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

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
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      const response = await fetch('/api/super-admin/admins');
      if (!response.ok) throw new Error('Failed to fetch admins');
      const data = await response.json();
      setAdmins(data.superAdmins);
    } catch (err) {
      setError('Failed to load super admins');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setSuccess(null);

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

      setSuccess(data.message);
      setInviteEmail('');
      setInviteName('');
      setShowInvite(false);
      fetchAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite admin');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveAdmin(adminId: string) {
    if (!confirm('Are you sure you want to remove super admin privileges from this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/super-admin/admins/${adminId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove admin');
      }

      setSuccess('Super admin privileges removed');
      fetchAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove admin');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Super Admins</h1>
          <p className="text-slate-500 text-sm">Manage platform administrators with elevated privileges</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="bg-slate-900 hover:bg-slate-800">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Admin
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <p className="text-rose-800 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-rose-100 rounded">
            <X className="h-4 w-4 text-rose-600" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <p className="text-emerald-800 text-sm">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto p-1 hover:bg-emerald-100 rounded">
            <X className="h-4 w-4 text-emerald-600" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm">Total Super Admins</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm">2FA Enabled</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.with2FA}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Mail className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm">Email Verified</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.verified}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
            <Loader2 className="h-8 w-8 text-slate-400 mx-auto animate-spin" />
            <p className="text-slate-500 mt-4">Loading super admins...</p>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchQuery ? 'No admins found' : 'No super admins yet'}
            </h3>
            <p className="text-slate-500 text-sm">
              {searchQuery ? 'Try a different search term' : 'Invite your first super admin to get started'}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Admin</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">2FA Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Email Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Added</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm">
                          {(admin.name || admin.email)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{admin.name || 'No name'}</p>
                          <p className="text-xs text-slate-400">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {admin.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Not Enabled
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {admin.emailVerified ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDistanceToNow(new Date(admin.createdAt), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveAdmin(admin.id)}
                          className="p-1.5 hover:bg-rose-100 rounded-lg transition-colors text-rose-600"
                          title="Remove super admin privileges"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-5 py-4 border-t border-slate-100">
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
                <X className="h-5 w-5 text-slate-400" />
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
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Inviting...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Admin
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
