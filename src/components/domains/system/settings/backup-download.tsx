'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Shield, Clock, Database } from 'lucide-react';

export function BackupDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/admin/backup');

      if (!response.ok) {
        throw new Error('Backup failed');
      }

      // Get filename from header or generate one
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1]
        || `damp-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setLastBackup(new Date().toLocaleString());
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Failed to download backup. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Full Database Backup
        </CardTitle>
        <CardDescription>
          Download a complete backup of all your data. Use this to restore if anything goes wrong.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Backup Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
              <Shield className="h-4 w-4" />
              What's Included
            </div>
            <p className="text-sm text-blue-600">
              Users, Assets, Subscriptions, Suppliers, Accreditation Records, HR Profiles, Activity Logs
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
              <Clock className="h-4 w-4" />
              Auto Backup
            </div>
            <p className="text-sm text-green-600">
              Daily automatic backups run at 6:00 AM Qatar time and are stored for 30 days
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-700 font-medium mb-1">
              <Download className="h-4 w-4" />
              Format
            </div>
            <p className="text-sm text-purple-600">
              JSON file containing all data - can be used to restore or import into new system
            </p>
          </div>
        </div>

        {/* Download Button */}
        <div className="flex items-center gap-4">
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            size="lg"
            className="gap-2"
          >
            <Download className="h-5 w-5" />
            {isDownloading ? 'Preparing Backup...' : 'Download Full Backup'}
          </Button>

          {lastBackup && (
            <span className="text-sm text-gray-500">
              Last downloaded: {lastBackup}
            </span>
          )}
        </div>

        {/* Instructions */}
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-2">How to Restore</h4>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
            <li>Download the backup file and keep it safe</li>
            <li>If you need to restore, contact your administrator</li>
            <li>The backup contains all data needed to recreate your system</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
