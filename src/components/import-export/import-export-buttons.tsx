'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ImportExportButtonsProps {
  entityType: 'assets' | 'subscriptions';
}

export function ImportExportButtons({ entityType }: ImportExportButtonsProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: { row: number; error: string; data: unknown }[];
  } | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/${entityType}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entityType}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        toast.error('Failed to export data', { duration: 10000 });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error exporting data', { duration: 10000 });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`/api/${entityType}/import-template`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entityType}_import_template.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        toast.error('Failed to download template', { duration: 10000 });
      }
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Error downloading template', { duration: 10000 });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/${entityType}/import`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result.results);
        // Refresh the page after successful import
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        toast.error(`Import failed: ${result.error || 'Unknown error'}`, { duration: 10000 });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Error importing data', { duration: 10000 });
    } finally {
      setIsImporting(false);
      event.target.value = ''; // Reset file input
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleExport} variant="outline">
          Export to Excel
        </Button>
        <Button onClick={handleDownloadTemplate} variant="outline">
          Download Import Template
        </Button>
        <Button onClick={() => setShowImportDialog(!showImportDialog)} variant="outline">
          {showImportDialog ? 'Cancel Import' : 'Import from Excel'}
        </Button>
      </div>

      {showImportDialog && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="space-y-2">
            <Label htmlFor="import-file">Select Excel file to import</Label>
            <Input
              id="import-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              disabled={isImporting}
            />
            <p className="text-sm text-gray-600">
              Supported format: Excel (.xlsx, .xls). Download the template above for the correct format.
            </p>
          </div>
        </div>
      )}

      {isImporting && (
        <Alert>
          <AlertTitle>Importing...</AlertTitle>
          <AlertDescription>Please wait while we process your file.</AlertDescription>
        </Alert>
      )}

      {importResult && (
        <Alert variant={importResult.failed > 0 ? 'warning' : 'success'}>
          <AlertTitle>Import Complete</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>
                Successfully imported: <strong>{importResult.success}</strong>
              </p>
              <p>
                Failed: <strong>{importResult.failed}</strong>
              </p>

              {importResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold">Errors:</p>
                  <ul className="list-disc list-inside max-h-40 overflow-y-auto">
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <li key={index} className="text-sm">
                        Row {error.row}: {error.error}
                      </li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="text-sm">
                        ... and {importResult.errors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <p className="text-sm mt-2">Page will refresh in 3 seconds...</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
