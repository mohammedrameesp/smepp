'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  RotateCcw,
  Clock,
  AlertTriangle,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDate } from '@/lib/core/datetime';

interface DeletedEmployee {
  id: string;
  name: string | null;
  email: string;
  employeeCode: string | null;
  designation: string | null;
  department: string | null;
  deletedAt: Date | null;
  scheduledDeletionAt: Date | null;
  daysRemaining: number;
}

interface DeletedEmployeesTableProps {
  employees: DeletedEmployee[];
}

export function DeletedEmployeesTable({ employees }: DeletedEmployeesTableProps) {
  const router = useRouter();
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  const handleRestore = async (employeeId: string) => {
    setIsRestoring(employeeId);
    try {
      const response = await fetch(`/api/users/${employeeId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to restore employee');
      }

      toast.success('Employee restored successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore employee');
    } finally {
      setIsRestoring(null);
    }
  };

  if (employees.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Trash is empty</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Deleted employees will appear here. They can be restored within 30 days before being permanently removed.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-800 font-medium">Auto-deletion enabled</p>
          <p className="text-amber-700 text-sm">
            Deleted employees are automatically removed after 30 days. Restore them before the deadline to prevent permanent deletion.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Employee</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Department</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Deleted On</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Time Left</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((employee) => {
                const isUrgent = employee.daysRemaining <= 7;
                return (
                  <tr key={employee.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{employee.name || employee.email}</p>
                          <p className="text-sm text-slate-500">
                            {employee.employeeCode && <span className="font-mono">{employee.employeeCode} • </span>}
                            {employee.designation || 'No designation'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {employee.department ? (
                        <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                          {employee.department}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-slate-900">{employee.deletedAt ? formatDate(employee.deletedAt) : '-'}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        <Clock className="h-3.5 w-3.5" />
                        {employee.daysRemaining} day{employee.daysRemaining !== 1 ? 's' : ''} left
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(employee.id)}
                          disabled={isRestoring === employee.id}
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          {isRestoring === employee.id ? 'Restoring...' : 'Restore'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
