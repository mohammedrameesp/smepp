/**
 * @file OrganizationSettings.tsx
 * @description Settings component for managing organization details, name, and code prefix
 * @module components/domains/system/organization
 */
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Users, Package, Loader2, Save } from 'lucide-react';
import { SubscriptionTier } from '@prisma/client';

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  codePrefix: string;
  subscriptionTier: SubscriptionTier;
  maxUsers: number;
  maxAssets: number;
  _count: {
    members: number;
  };
}

interface OrganizationSettingsProps {
  organization: OrganizationData;
}

export function OrganizationSettings({ organization }: OrganizationSettingsProps) {
  const { update: updateSession } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(organization.name);
  const [codePrefix, setCodePrefix] = useState(organization.codePrefix || 'ORG');
  const [error, setError] = useState<string | null>(null);

  const handleCodePrefixChange = (value: string) => {
    // Only allow uppercase letters and numbers, max 3 characters
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    setCodePrefix(cleaned);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }

    if (codePrefix.length !== 3) {
      setError('Code prefix must be exactly 3 characters');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), codePrefix }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update organization');
      }

      // Update session to reflect new org name
      await updateSession({
        organizationId: organization.id,
      });

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Organization Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>Manage your organization information</CardDescription>
              </div>
            </div>
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codePrefix">Reference Code Prefix</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="codePrefix"
                    value={codePrefix}
                    onChange={(e) => handleCodePrefixChange(e.target.value)}
                    placeholder="ABC"
                    className="w-24 font-mono text-center uppercase"
                    maxLength={3}
                  />
                  <span className="text-sm text-gray-500">
                    Used for employee IDs, asset tags, etc. (e.g., {codePrefix}-2024-001)
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setName(organization.name);
                    setCodePrefix(organization.codePrefix || 'ORG');
                    setIsEditing(false);
                    setError(null);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-500">Name</span>
                <span className="font-medium">{organization.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-500">URL Slug</span>
                <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                  {organization.slug}
                </code>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-500">Reference Code Prefix</span>
                <code className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-mono">
                  {organization.codePrefix || 'ORG'}
                </code>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Stats Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Usage</CardTitle>
              <CardDescription>Your organization&apos;s resource usage</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Team Members</span>
              </div>
              <span className="text-2xl font-bold">{organization._count.members}</span>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Assets</span>
              </div>
              <span className="text-2xl font-bold">-</span>
              <p className="text-xs text-gray-400 mt-2">Usage data coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
