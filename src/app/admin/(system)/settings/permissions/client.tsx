'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, RotateCcw, Save, Shield, ShieldCheck, Users } from 'lucide-react';

interface PermissionGroup {
  label: string;
  permissions: {
    key: string;
    label: string;
    description: string;
  }[];
}

interface PermissionsClientProps {
  organizationName: string;
  enabledModules: string[];
  initialPermissions: {
    MANAGER: string[];
    MEMBER: string[];
  };
  permissionGroups: Record<string, PermissionGroup>;
}

type Role = 'MANAGER' | 'MEMBER';

export function PermissionsClient({
  organizationName,
  enabledModules,
  initialPermissions,
  permissionGroups,
}: PermissionsClientProps) {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [activeRole, setActiveRole] = useState<Role>('MANAGER');

  // Check if a module is enabled
  const isModuleEnabled = useCallback(
    (permissionKey: string) => {
      const module = permissionKey.split(':')[0];
      // Core modules are always enabled
      const coreModules = ['users', 'settings', 'reports', 'activity', 'approvals', 'documents'];
      if (coreModules.includes(module)) return true;

      // Map permission prefixes to module slugs
      const moduleMap: Record<string, string> = {
        assets: 'assets',
        'asset-requests': 'assets',
        subscriptions: 'subscriptions',
        suppliers: 'suppliers',
        employees: 'employees',
        leave: 'leave',
        payroll: 'payroll',
        purchase: 'purchase-requests',
        projects: 'projects',
      };

      const moduleSlug = moduleMap[module];
      return moduleSlug ? enabledModules.includes(moduleSlug) : true;
    },
    [enabledModules]
  );

  // Toggle a permission for a role
  const togglePermission = useCallback(
    (role: Role, permissionKey: string) => {
      setPermissions((prev) => {
        const current = prev[role];
        const hasPermission = current.includes(permissionKey);
        const updated = hasPermission
          ? current.filter((p) => p !== permissionKey)
          : [...current, permissionKey];

        return { ...prev, [role]: updated };
      });
      setHasChanges(true);
    },
    []
  );

  // Save permissions
  const savePermissions = async () => {
    setIsSaving(true);
    try {
      // Save MANAGER permissions
      await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'MANAGER', permissions: permissions.MANAGER }),
      });

      // Save MEMBER permissions
      await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'MEMBER', permissions: permissions.MEMBER }),
      });

      toast.success('Permissions saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Reset failed');

      // Refetch permissions
      const getResponse = await fetch('/api/admin/permissions');
      const data = await getResponse.json();

      setPermissions({
        MANAGER: data.roles.MANAGER,
        MEMBER: data.roles.MEMBER,
      });

      toast.success('Permissions reset to defaults');
      setHasChanges(false);
    } catch (error) {
      console.error('Error resetting permissions:', error);
      toast.error('Failed to reset permissions');
    } finally {
      setIsResetting(false);
    }
  };

  // Render permission group
  const renderPermissionGroup = (groupKey: string, group: PermissionGroup, role: Role) => {
    const enabledPermissions = group.permissions.filter((p) => isModuleEnabled(p.key));
    const disabledPermissions = group.permissions.filter((p) => !isModuleEnabled(p.key));

    if (enabledPermissions.length === 0) {
      return (
        <Card key={groupKey} className="opacity-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {group.label}
              <Badge variant="outline" className="text-xs">
                Module Disabled
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Enable the {group.label.toLowerCase()} module to configure these permissions.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={groupKey}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{group.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {enabledPermissions.map((permission) => (
            <div key={permission.key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label
                  htmlFor={`${role}-${permission.key}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {permission.label}
                </label>
                <p className="text-xs text-muted-foreground">{permission.description}</p>
              </div>
              <Switch
                id={`${role}-${permission.key}`}
                checked={permissions[role].includes(permission.key)}
                onCheckedChange={() => togglePermission(role, permission.key)}
              />
            </div>
          ))}
          {disabledPermissions.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Additional permissions available when module is enabled:
              </p>
              <div className="flex flex-wrap gap-1">
                {disabledPermissions.map((p) => (
                  <Badge key={p.key} variant="outline" className="text-xs opacity-50">
                    {p.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-amber-900">Owner & Admin</p>
                <p className="text-xs text-amber-700">Full access to everything</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-blue-900">Manager</p>
                <p className="text-xs text-blue-700">
                  {permissions.MANAGER.length} permissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Member</p>
                <p className="text-xs text-gray-700">
                  {permissions.MEMBER.length} permissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isResetting}>
              {isResetting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reset to Defaults
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Permissions?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all role permissions to their default values. Any custom
                configuration will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetToDefaults}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button onClick={savePermissions} disabled={!hasChanges || isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Permission Tabs */}
      <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as Role)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="MANAGER" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Manager
          </TabsTrigger>
          <TabsTrigger value="MEMBER" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Member
          </TabsTrigger>
        </TabsList>

        <TabsContent value="MANAGER" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(permissionGroups).map(([key, group]) =>
              renderPermissionGroup(key, group, 'MANAGER')
            )}
          </div>
        </TabsContent>

        <TabsContent value="MEMBER" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(permissionGroups).map(([key, group]) =>
              renderPermissionGroup(key, group, 'MEMBER')
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-amber-100 border border-amber-300 rounded-lg px-4 py-2 shadow-lg flex items-center gap-3">
          <span className="text-sm text-amber-800">You have unsaved changes</span>
          <Button size="sm" onClick={savePermissions} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}
