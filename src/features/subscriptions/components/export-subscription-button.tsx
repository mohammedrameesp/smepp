/**
 * @file export-subscription-button.tsx
 * @description Button triggering single subscription export to Excel
 * @module components/domains/operations/subscriptions
 *
 * Features:
 * - Exports single subscription data to Excel (.xlsx)
 * - Shows loading state during export
 * - Automatic file download with timestamped filename
 * - Error handling with toast notifications
 * - Download icon visual indicator
 * - Cleanup of blob URLs after download
 *
 * Props:
 * @param subscriptionId - ID of subscription to export
 *
 * Usage:
 * ```tsx
 * <ExportSubscriptionButton subscriptionId="sub_xyz123" />
 * ```
 *
 * User Flow:
 * 1. User clicks Export button
 * 2. Button shows "Exporting..." loading state
 * 3. API call fetches Excel file as blob
 * 4. Browser downloads file with auto-generated filename
 * 5. Button returns to normal state
 * 6. On error: Toast shows error message
 *
 * Filename Format:
 * subscription_[id]_[YYYY-MM-DD].xlsx
 *
 * API: GET /api/subscriptions/[id]/export
 *
 * Note: For bulk export of all subscriptions, see the main
 * export functionality at /api/subscriptions/export
 */
'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportSubscriptionButtonProps {
  subscriptionId: string;
}

export function ExportSubscriptionButton({ subscriptionId }: ExportSubscriptionButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch(`/api/subscriptions/${subscriptionId}/export`);

      if (!response.ok) {
        throw new Error('Failed to export subscription');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscription_${subscriptionId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export subscription', { duration: 10000 });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={isExporting}
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? 'Exporting...' : 'Export'}
    </Button>
  );
}
