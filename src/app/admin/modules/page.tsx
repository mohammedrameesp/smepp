'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import {
  Package,
  CreditCard,
  Truck,
  Users,
  Calendar,
  DollarSign,
  ShoppingCart,
  FolderKanban,
  FileCheck,
  Check,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  Crown,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// Icon mapping
const ICONS: Record<string, React.ElementType> = {
  Package,
  CreditCard,
  Truck,
  Users,
  Calendar,
  DollarSign,
  ShoppingCart,
  FolderKanban,
  FileCheck,
};

// Tier badge colors
const TIER_COLORS: Record<string, string> = {
  FREE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  STARTER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  PROFESSIONAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  ENTERPRISE: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
};

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  operations: 'Operations',
  hr: 'Human Resources',
  projects: 'Projects',
  system: 'System',
};

interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  iconName: string;
  category: string;
  tier: string;
  isFree: boolean;
  requires: string[];
  isCore: boolean;
  isBeta: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  canUninstall: boolean;
  installError: string | null;
  uninstallError: string | null;
}

export default function ModulesPage() {
  const { update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const installParam = searchParams.get('install');

  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('FREE');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Uninstall dialog state
  const [uninstallDialog, setUninstallDialog] = useState<{
    open: boolean;
    module: ModuleInfo | null;
    deleteData: boolean;
  }>({
    open: false,
    module: null,
    deleteData: false,
  });

  // Fetch modules
  useEffect(() => {
    fetchModules();
  }, []);

  // Auto-open install dialog if install param is present
  useEffect(() => {
    if (installParam && modules.length > 0) {
      const targetModule = modules.find(m => m.id === installParam);
      if (targetModule && !targetModule.isInstalled && targetModule.canInstall) {
        handleInstall(targetModule);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installParam, modules]);

  async function fetchModules() {
    try {
      const response = await fetch('/api/modules');
      if (!response.ok) throw new Error('Failed to fetch modules');

      const data = await response.json();
      setModules(data.modules);
      setSubscriptionTier(data.subscriptionTier);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  }

  async function handleInstall(mod: ModuleInfo) {
    if (!mod.canInstall) {
      toast.error(mod.installError || 'Cannot install this module');
      return;
    }

    setActionLoading(mod.id);

    try {
      const response = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId: mod.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to install module');
      }

      toast.success(data.message);

      // Refresh modules list
      await fetchModules();

      // Update session to refresh sidebar
      await updateSession();
    } catch (error) {
      console.error('Install error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to install module');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUninstall() {
    const modToUninstall = uninstallDialog.module;
    if (!modToUninstall) return;

    setActionLoading(modToUninstall.id);
    setUninstallDialog({ ...uninstallDialog, open: false });

    try {
      const response = await fetch('/api/modules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: modToUninstall.id,
          deleteData: uninstallDialog.deleteData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to uninstall module');
      }

      toast.success(data.message);

      // Refresh modules list
      await fetchModules();

      // Update session to refresh sidebar
      await updateSession();
    } catch (error) {
      console.error('Uninstall error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to uninstall module');
    } finally {
      setActionLoading(null);
      setUninstallDialog({ open: false, module: null, deleteData: false });
    }
  }

  // Separate installed and available modules
  const installedModules = modules.filter(m => m.isInstalled);
  const availableModules = modules.filter(m => !m.isInstalled);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Modules</h1>
        <p className="text-muted-foreground">
          Install and manage modules for your organization. Your current plan: {' '}
          <Badge className={TIER_COLORS[subscriptionTier]}>{subscriptionTier}</Badge>
        </p>
      </div>

      {/* Installed Modules */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Installed ({installedModules.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {installedModules.map(module => {
            const Icon = ICONS[module.iconName] || Package;
            return (
              <Card key={module.id} className="relative">
                {module.isCore && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Core
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{module.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[module.category]}
                        </Badge>
                        <Badge className={`text-xs ${TIER_COLORS[module.tier]}`}>
                          {module.tier}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {module.description}
                  </CardDescription>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4 mr-1" />
                      Installed
                    </div>
                    {!module.isCore && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={!module.canUninstall || actionLoading === module.id}
                        onClick={() => setUninstallDialog({
                          open: true,
                          module,
                          deleteData: false,
                        })}
                      >
                        {actionLoading === module.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Uninstall
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {!module.canUninstall && module.uninstallError && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {module.uninstallError}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Available Modules */}
      {availableModules.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">
            Available ({availableModules.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableModules.map(module => {
              const Icon = ICONS[module.iconName] || Package;
              const needsUpgrade = module.installError?.includes('requires');
              const hasMissingDeps = module.installError?.includes('installed first');

              return (
                <Card key={module.id} className="relative">
                  {module.isBeta && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="text-xs">Beta</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{module.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[module.category]}
                          </Badge>
                          <Badge className={`text-xs ${TIER_COLORS[module.tier]}`}>
                            {module.isFree ? 'FREE' : module.tier}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {module.description}
                    </CardDescription>

                    {module.requires.length > 0 && (
                      <div className="text-xs text-muted-foreground mb-3">
                        Requires: {module.requires.join(', ')}
                      </div>
                    )}

                    <div className="flex items-center justify-end">
                      {needsUpgrade ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = '/admin/settings/billing'}
                        >
                          <Crown className="h-4 w-4 mr-1" />
                          Upgrade
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          disabled={!module.canInstall || actionLoading === module.id}
                          onClick={() => handleInstall(module)}
                        >
                          {actionLoading === module.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              Install
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {hasMissingDeps && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {module.installError}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Uninstall Confirmation Dialog */}
      <AlertDialog
        open={uninstallDialog.open}
        onOpenChange={(open) => setUninstallDialog({ ...uninstallDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uninstall {uninstallDialog.module?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the module from your organization. You can reinstall it later.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="deleteData"
                checked={uninstallDialog.deleteData}
                onCheckedChange={(checked) =>
                  setUninstallDialog({
                    ...uninstallDialog,
                    deleteData: checked === true,
                  })
                }
              />
              <label
                htmlFor="deleteData"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Also delete all data for this module
              </label>
            </div>
            {uninstallDialog.deleteData && (
              <p className="text-sm text-destructive mt-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Warning: This action cannot be undone. All data will be permanently deleted.
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUninstall}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Uninstall
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
