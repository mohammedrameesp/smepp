'use client';

/**
 * @file public-holidays-settings.tsx
 * @description Public holidays management for organization settings
 * @module components/domains/system/settings
 *
 * FEATURES:
 * - View, create, edit, delete public holidays
 * - Year-based filtering
 * - Seed Qatar holidays for selected year
 * - Support for multi-day holidays (e.g., Eid)
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Plus, Pencil, Trash2, Loader2, Sparkles } from 'lucide-react';

interface PublicHoliday {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  year: number;
  isRecurring: boolean;
  color: string;
}

// Qatar public holidays template
const QATAR_HOLIDAYS_TEMPLATE = [
  {
    name: 'Eid al-Fitr',
    description: 'End of Ramadan celebration (3 days)',
    durationDays: 3,
    isRecurring: false, // Variable date (Islamic calendar)
  },
  {
    name: 'Eid al-Adha',
    description: 'Feast of Sacrifice (3 days)',
    durationDays: 3,
    isRecurring: false, // Variable date (Islamic calendar)
  },
  {
    name: 'Qatar National Day',
    description: 'Celebrates the unification of Qatar',
    defaultMonth: 12,
    defaultDay: 18,
    durationDays: 1,
    isRecurring: true, // Fixed date
  },
  {
    name: 'Sports Day',
    description: 'National Sports Day (2nd Tuesday of February)',
    durationDays: 1,
    isRecurring: false, // Variable date (2nd Tuesday of Feb)
  },
];

interface PublicHolidaysSettingsProps {
  isAdmin?: boolean;
}

export function PublicHolidaysSettings({ isAdmin = true }: PublicHolidaysSettingsProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createEndDate, setCreateEndDate] = useState('');
  const [createColor, setCreateColor] = useState('#EF4444');
  const [createIsRecurring, setCreateIsRecurring] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog state
  const [editHoliday, setEditHoliday] = useState<PublicHoliday | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editColor, setEditColor] = useState('#EF4444');
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete dialog state
  const [deleteHoliday, setDeleteHoliday] = useState<PublicHoliday | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Seed holidays state
  const [isSeedDialogOpen, setIsSeedDialogOpen] = useState(false);

  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/public-holidays?year=${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setHolidays(data.data || []);
      } else {
        toast.error('Failed to load holidays');
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  function resetCreateForm() {
    setCreateName('');
    setCreateDescription('');
    setCreateStartDate('');
    setCreateEndDate('');
    setCreateColor('#EF4444');
    setCreateIsRecurring(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim() || !createStartDate || !createEndDate) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/public-holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDescription.trim() || null,
          startDate: createStartDate,
          endDate: createEndDate,
          year: selectedYear,
          isRecurring: createIsRecurring,
          color: createColor,
        }),
      });

      if (response.ok) {
        toast.success('Holiday created successfully');
        resetCreateForm();
        setShowCreateDialog(false);
        fetchHolidays();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create holiday');
      }
    } catch (error) {
      console.error('Error creating holiday:', error);
      toast.error('Failed to create holiday');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editHoliday || !editName.trim() || !editStartDate || !editEndDate) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/public-holidays/${editHoliday.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          startDate: editStartDate,
          endDate: editEndDate,
          isRecurring: editIsRecurring,
          color: editColor,
        }),
      });

      if (response.ok) {
        toast.success('Holiday updated successfully');
        setEditHoliday(null);
        fetchHolidays();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update holiday');
      }
    } catch (error) {
      console.error('Error updating holiday:', error);
      toast.error('Failed to update holiday');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deleteHoliday) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/public-holidays/${deleteHoliday.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Holiday deleted');
        setDeleteHoliday(null);
        fetchHolidays();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete holiday');
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    } finally {
      setIsDeleting(false);
    }
  }

  function openEditDialog(holiday: PublicHoliday) {
    setEditHoliday(holiday);
    setEditName(holiday.name);
    setEditDescription(holiday.description || '');
    setEditStartDate(holiday.startDate.split('T')[0]);
    setEditEndDate(holiday.endDate.split('T')[0]);
    setEditColor(holiday.color);
    setEditIsRecurring(holiday.isRecurring);
  }

  async function seedQatarHolidays() {
    setIsSeedDialogOpen(false);

    // Only seed fixed-date holidays automatically
    const nationalDay = QATAR_HOLIDAYS_TEMPLATE.find((h) => h.name === 'Qatar National Day');
    if (nationalDay && nationalDay.defaultMonth && nationalDay.defaultDay) {
      try {
        const startDate = `${selectedYear}-${String(nationalDay.defaultMonth).padStart(2, '0')}-${String(nationalDay.defaultDay).padStart(2, '0')}`;
        const response = await fetch('/api/admin/public-holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nationalDay.name,
            description: nationalDay.description,
            startDate,
            endDate: startDate,
            year: selectedYear,
            isRecurring: nationalDay.isRecurring,
            color: '#EF4444',
          }),
        });

        if (response.ok) {
          toast.success('Qatar National Day added');
        } else {
          const data = await response.json();
          if (data.error?.includes('already exists')) {
            toast.info('Qatar National Day already exists for this year');
          }
        }
      } catch (error) {
        console.error('Error seeding holiday:', error);
      }
    }

    // Refresh the list
    fetchHolidays();
    toast.info('Variable holidays (Eid, Sports Day) need dates set manually each year');
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatDateRange(startDate: string, endDate: string) {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    if (start === end) return start;
    return `${start} - ${end}`;
  }

  function getDurationDays(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

  // Generate year options (current year - 1 to current year + 2)
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Calendar className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle>Public Holidays</CardTitle>
                <CardDescription>
                  Configure public holidays to exclude from leave calculations
                </CardDescription>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setIsSeedDialogOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Add Qatar Holidays
                </Button>
                <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Holiday
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading holidays...
            </div>
          ) : holidays.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground space-y-4">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p>No holidays configured for {selectedYear}.</p>
              {isAdmin && (
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => setIsSeedDialogOpen(true)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Add Qatar Holidays
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Holiday
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Holiday</TableHead>
                    <TableHead>Date(s)</TableHead>
                    <TableHead className="text-center w-24">Days</TableHead>
                    <TableHead className="text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: holiday.color }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{holiday.name}</span>
                          {holiday.isRecurring && (
                            <span className="ml-2 text-xs text-muted-foreground">(Recurring)</span>
                          )}
                          {holiday.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {holiday.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateRange(holiday.startDate, holiday.endDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getDurationDays(holiday.startDate, holiday.endDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(holiday)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteHoliday(holiday)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Public Holiday</DialogTitle>
            <DialogDescription>
              Create a new public holiday for {selectedYear}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Holiday Name *</Label>
                <Input
                  id="create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g., Eid al-Fitr, National Day"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-start-date">Start Date *</Label>
                  <Input
                    id="create-start-date"
                    type="date"
                    value={createStartDate}
                    onChange={(e) => {
                      setCreateStartDate(e.target.value);
                      if (!createEndDate || e.target.value > createEndDate) {
                        setCreateEndDate(e.target.value);
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-end-date">End Date *</Label>
                  <Input
                    id="create-end-date"
                    type="date"
                    value={createEndDate}
                    onChange={(e) => setCreateEndDate(e.target.value)}
                    min={createStartDate}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="create-color"
                      type="color"
                      value={createColor}
                      onChange={(e) => setCreateColor(e.target.value)}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={createColor}
                      onChange={(e) => setCreateColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Recurring</Label>
                  <Select
                    value={createIsRecurring ? 'yes' : 'no'}
                    onValueChange={(v) => setCreateIsRecurring(v === 'yes')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No (variable date)</SelectItem>
                      <SelectItem value="yes">Yes (fixed date)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !createName.trim() || !createStartDate || !createEndDate}
              >
                {isCreating ? 'Creating...' : 'Create Holiday'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editHoliday} onOpenChange={(open) => !open && setEditHoliday(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Public Holiday</DialogTitle>
            <DialogDescription>Update the holiday details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Holiday Name *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start-date">Start Date *</Label>
                  <Input
                    id="edit-start-date"
                    type="date"
                    value={editStartDate}
                    onChange={(e) => {
                      setEditStartDate(e.target.value);
                      if (e.target.value > editEndDate) {
                        setEditEndDate(e.target.value);
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-end-date">End Date *</Label>
                  <Input
                    id="edit-end-date"
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    min={editStartDate}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-color"
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Recurring</Label>
                  <Select
                    value={editIsRecurring ? 'yes' : 'no'}
                    onValueChange={(v) => setEditIsRecurring(v === 'yes')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No (variable date)</SelectItem>
                      <SelectItem value="yes">Yes (fixed date)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditHoliday(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating || !editName.trim() || !editStartDate || !editEndDate}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteHoliday} onOpenChange={(open) => !open && setDeleteHoliday(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteHoliday?.name}&quot;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Seed Qatar Holidays Confirmation */}
      <AlertDialog open={isSeedDialogOpen} onOpenChange={setIsSeedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Qatar Holidays</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will add Qatar National Day (December 18) for {selectedYear}.</p>
              <p className="text-sm text-muted-foreground">
                Note: Variable holidays like Eid al-Fitr, Eid al-Adha, and Sports Day need to be
                added manually each year as their dates change based on the Islamic calendar.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={seedQatarHolidays}>Add Holidays</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
