'use client';

import { Button } from '@/components/ui/button';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ExportButtons() {
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleExportAssets = async () => {
    try {
      const response = await fetch('/api/assets/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assets_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        toast.error('Failed to export assets', { duration: 10000 });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error exporting assets', { duration: 10000 });
    }
  };

  const handleExportSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subscriptions_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        toast.error('Failed to export subscriptions', { duration: 10000 });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error exporting subscriptions', { duration: 10000 });
    }
  };

  const handleExportUsers = async () => {
    try {
      const response = await fetch('/api/users/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        toast.error('Failed to export users', { duration: 10000 });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error exporting users', { duration: 10000 });
    }
  };

  const handleFullBackup = async () => {
    try {
      const response = await fetch('/api/admin/full-backup');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `full_backup_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        toast.error('Failed to create full backup', { duration: 10000 });
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Error creating backup', { duration: 10000 });
    }
  };

  const handleSyncAssetDates = async () => {
    const confirmed = confirm(
      '⚠️ ONE-TIME OPERATION: Sync Dates with Purchase Dates\n\n' +
      'This will:\n' +
      '1. Set all asset & subscription createdAt dates to match purchase dates\n' +
      '2. Update assignment dates in history to match purchase dates\n' +
      '3. Set very old date (1900-01-01) for items without purchase dates\n' +
      '   (so they appear at the end when sorted)\n\n' +
      'Applies to both assets and subscriptions.\n' +
      'This is a one-time migration script.\n\n' +
      'Are you sure you want to continue?'
    );

    if (!confirmed) return;

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/admin/sync-asset-dates', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        setSyncMessage({
          type: 'success',
          message: `Sync completed successfully!\n\n` +
            `📦 ASSETS:\n` +
            `  • Updated: ${result.results.assets.updated}\n` +
            `  • History updated: ${result.results.assets.historyUpdated}\n` +
            `  • Skipped: ${result.results.assets.skipped}\n` +
            `  • Set to old date (no purchase date): ${result.results.assets.withoutPurchaseDate}\n\n` +
            `📋 SUBSCRIPTIONS:\n` +
            `  • Updated: ${result.results.subscriptions.updated}\n` +
            `  • History updated: ${result.results.subscriptions.historyUpdated}\n` +
            `  • Skipped: ${result.results.subscriptions.skipped}\n` +
            `  • Set to old date (no purchase date): ${result.results.subscriptions.withoutPurchaseDate}`
        });
      } else {
        setSyncMessage({
          type: 'error',
          message: `Sync failed: ${result.error || 'Unknown error'}`
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage({
        type: 'error',
        message: 'Error syncing asset dates. Please try again.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFullRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmed = confirm(
      '⚠️ WARNING: This will restore data from the backup file.\n\n' +
      'Existing records will be updated with matching identifiers (email, code, asset tag, service name).\n' +
      'This may overwrite current data.\n\n' +
      'Are you sure you want to continue?'
    );

    if (!confirmed) {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsRestoring(true);
    setRestoreMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/full-restore', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setRestoreMessage({
          type: 'success',
          message: `Restore completed successfully!\n` +
            `Users: ${result.results.users.created + result.results.users.updated} processed\n` +
            `Projects: ${result.results.projects.created + result.results.projects.updated} processed\n` +
            `Assets: ${result.results.assets.created + result.results.assets.updated} processed\n` +
            `Subscriptions: ${result.results.subscriptions.created + result.results.subscriptions.updated} processed`
        });

        // Refresh page after 3 seconds
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setRestoreMessage({
          type: 'error',
          message: `Restore failed: ${result.error || 'Unknown error'}`
        });
      }
    } catch (error) {
      console.error('Restore error:', error);
      setRestoreMessage({
        type: 'error',
        message: 'Error restoring database. Please try again.'
      });
    } finally {
      setIsRestoring(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* One-Time Migration Section */}
      <div className="border-2 border-yellow-200 rounded-lg p-6 bg-yellow-50">
        <h3 className="font-bold text-lg mb-2 text-yellow-900">⚙️ One-Time Data Migration</h3>
        <p className="text-sm text-gray-700 mb-4">
          Synchronize dates: Sets all asset & subscription creation dates and assignment dates to match purchase dates.
          Items without purchase dates will be set to 1900-01-01 (so they appear at the end when sorted).
          This is a one-time operation to fix historical data.
        </p>

        {syncMessage && (
          <Alert variant={syncMessage.type === 'success' ? 'default' : 'error'} className="mb-4">
            <AlertTitle>{syncMessage.type === 'success' ? '✓ Success' : '✗ Error'}</AlertTitle>
            <AlertDescription className="whitespace-pre-line">
              {syncMessage.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="border border-yellow-300 rounded-lg p-4 bg-white">
          <h4 className="font-semibold mb-2 text-yellow-800">🔄 Sync Dates with Purchase Dates</h4>
          <p className="text-xs text-gray-600 mb-3">
            Updates createdAt and assignment dates to match purchase dates. Items without purchase dates get set to 1900-01-01 (appear last when sorted).
          </p>
          <Button
            variant="default"
            className="w-full bg-yellow-600 hover:bg-yellow-700"
            onClick={handleSyncAssetDates}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : '🔄 Run Date Sync'}
          </Button>
        </div>
      </div>

      {/* Full Backup/Restore Section */}
      <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
        <h3 className="font-bold text-lg mb-2 text-blue-900">🔐 Full Database Backup & Restore</h3>
        <p className="text-sm text-gray-700 mb-4">
          Create a complete backup of all data (users, assets, subscriptions, projects, history) or restore from a previous backup.
          This preserves all USD values and critical data for disaster recovery.
        </p>

        {restoreMessage && (
          <Alert variant={restoreMessage.type === 'success' ? 'default' : 'error'} className="mb-4">
            <AlertTitle>{restoreMessage.type === 'success' ? '✓ Success' : '✗ Error'}</AlertTitle>
            <AlertDescription className="whitespace-pre-line">
              {restoreMessage.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-green-300 rounded-lg p-4 bg-white">
            <h4 className="font-semibold mb-2 text-green-800">📥 Export Full Backup</h4>
            <p className="text-xs text-gray-600 mb-3">
              Downloads complete database backup as Excel file with all tables
            </p>
            <Button
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleFullBackup}
            >
              📥 Download Full Backup
            </Button>
          </div>

          <div className="border border-orange-300 rounded-lg p-4 bg-white">
            <h4 className="font-semibold mb-2 text-orange-800">📤 Import Full Restore</h4>
            <p className="text-xs text-gray-600 mb-3">
              Restores data from backup file (updates existing, creates new)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFullRestore}
              style={{ display: 'none' }}
              id="restore-file-input"
            />
            <Button
              variant="default"
              className="w-full bg-orange-600 hover:bg-orange-700"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
            >
              {isRestoring ? 'Restoring...' : '📤 Upload Backup File'}
            </Button>
          </div>
        </div>
      </div>

      {/* Individual Export Section */}
      <div>
        <h3 className="font-semibold text-lg mb-4 text-gray-900">Individual Reports</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Assets Report</h3>
            <p className="text-sm text-gray-600 mb-4">Complete list of all assets with details</p>
            <Button variant="outline" className="w-full" onClick={handleExportAssets}>
              Export Assets (Excel)
            </Button>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Subscriptions Report</h3>
            <p className="text-sm text-gray-600 mb-4">All subscriptions with renewal dates</p>
            <Button variant="outline" className="w-full" onClick={handleExportSubscriptions}>
              Export Subscriptions (Excel)
            </Button>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Users Report</h3>
            <p className="text-sm text-gray-600 mb-4">User list with assigned items</p>
            <Button variant="outline" className="w-full" onClick={handleExportUsers}>
              Export Users (Excel)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
