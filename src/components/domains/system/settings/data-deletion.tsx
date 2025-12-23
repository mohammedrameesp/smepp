'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

interface ModuleConfig {
  key: string;
  title: string;
  description: string;
  warningText: string;
}

export function DataDeletion() {
  const [deleteStatus, setDeleteStatus] = useState<{ [key: string]: boolean }>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [currentModule, setCurrentModule] = useState<string | null>(null);

  const modules: ModuleConfig[] = [
    {
      key: 'users',
      title: 'Users',
      description: 'Delete all users (except system accounts)',
      warningText: 'This will delete all user accounts, their sessions, and OAuth connections. System accounts will be preserved.',
    },
    {
      key: 'assets',
      title: 'Assets',
      description: 'Delete all assets and history',
      warningText: 'This will delete all assets, their assignment history, and maintenance records.',
    },
    {
      key: 'subscriptions',
      title: 'Subscriptions',
      description: 'Delete all subscriptions and history',
      warningText: 'This will delete all subscriptions and their history records.',
    },
    {
      key: 'suppliers',
      title: 'Suppliers',
      description: 'Delete all suppliers and engagements',
      warningText: 'This will delete all suppliers and their engagement records.',
    },
    {
      key: 'accreditations',
      title: 'Accreditations',
      description: 'Delete all accreditation projects and records',
      warningText: 'This will delete all accreditation projects, records, scans, and history.',
    },
    {
      key: 'activity',
      title: 'Activity Logs',
      description: 'Delete all activity logs',
      warningText: 'This will delete all system activity logs.',
    },
  ];

  const handleDeleteModule = async (moduleKey: string) => {
    setDeleteStatus(prev => ({ ...prev, [moduleKey]: true }));

    try {
      const response = await fetch('/api/admin/delete-module', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ module: moduleKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      toast.success(`${moduleKey} data deleted successfully`, {
        description: data.message,
        duration: 5000,
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete ${moduleKey} data`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 8000,
      });
    } finally {
      setDeleteStatus(prev => ({ ...prev, [moduleKey]: false }));
      setConfirmDialogOpen(false);
      setCurrentModule(null);
    }
  };

  const handleDeleteAll = async () => {
    setDeleteStatus(prev => ({ ...prev, all: true }));

    try {
      const response = await fetch('/api/admin/delete-all', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      toast.success('All data deleted successfully', {
        description: `Deleted records: ${JSON.stringify(data.deletedCounts)}`,
        duration: 6000,
      });

      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Delete all error:', error);
      toast.error('Failed to delete all data', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 10000,
      });
    } finally {
      setDeleteStatus(prev => ({ ...prev, all: false }));
      setConfirmDialogOpen(false);
      setCurrentModule(null);
    }
  };

  const openConfirmDialog = (moduleKey: string) => {
    setCurrentModule(moduleKey);
    setConfirmDialogOpen(true);
  };

  const handleConfirm = () => {
    if (currentModule === 'all') {
      handleDeleteAll();
    } else if (currentModule) {
      handleDeleteModule(currentModule);
    }
  };

  const getCurrentModuleConfig = () => {
    if (currentModule === 'all') {
      return {
        title: 'Delete ALL Data',
        warningText: 'This will PERMANENTLY delete ALL data from the entire database including users, assets, subscriptions, suppliers, accreditations, and all related records. This action CANNOT be undone!',
      };
    }
    return modules.find(m => m.key === currentModule);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Warning Banner */}
        <Alert variant="error" className="border-red-600 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>⚠️ DANGER ZONE - TESTING ONLY</strong>
            <br />
            These delete operations are PERMANENT and CANNOT be undone. Always make a backup before deleting data.
            These buttons are for testing purposes only and should be removed in production.
          </AlertDescription>
        </Alert>

        {/* Delete All Section */}
        <Card className="border-red-300">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <Trash2 className="h-5 w-5" />
              Delete ALL Data
            </CardTitle>
            <CardDescription className="text-red-800">
              Delete everything from the database (NUCLEAR OPTION)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Alert className="mb-4 border-red-500 bg-red-50">
              <AlertDescription className="text-red-900">
                <strong>WARNING:</strong> This will delete ALL data from ALL tables. Only system accounts will be preserved.
                Make sure you have a backup!
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => openConfirmDialog('all')}
              disabled={deleteStatus.all}
              variant="destructive"
              className="w-full gap-2"
            >
              {deleteStatus.all ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting All Data...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete ALL Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Individual Modules */}
        <Card>
          <CardHeader>
            <CardTitle>Delete Individual Modules</CardTitle>
            <CardDescription>
              Delete data from specific modules only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module) => (
                <Card key={module.key} className="border-orange-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{module.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {module.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => openConfirmDialog(module.key)}
                      disabled={deleteStatus[module.key]}
                      variant="destructive"
                      size="sm"
                      className="w-full gap-2"
                    >
                      {deleteStatus[module.key] ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete {module.title}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {getCurrentModuleConfig()?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-900">
              {getCurrentModuleConfig()?.warningText}
              <br /><br />
              <strong className="text-red-600">This action CANNOT be undone!</strong>
              <br /><br />
              Are you absolutely sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
