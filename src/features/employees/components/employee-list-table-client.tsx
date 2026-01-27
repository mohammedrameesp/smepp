/**
 * @file employee-list-table-client.tsx
 * @description Client wrapper that fetches all employees and renders the filterable table
 * @module features/employees/components
 */
'use client';

import { useState, useEffect } from 'react';
import { EmployeeListTableFiltered, type EmployeeListItem } from './employee-list-table-filtered';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ICON_SIZES } from '@/lib/constants';

export function EmployeeListTableClient() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all employees (large page size, no pagination)
      const response = await fetch('/api/employees?ps=10000');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch employees');
      }
      const data = await response.json();
      setEmployees(data.employees);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch employees';
      console.error('Error fetching employees:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className={`${ICON_SIZES.xl} animate-spin text-gray-400 mb-3`} />
        <p className="text-gray-500">Loading employees...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertCircle className={ICON_SIZES.sm} />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchEmployees}>
            <RefreshCw className={`${ICON_SIZES.sm} mr-1`} />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <EmployeeListTableFiltered employees={employees} />;
}
