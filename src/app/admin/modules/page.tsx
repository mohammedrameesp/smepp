'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  ExternalLink,
  Info,
  Database,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import Link from 'next/link';

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

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  operations: 'Operations',
  hr: 'Human Resources',
  system: 'System',
};

// Module route mapping for "Get Started" links
const MODULE_ROUTES: Record<string, string> = {
  assets: '/admin/assets',
  subscriptions: '/admin/subscriptions',
  suppliers: '/admin/suppliers',
  employees: '/admin/employees',
  leave: '/admin/leave',
  payroll: '/admin/payroll',
  'purchase-requests': '/admin/purchase-requests',
  documents: '/admin/company-documents',
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
  requiredBy: string[];
  isCore: boolean;
  isBeta: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  canUninstall: boolean;
  installError: string | null;
  uninstallError: string | null;
}

interface DataCount {
  entity: string;
  label: string;
  count: number;
}

interface DataCountResponse {
  moduleId: string;
  moduleName: string;
  counts: DataCount[];
  totalRecords: number;
  hasData: boolean;
}

export default function ModulesPage() {
  const { update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const installParam = searchParams.get('install');

  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [, setSubscriptionTier] = useState<string>('FREE');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Install dialog state
  const [installDialog, setInstallDialog] = useState<{
    open: boolean;
    module: ModuleInfo | null;
    success: boolean;
  }>({
    open: false,
    module: null,
    success: false,
  });

  // Uninstall dialog state
  const [uninstallDialog, setUninstallDialog] = useState<{
    open: boolean;
    module: ModuleInfo | null;
    deleteData: boolean;
    cascade: boolean;
    dataCounts: DataCountResponse | null;
    cascadeDataCounts: Map<string, DataCountResponse> | null;
    loadingCounts: boolean;
  }>({
    open: false,
    module: null,
    deleteData: false,
    cascade: false,
    dataCounts: null,
    cascadeDataCounts: null,
    loadingCounts: false,
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
        setInstallDialog({ open: true, module: targetModule, success: false });
      }
    }
     
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

  async function fetchDataCounts(moduleId: string) {
    try {
      const response = await fetch(`/api/modules/${moduleId}/data-count`);
      if (!response.ok) throw new Error('Failed to fetch data counts');
      return await response.json() as DataCountResponse;
    } catch (error) {
      console.error('Error fetching data counts:', error);
      return null;
    }
  }

  async function handleInstallClick(mod: ModuleInfo) {
    setInstallDialog({ open: true, module: mod, success: false });
  }

  async function handleInstallConfirm() {
    const mod = installDialog.module;
    if (!mod || !mod.canInstall) {
      toast.error(mod?.installError || 'Cannot install this module');
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

      // Show success state in dialog
      setInstallDialog({ ...installDialog, success: true });

      // Refresh modules list
      await fetchModules();

      // Force router refresh to re-run server components (navigation)
      router.refresh();

      // Update session to sync JWT token
      await updateSession();
    } catch (error) {
      console.error('Install error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to install module');
      setInstallDialog({ open: false, module: null, success: false });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUninstallClick(mod: ModuleInfo) {
    setUninstallDialog({
      open: true,
      module: mod,
      deleteData: false,
      cascade: false,
      dataCounts: null,
      cascadeDataCounts: null,
      loadingCounts: true,
    });

    // Fetch data counts for the main module
    const counts = await fetchDataCounts(mod.id);

    // Also fetch data counts for dependent modules (for cascade display)
    const cascadeCounts = new Map<string, DataCountResponse>();
    const installedDependents = mod.requiredBy.filter(depId =>
      installedModules.some(m => m.id === depId)
    );

    await Promise.all(
      installedDependents.map(async (depId) => {
        const depCounts = await fetchDataCounts(depId);
        if (depCounts) {
          cascadeCounts.set(depId, depCounts);
        }
      })
    );

    setUninstallDialog(prev => ({
      ...prev,
      dataCounts: counts,
      cascadeDataCounts: cascadeCounts.size > 0 ? cascadeCounts : null,
      loadingCounts: false,
    }));
  }

  async function handleUninstallConfirm() {
    const modToUninstall = uninstallDialog.module;
    if (!modToUninstall) return;

    setActionLoading(modToUninstall.id);

    try {
      const response = await fetch('/api/modules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: modToUninstall.id,
          deleteData: uninstallDialog.deleteData,
          cascade: uninstallDialog.cascade,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to uninstall module');
      }

      toast.success(data.message);
      setUninstallDialog({ open: false, module: null, deleteData: false, cascade: false, dataCounts: null, cascadeDataCounts: null, loadingCounts: false });

      // Refresh modules list
      await fetchModules();

      // Force router refresh to re-run server components (navigation)
      router.refresh();

      // Update session to sync JWT token
      await updateSession();
    } catch (error) {
      console.error('Uninstall error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to uninstall module');
    } finally {
      setActionLoading(null);
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
    <>
      <PageHeader
        title="Modules"
        subtitle="Install and manage modules for your organization"
      />
      <PageContent className="space-y-8">
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
                                              </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {module.description}
                  </CardDescription>
                  {/* Show "Required by" warning for modules with installed dependents */}
                  {module.requiredBy.length > 0 && (() => {
                    const installedDependents = module.requiredBy.filter(depId =>
                      installedModules.some(m => m.id === depId)
                    );
                    if (installedDependents.length > 0) {
                      const dependentNames = installedDependents.map(depId =>
                        modules.find(m => m.id === depId)?.name || depId
                      );
                      return (
                        <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 mb-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span>Required by: {dependentNames.join(', ')}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
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
                        onClick={() => handleUninstallClick(module)}
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
                          onClick={() => handleInstallClick(module)}
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

      {/* Install Confirmation Dialog */}
      <Dialog
        open={installDialog.open}
        onOpenChange={(open) => {
          if (!open) setInstallDialog({ open: false, module: null, success: false });
        }}
      >
        <DialogContent>
          {installDialog.success ? (
            // Success state
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  {installDialog.module?.name} Installed
                </DialogTitle>
                <DialogDescription>
                  The module has been successfully installed and is ready to use.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You can now access {installDialog.module?.name} from the navigation menu.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setInstallDialog({ open: false, module: null, success: false })}
                >
                  Close
                </Button>
                {installDialog.module && MODULE_ROUTES[installDialog.module.id] && (
                  <Button asChild>
                    <Link href={MODULE_ROUTES[installDialog.module.id]}>
                      Get Started
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            // Confirmation state
            <>
              <DialogHeader>
                <DialogTitle>Install {installDialog.module?.name}?</DialogTitle>
                <DialogDescription>
                  {installDialog.module?.description}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">This will enable:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-600" />
                      {installDialog.module?.name} features in admin panel
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-600" />
                      Related navigation menu items
                    </li>
                    {installDialog.module?.category === 'hr' && (
                      <li className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-600" />
                        Employee self-service features
                      </li>
                    )}
                  </ul>
                </div>
                {installDialog.module?.requires && installDialog.module.requires.length > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      This module requires: {installDialog.module.requires.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setInstallDialog({ open: false, module: null, success: false })}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInstallConfirm}
                  disabled={actionLoading === installDialog.module?.id}
                >
                  {actionLoading === installDialog.module?.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Install
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Uninstall Confirmation Dialog */}
      <Dialog
        open={uninstallDialog.open}
        onOpenChange={(open) => {
          if (!open) setUninstallDialog({ open: false, module: null, deleteData: false, cascade: false, dataCounts: null, cascadeDataCounts: null, loadingCounts: false });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uninstall {uninstallDialog.module?.name}?</DialogTitle>
            <DialogDescription>
              This will remove the module from your organization. You can reinstall it later.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Cascade uninstall option - show when module has installed dependents */}
            {uninstallDialog.module && (() => {
              const installedDependents = uninstallDialog.module.requiredBy.filter(depId =>
                installedModules.some(m => m.id === depId)
              );
              if (installedDependents.length > 0) {
                const dependentNames = installedDependents.map(depId =>
                  modules.find(m => m.id === depId)?.name || depId
                );
                return (
                  <>
                    <Alert variant="warning">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        The following modules depend on {uninstallDialog.module.name}: <strong>{dependentNames.join(', ')}</strong>
                      </AlertDescription>
                    </Alert>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="cascade"
                        checked={uninstallDialog.cascade}
                        onCheckedChange={(checked) =>
                          setUninstallDialog({
                            ...uninstallDialog,
                            cascade: checked === true,
                          })
                        }
                      />
                      <label
                        htmlFor="cascade"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Also uninstall: {dependentNames.join(', ')}
                      </label>
                    </div>
                  </>
                );
              }
              return null;
            })()}

            {/* Data counts section */}
            {uninstallDialog.loadingCounts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking existing data...
              </div>
            ) : (() => {
              // Calculate total records including cascade modules when enabled
              const mainRecords = uninstallDialog.dataCounts?.totalRecords || 0;
              const cascadeRecords = uninstallDialog.cascade && uninstallDialog.cascadeDataCounts
                ? Array.from(uninstallDialog.cascadeDataCounts.values()).reduce((sum, c) => sum + c.totalRecords, 0)
                : 0;
              const totalRecords = mainRecords + cascadeRecords;
              const hasAnyData = totalRecords > 0;

              if (!hasAnyData) {
                return (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No data exists for {uninstallDialog.cascade ? 'these modules' : 'this module'}.
                    </AlertDescription>
                  </Alert>
                );
              }

              return (
                <>
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Existing Data</span>
                      <Badge variant="secondary" className="ml-auto">
                        {totalRecords.toLocaleString()} records{uninstallDialog.cascade && cascadeRecords > 0 ? ' total' : ''}
                      </Badge>
                    </div>
                    {/* Main module data */}
                    {uninstallDialog.dataCounts?.hasData && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">{uninstallDialog.module?.name}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {uninstallDialog.dataCounts.counts.filter(c => c.count > 0).map(count => (
                            <div key={count.entity} className="flex justify-between">
                              <span className="text-muted-foreground">{count.label}</span>
                              <span className="font-medium">{count.count.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Cascade module data */}
                    {uninstallDialog.cascade && uninstallDialog.cascadeDataCounts && Array.from(uninstallDialog.cascadeDataCounts.entries()).map(([modId, counts]) => {
                      if (!counts.hasData) return null;
                      const modName = modules.find(m => m.id === modId)?.name || modId;
                      return (
                        <div key={modId} className="mt-2 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{modName}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {counts.counts.filter(c => c.count > 0).map(count => (
                              <div key={`${modId}-${count.entity}`} className="flex justify-between">
                                <span className="text-muted-foreground">{count.label}</span>
                                <span className="font-medium">{count.count.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Delete data checkbox */}
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
                      Also delete all data{uninstallDialog.cascade ? ' from all modules' : ''}
                    </label>
                  </div>

                  {uninstallDialog.deleteData ? (
                    <Alert variant="error">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Warning:</strong> This will permanently delete {totalRecords.toLocaleString()} records. This action cannot be undone.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Data will be preserved.</strong> Your {totalRecords.toLocaleString()} records will remain in the database and will be accessible if you reinstall the module{uninstallDialog.cascade ? 's' : ''}.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              );
            })()}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUninstallDialog({ open: false, module: null, deleteData: false, cascade: false, dataCounts: null, cascadeDataCounts: null, loadingCounts: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUninstallConfirm}
              disabled={actionLoading === uninstallDialog.module?.id || (!uninstallDialog.module?.canUninstall && !uninstallDialog.cascade)}
            >
              {actionLoading === uninstallDialog.module?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Uninstall{uninstallDialog.deleteData ? ' & Delete Data' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PageContent>
    </>
  );
}
