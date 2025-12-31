'use client';

/**
 * @file InviteStep.tsx
 * @description Step 6 - Team invites (skippable)
 * @module setup/steps
 */

import { useState } from 'react';
import { UserPlus, Plus, Trash2, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TeamInvite {
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER';
}

interface InviteStepProps {
  invites: TeamInvite[];
  onChange: (invites: TeamInvite[]) => void;
  error?: string | null;
  onError: (error: string | null) => void;
}

export function InviteStep({ invites, onChange, error, onError }: InviteStepProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER');

  const addInvite = () => {
    if (!email || !email.includes('@')) {
      onError('Please enter a valid email address');
      return;
    }
    if (invites.some((i) => i.email === email)) {
      onError('This email has already been added');
      return;
    }
    onChange([...invites, { email, role }]);
    setEmail('');
    onError(null);
  };

  const removeInvite = (emailToRemove: string) => {
    onChange(invites.filter((i) => i.email !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInvite();
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
          <UserPlus className="w-8 h-8 text-slate-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Invite your team
        </h1>
        <p className="text-slate-600">
          Add team members to get started together
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {/* Invite form */}
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-slate-50 border-slate-200 rounded-xl h-12"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MANAGER' | 'MEMBER')}
            className="w-28 px-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm"
          >
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="MEMBER">Member</option>
          </select>
          <Button
            onClick={addInvite}
            className="bg-slate-900 hover:bg-slate-800 rounded-xl h-12 w-12 p-0"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}

        {/* Added invites */}
        {invites.length > 0 ? (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">
              {invites.length} invitation{invites.length !== 1 ? 's' : ''} to send
            </h4>
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.email}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-slate-600">
                        {invite.email.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {invite.email}
                      </p>
                      <p className="text-xs text-slate-500">{invite.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeInvite(invite.email)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No team members added yet</p>
            <p className="text-sm text-slate-400 mt-1">
              You can always invite people later
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
