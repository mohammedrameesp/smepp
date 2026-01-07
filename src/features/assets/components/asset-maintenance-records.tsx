/**
 * @file asset-maintenance-records.tsx
 * @description Card component for viewing and managing asset maintenance history
 * @module components/domains/operations/assets
 *
 * Features:
 * - Lists all maintenance records for an asset chronologically
 * - Inline form to add new maintenance records (admin only)
 * - Read-only mode for employee view
 * - Shows maintenance date, notes, and when record was added
 * - Toast notifications for success/error feedback
 *
 * Props:
 * - assetId: ID of the asset to manage maintenance for
 * - readOnly: If true, hides add form (default: false)
 *
 * API Dependencies:
 * - GET /api/assets/[id]/maintenance - Fetches maintenance records
 * - POST /api/assets/[id]/maintenance - Creates new maintenance record
 *
 * Usage:
 * - Used on asset detail page (/admin/assets/[id])
 * - Used on employee asset detail page (/employee/assets/[id]) in read-only mode
 * - Track service history, repairs, and preventive maintenance
 *
 * Access: Admin (read/write), Employee (read-only)
 */
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/date-format';

interface MaintenanceRecord {
  id: string;
  maintenanceDate: string;
  notes: string | null;
  performedBy: string | null;
  createdAt: string;
}

interface AssetMaintenanceRecordsProps {
  assetId: string;
  readOnly?: boolean;
}

export function AssetMaintenanceRecords({ assetId, readOnly = false }: AssetMaintenanceRecordsProps) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    maintenanceDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchRecords();
  }, [assetId]);

  const fetchRecords = async () => {
    try {
      const response = await fetch(`/api/assets/${assetId}/maintenance`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      }
    } catch (error) {
      console.error('Failed to fetch maintenance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/assets/${assetId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Reset form
        setFormData({
          maintenanceDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
        setShowForm(false);
        // Refresh records
        fetchRecords();
      } else {
        toast.error('Failed to add maintenance record', { duration: 10000 });
      }
    } catch (error) {
      console.error('Error adding maintenance record:', error);
      toast.error('Failed to add maintenance record', { duration: 10000 });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Maintenance Records</CardTitle>
            <CardDescription>
              Track maintenance history and service records
            </CardDescription>
          </div>
          {!readOnly && (
            <Button
              onClick={() => setShowForm(!showForm)}
              variant={showForm ? 'outline' : 'default'}
            >
              {showForm ? 'Cancel' : '+ Add Record'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!readOnly && showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <div>
                <Label htmlFor="maintenanceDate">Maintenance Date</Label>
                <Input
                  id="maintenanceDate"
                  type="date"
                  value={formData.maintenanceDate}
                  onChange={(e) =>
                    setFormData({ ...formData, maintenanceDate: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes / Description</Label>
                <Textarea
                  id="notes"
                  placeholder="Describe the maintenance work performed..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Maintenance Record'}
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading maintenance records...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No maintenance records yet
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-gray-900">
                    {formatDate(new Date(record.maintenanceDate))}
                  </div>
                  <div className="text-xs text-gray-500">
                    Added {formatDate(new Date(record.createdAt))}
                  </div>
                </div>
                {record.notes && (
                  <div className="text-gray-700 whitespace-pre-wrap mt-2">
                    {record.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
