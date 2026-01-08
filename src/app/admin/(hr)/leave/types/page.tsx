'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaveTypeForm, LeaveTypeCard } from '@/features/leave/components';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface LeaveType {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  defaultDays: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  isPaid: boolean;
  isActive: boolean;
  maxConsecutiveDays?: number | null;
  minNoticeDays: number;
  allowCarryForward: boolean;
  maxCarryForwardDays?: number | null;
}

export default function AdminLeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch('/api/leave/types?includeInactive=true');
      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(data.leaveTypes);
      }
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/leave/types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        toast.success(`Leave type ${isActive ? 'activated' : 'deactivated'} successfully`);
        fetchLeaveTypes();
      } else {
        toast.error('Failed to update leave type');
      }
    } catch (error) {
      console.error('Failed to toggle leave type:', error);
      toast.error('An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/leave/types/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Leave type deleted successfully');
        fetchLeaveTypes();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete leave type');
      }
    } catch (error) {
      console.error('Failed to delete leave type:', error);
      toast.error('An error occurred while deleting leave type');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const activeTypes = leaveTypes.filter((t) => t.isActive);
  const inactiveTypes = leaveTypes.filter((t) => !t.isActive);

  return (
    <>
      <PageHeader
        title="Leave Types"
        subtitle="Configure leave types available in the system"
      />

      <PageContent>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Create Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Create Leave Type</CardTitle>
                <CardDescription>Add a new type of leave</CardDescription>
              </CardHeader>
              <CardContent>
                <LeaveTypeForm onSuccess={fetchLeaveTypes} />
              </CardContent>
            </Card>
          </div>

          {/* Leave Types List */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="active">
              <TabsList className="mb-4">
                <TabsTrigger value="active">
                  Active ({activeTypes.length})
                </TabsTrigger>
                <TabsTrigger value="inactive">
                  Inactive ({inactiveTypes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : activeTypes.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                      No active leave types. Create one to get started.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {activeTypes.map((leaveType) => (
                      <LeaveTypeCard
                        key={leaveType.id}
                        leaveType={leaveType}
                        onEdit={setEditingType}
                        onDelete={setDeleteId}
                        onToggleActive={handleToggleActive}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="inactive">
                {inactiveTypes.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                      No inactive leave types.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {inactiveTypes.map((leaveType) => (
                      <LeaveTypeCard
                        key={leaveType.id}
                        leaveType={leaveType}
                        onEdit={setEditingType}
                        onDelete={setDeleteId}
                        onToggleActive={handleToggleActive}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingType} onOpenChange={() => setEditingType(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Leave Type</DialogTitle>
            </DialogHeader>
            {editingType && (
              <LeaveTypeForm
                isEdit
                leaveTypeId={editingType.id}
                initialData={editingType}
                onSuccess={() => {
                  setEditingType(null);
                  fetchLeaveTypes();
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Leave Type?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. If there are existing leave requests
                with this type, the deletion will fail.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContent>
    </>
  );
}
