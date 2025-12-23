'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Package, CreditCard, Loader2, Save } from 'lucide-react';
import { TIER_CONFIG } from '@/lib/multi-tenant/feature-flags';
import { SubscriptionTier } from '@prisma/client';

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
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
  const { data: session, update: updateSession } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(organization.name);
  const [error, setError] = useState<string | null>(null);

  const tierConfig = TIER_CONFIG[organization.subscriptionTier];

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
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

  const getTierBadgeColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'FREE':
        return 'bg-gray-100 text-gray-800';
      case 'STARTER':
        return 'bg-blue-100 text-blue-800';
      case 'PROFESSIONAL':
        return 'bg-purple-100 text-purple-800';
      case 'ENTERPRISE':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription & Usage Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Subscription & Usage</CardTitle>
              <CardDescription>Your current plan and resource usage</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Current Plan</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getTierBadgeColor(organization.subscriptionTier)}>
                    {tierConfig.name}
                  </Badge>
                  <span className="text-sm text-gray-600">{tierConfig.description}</span>
                </div>
              </div>
              {organization.subscriptionTier !== 'ENTERPRISE' && (
                <Button variant="outline" size="sm">
                  Upgrade
                </Button>
              )}
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Team Members</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{organization._count.members}</span>
                  <span className="text-sm text-gray-500">
                    / {tierConfig.maxUsers === -1 ? '∞' : tierConfig.maxUsers}
                  </span>
                </div>
                {tierConfig.maxUsers !== -1 && (
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (organization._count.members / tierConfig.maxUsers) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Assets</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">-</span>
                  <span className="text-sm text-gray-500">
                    / {tierConfig.maxAssets === -1 ? '∞' : tierConfig.maxAssets}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Usage data coming soon</p>
              </div>
            </div>

            {/* Available Modules */}
            <div>
              <p className="text-sm font-medium mb-2">Available Modules</p>
              <div className="flex flex-wrap gap-2">
                {tierConfig.modules.map((module) => (
                  <Badge key={module} variant="secondary">
                    {module.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
