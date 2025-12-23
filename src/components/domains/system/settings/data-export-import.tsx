'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ExportStatus {
  [key: string]: 'idle' | 'loading' | 'success' | 'error';
}

interface ImportStatus {
  [key: string]: 'idle' | 'loading' | 'success' | 'error';
}

interface ModuleConfig {
  key: string;
  title: string;
  description: string;
  exportEndpoint: string;
  exportFilename: string;
  importEndpoint: string;
  supportsImport: boolean;
  importDescription?: string;
}

export function DataExportImport() {
  const [exportStatus, setExportStatus] = useState<ExportStatus>({});
  const [importStatus, setImportStatus] = useState<ImportStatus>({});
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File | null }>({});
  const [duplicateStrategies, setDuplicateStrategies] = useState<{ [key: string]: string }>({});

  const handleExport = async (entityType: string, endpoint: string, filename: string) => {
    setExportStatus(prev => ({ ...prev, [entityType]: 'loading' }));

    try {
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportStatus(prev => ({ ...prev, [entityType]: 'success' }));
      toast.success(`${entityType} exported successfully`, {
        duration: 5000,
      });

      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, [entityType]: 'idle' }));
      }, 2000);
    } catch (error) {
      console.error(`Export error for ${entityType}:`, error);
      setExportStatus(prev => ({ ...prev, [entityType]: 'error' }));

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to export ${entityType}`, {
        description: errorMessage,
        duration: 8000,
      });

      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, [entityType]: 'idle' }));
      }, 3000);
    }
  };

  const handleImport = async (moduleKey: string, endpoint: string, moduleName: string) => {
    const file = selectedFiles[moduleKey];
    if (!file) {
      toast.error('Please select a file to import', {
        duration: 5000,
      });
      return;
    }

    setImportStatus(prev => ({ ...prev, [moduleKey]: 'loading' }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Add duplicate strategy if applicable
      const strategy = duplicateStrategies[moduleKey] || 'skip';
      if (moduleKey !== 'fullBackup') {
        formData.append('duplicateStrategy', strategy);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorDetails = data.details || data.error || 'Import failed';
        throw new Error(errorDetails);
      }

      setImportStatus(prev => ({ ...prev, [moduleKey]: 'success' }));

      // Display success message with details
      let description = '';
      if (data.results) {
        description = `Created: ${data.results.success || 0}, Updated: ${data.results.updated || 0}, Skipped: ${data.results.skipped || 0}, Failed: ${data.results.failed || 0}`;
      } else if (data.imported) {
        const totalRecords = Object.values(data.imported).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
        description = `Total records imported: ${totalRecords}`;
      }

      toast.success(`${moduleName} imported successfully!`, {
        description: description || undefined,
        duration: 6000,
      });

      setTimeout(() => {
        setImportStatus(prev => ({ ...prev, [moduleKey]: 'idle' }));
        setSelectedFiles(prev => ({ ...prev, [moduleKey]: null }));
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus(prev => ({ ...prev, [moduleKey]: 'error' }));

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to import ${moduleName}`, {
        description: errorMessage,
        duration: 10000,
      });

      setTimeout(() => {
        setImportStatus(prev => ({ ...prev, [moduleKey]: 'idle' }));
      }, 3000);
    }
  };

  const handleFileChange = (moduleKey: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type based on module
      const isFullBackup = moduleKey === 'fullBackup';
      const validExtension = isFullBackup ? file.name.endsWith('.xlsx') : (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'));

      if (!validExtension) {
        toast.error(`Please select a valid ${isFullBackup ? 'Excel (.xlsx, { duration: 10000 })' : 'CSV or Excel'} file`, {
          duration: 5000,
        });
        return;
      }

      setSelectedFiles(prev => ({ ...prev, [moduleKey]: file }));
      toast.info(`Selected file: ${file.name}`, {
        duration: 3000,
      });
    }
  };

  const getButtonIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getButtonVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default' as const;
      case 'error':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const modules: ModuleConfig[] = [
    {
      key: 'users',
      title: 'Users',
      description: 'User accounts with roles and permissions',
      exportEndpoint: '/api/users/export',
      exportFilename: `users_${new Date().toISOString().split('T')[0]}.csv`,
      importEndpoint: '/api/users/import',
      supportsImport: true,
      importDescription: 'Import users from CSV. If ID is included, user relationships (assets/subscriptions) are preserved. Requires: Email, Name (optional), Role (optional)',
    },
    {
      key: 'assets',
      title: 'Assets',
      description: 'Hardware and equipment inventory',
      exportEndpoint: '/api/assets/export',
      exportFilename: `assets_${new Date().toISOString().split('T')[0]}.csv`,
      importEndpoint: '/api/assets/import',
      supportsImport: true,
      importDescription: 'Import assets from CSV. Requires: Type, Model. Asset tags must be unique.',
    },
    {
      key: 'subscriptions',
      title: 'Subscriptions',
      description: 'Software licenses and subscriptions',
      exportEndpoint: '/api/subscriptions/export',
      exportFilename: `subscriptions_${new Date().toISOString().split('T')[0]}.csv`,
      importEndpoint: '/api/subscriptions/import',
      supportsImport: true,
      importDescription: 'Import subscriptions from CSV or Excel. Requires: Service Name, Billing Cycle',
    },
    {
      key: 'suppliers',
      title: 'Suppliers',
      description: 'Supplier directory and contacts',
      exportEndpoint: '/api/suppliers/export',
      exportFilename: `suppliers_${new Date().toISOString().split('T')[0]}.csv`,
      importEndpoint: '/api/suppliers/import',
      supportsImport: true,
      importDescription: 'Import suppliers from CSV. Requires: Name, Category',
    },
    {
      key: 'accreditations',
      title: 'Accreditations',
      description: 'Accreditation records and passes',
      exportEndpoint: '/api/accreditation/export',
      exportFilename: `accreditations_${new Date().toISOString().split('T')[0]}.csv`,
      importEndpoint: '/api/accreditation/import',
      supportsImport: false,
      importDescription: 'Use project-specific import on the Accreditation page',
    },
    {
      key: 'scans',
      title: 'Accreditation Scans',
      description: 'QR code scan history',
      exportEndpoint: '/api/accreditation/scans/export',
      exportFilename: `scans_${new Date().toISOString().split('T')[0]}.csv`,
      importEndpoint: '',
      supportsImport: false,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Full Database Backup Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Full Database Backup</h2>
          <p className="text-gray-600">Complete backup and restore for disaster recovery</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Export Full Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Export Full Backup
              </CardTitle>
              <CardDescription>
                Export all system data in a single Excel file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertDescription>
                  Exports 14 sheets: Users, Assets, Subscriptions, Suppliers, Projects, Accreditations, plus all history and activity logs
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => handleExport('fullBackup', '/api/export/full-backup', `full_backup_${new Date().toISOString().split('T')[0]}.xlsx`)}
                disabled={exportStatus.fullBackup === 'loading'}
                variant={getButtonVariant(exportStatus.fullBackup || 'idle')}
                className="w-full gap-2"
              >
                {getButtonIcon(exportStatus.fullBackup || 'idle')}
                {exportStatus.fullBackup === 'loading' ? 'Exporting...' : 'Export Full Backup'}
              </Button>
            </CardContent>
          </Card>

          {/* Import Full Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Full Backup
              </CardTitle>
              <CardDescription>
                Restore from a full backup file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 border-yellow-500 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Warning:</strong> This will update existing records. Make a backup first!
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label htmlFor="full-backup-file" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Backup File (.xlsx)
                  </label>
                  <input
                    id="full-backup-file"
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => handleFileChange('fullBackup', e)}
                    disabled={importStatus.fullBackup === 'loading'}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                  {selectedFiles.fullBackup && (
                    <p className="mt-2 text-sm text-gray-600">
                      {selectedFiles.fullBackup.name} ({(selectedFiles.fullBackup.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => handleImport('fullBackup', '/api/import/full-backup', 'Full Backup')}
                  disabled={!selectedFiles.fullBackup || importStatus.fullBackup === 'loading'}
                  variant={importStatus.fullBackup === 'error' ? 'destructive' : 'default'}
                  className="w-full gap-2"
                >
                  {importStatus.fullBackup === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {importStatus.fullBackup === 'success' && <CheckCircle2 className="h-4 w-4" />}
                  {importStatus.fullBackup === 'error' && <AlertCircle className="h-4 w-4" />}
                  {importStatus.fullBackup === 'idle' && <Upload className="h-4 w-4" />}
                  {importStatus.fullBackup === 'loading' ? 'Importing...' : importStatus.fullBackup === 'success' ? 'Import Complete!' : 'Import Full Backup'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Individual Modules Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Individual Modules</h2>
          <p className="text-gray-600">Export and import specific data modules</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Card key={module.key} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{module.title}</CardTitle>
                <CardDescription className="text-sm">
                  {module.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                {/* Export Section */}
                <div>
                  <Button
                    onClick={() => handleExport(module.key, module.exportEndpoint, module.exportFilename)}
                    disabled={exportStatus[module.key] === 'loading'}
                    variant={getButtonVariant(exportStatus[module.key] || 'idle')}
                    size="sm"
                    className="w-full gap-2"
                  >
                    {getButtonIcon(exportStatus[module.key] || 'idle')}
                    {exportStatus[module.key] === 'loading' ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </div>

                {/* Import Section */}
                {module.supportsImport ? (
                  <div className="space-y-3 pt-3 border-t">
                    <div>
                      <Label htmlFor={`${module.key}-file`} className="text-sm font-medium">
                        Import from File
                      </Label>
                      <input
                        id={`${module.key}-file`}
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={(e) => handleFileChange(module.key, e)}
                        disabled={importStatus[module.key] === 'loading'}
                        className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 mt-1"
                      />
                      {selectedFiles[module.key] && (
                        <p className="mt-1 text-xs text-gray-600">
                          {selectedFiles[module.key]!.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`${module.key}-strategy`} className="text-sm font-medium">
                        If duplicate exists:
                      </Label>
                      <Select
                        value={duplicateStrategies[module.key] || 'skip'}
                        onValueChange={(value) => setDuplicateStrategies(prev => ({ ...prev, [module.key]: value }))}
                      >
                        <SelectTrigger id={`${module.key}-strategy`} className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip (keep existing)</SelectItem>
                          <SelectItem value="update">Update existing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={() => handleImport(module.key, module.importEndpoint, module.title)}
                      disabled={!selectedFiles[module.key] || importStatus[module.key] === 'loading'}
                      variant={importStatus[module.key] === 'error' ? 'destructive' : 'default'}
                      size="sm"
                      className="w-full gap-2"
                    >
                      {importStatus[module.key] === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                      {importStatus[module.key] === 'success' && <CheckCircle2 className="h-4 w-4" />}
                      {importStatus[module.key] === 'error' && <AlertCircle className="h-4 w-4" />}
                      {importStatus[module.key] === 'idle' && <Upload className="h-4 w-4" />}
                      {importStatus[module.key] === 'loading' ? 'Importing...' : 'Import'}
                    </Button>

                    {module.importDescription && (
                      <p className="text-xs text-gray-500">{module.importDescription}</p>
                    )}
                  </div>
                ) : (
                  <div className="pt-3 border-t">
                    <Alert>
                      <AlertDescription className="text-xs">
                        {module.importDescription || 'Import not available for this module'}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Preserving Relationships (IMPORTANT):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>User Exports:</strong> Include user IDs which preserve asset and subscription ownership when re-importing</li>
              <li><strong>Best Practice:</strong> Always use the exported CSV/Excel file format which includes all necessary IDs</li>
              <li>If you delete and re-import users without IDs, their assets/subscriptions will be orphaned</li>
            </ul>
            <p className="mt-4"><strong>Duplicate Handling Strategies:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Skip:</strong> If a record with the same identifier (email, asset tag, supplier code, etc.) already exists, it will be skipped and the existing record kept unchanged.</li>
              <li><strong>Update:</strong> If a record exists, it will be updated with the new data from the import file. Useful for bulk updates.</li>
            </ul>
            <p className="mt-4"><strong>Tips:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Export a module first to see the correct CSV format and column headers</li>
              <li>Full backup uses Excel format (.xlsx) for better data preservation</li>
              <li>Individual imports accept both CSV and Excel formats</li>
              <li>Always make a backup before importing large datasets</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
