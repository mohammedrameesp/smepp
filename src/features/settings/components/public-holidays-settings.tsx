'use client';

/**
 * @file public-holidays-settings.tsx
 * @description Public holidays management for organization settings
 * @module components/domains/system/settings
 *
 * FEATURES:
 * - All Qatar holidays pre-populated (Eid al-Fitr, Eid al-Adha, National Day, Sports Day)
 * - Dates shown as "Not set" until configured
 * - Year-based filtering
 * - Support for multi-day holidays (e.g., Eid)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { formatDayMonth } from '@/lib/core/datetime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Pencil, Loader2, Plus } from 'lucide-react';

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

/**
 * Calculate the 2nd Tuesday of February for a given year
 */
function getSportsDayDate(year: number): { month: number; day: number } {
  // Start from February 1st
  const feb1 = new Date(year, 1, 1); // Month is 0-indexed, so 1 = February
  const dayOfWeek = feb1.getDay(); // 0 = Sunday, 2 = Tuesday

  // Calculate days until the first Tuesday
  let daysUntilFirstTuesday = (2 - dayOfWeek + 7) % 7;
  if (daysUntilFirstTuesday === 0) daysUntilFirstTuesday = 7; // If Feb 1 is Tuesday, first Tuesday is Feb 1

  // Actually, if Feb 1 is a Tuesday, that's the first Tuesday (day 1)
  if (dayOfWeek === 2) {
    daysUntilFirstTuesday = 0;
  }

  // First Tuesday date
  const firstTuesday = 1 + daysUntilFirstTuesday;
  // Second Tuesday is 7 days later
  const secondTuesday = firstTuesday + 7;

  return { month: 2, day: secondTuesday };
}

// Qatar public holidays template - these always appear
const QATAR_HOLIDAYS_TEMPLATE = [
  {
    name: 'Eid al-Fitr',
    description: 'End of Ramadan (min 3 days, includes weekends)',
    minDays: 3,
    durationDays: 3, // Default, but can be more
    isRecurring: false,
    flexibleDuration: true, // User can set more than minimum
    color: '#22C55E', // Green
  },
  {
    name: 'Eid al-Adha',
    description: 'Feast of Sacrifice (min 3 days, includes weekends)',
    minDays: 3,
    durationDays: 3, // Default, but can be more
    isRecurring: false,
    flexibleDuration: true, // User can set more than minimum
    color: '#3B82F6', // Blue
  },
  {
    name: 'Qatar National Day',
    description: 'December 18 - Unification of Qatar',
    durationDays: 1,
    isRecurring: true,
    defaultMonth: 12,
    defaultDay: 18,
    color: '#8B1538', // Maroon (Qatar color)
  },
  {
    name: 'Sports Day',
    description: '2nd Tuesday of February',
    durationDays: 1,
    isRecurring: false,
    calculateDate: getSportsDayDate, // Dynamic calculation
    color: '#F59E0B', // Amber
  },
];

interface HolidayDisplayRow {
  id: string | null; // null if not yet in database
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  durationDays: number;
  minDays?: number; // Minimum days for flexible holidays
  isRecurring: boolean;
  color: string;
  isConfigured: boolean;
  flexibleDuration?: boolean; // Can set more than default duration
}

interface PublicHolidaysSettingsProps {
  isAdmin?: boolean;
}

export function PublicHolidaysSettings({ isAdmin = true }: PublicHolidaysSettingsProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingHoliday, setSavingHoliday] = useState<string | null>(null);

  // Edit dialog state
  const [editingHoliday, setEditingHoliday] = useState<HolidayDisplayRow | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  // Custom holiday dialog
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

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

  // Merge template holidays with database holidays
  const displayHolidays = useMemo((): HolidayDisplayRow[] => {
    const rows: HolidayDisplayRow[] = [];

    // Add template holidays (always shown)
    for (const template of QATAR_HOLIDAYS_TEMPLATE) {
      const dbHoliday = holidays.find((h) => h.name === template.name);

      if (dbHoliday) {
        rows.push({
          id: dbHoliday.id,
          name: dbHoliday.name,
          description: dbHoliday.description || template.description,
          startDate: dbHoliday.startDate,
          endDate: dbHoliday.endDate,
          durationDays: getDurationDays(dbHoliday.startDate, dbHoliday.endDate),
          minDays: 'minDays' in template ? template.minDays : undefined,
          isRecurring: template.isRecurring,
          color: dbHoliday.color || template.color,
          isConfigured: true,
          flexibleDuration: 'flexibleDuration' in template ? template.flexibleDuration : false,
        });
      } else {
        // Not in database - show as unconfigured
        let defaultStart: string | null = null;
        let defaultEnd: string | null = null;

        // For National Day, pre-fill the default date
        if (template.defaultMonth && template.defaultDay) {
          defaultStart = `${selectedYear}-${String(template.defaultMonth).padStart(2, '0')}-${String(template.defaultDay).padStart(2, '0')}`;
          defaultEnd = defaultStart;
        }

        // For Sports Day, calculate the 2nd Tuesday of February
        if ('calculateDate' in template && template.calculateDate) {
          const calculated = template.calculateDate(selectedYear);
          defaultStart = `${selectedYear}-${String(calculated.month).padStart(2, '0')}-${String(calculated.day).padStart(2, '0')}`;
          defaultEnd = defaultStart;
        }

        rows.push({
          id: null,
          name: template.name,
          description: template.description,
          startDate: defaultStart,
          endDate: defaultEnd,
          durationDays: template.durationDays,
          minDays: 'minDays' in template ? template.minDays : undefined,
          isRecurring: template.isRecurring,
          color: template.color,
          isConfigured: false,
          flexibleDuration: 'flexibleDuration' in template ? template.flexibleDuration : false,
        });
      }
    }

    // Add any custom holidays not in template
    for (const dbHoliday of holidays) {
      const isTemplate = QATAR_HOLIDAYS_TEMPLATE.some((t) => t.name === dbHoliday.name);
      if (!isTemplate) {
        rows.push({
          id: dbHoliday.id,
          name: dbHoliday.name,
          description: dbHoliday.description || '',
          startDate: dbHoliday.startDate,
          endDate: dbHoliday.endDate,
          durationDays: getDurationDays(dbHoliday.startDate, dbHoliday.endDate),
          isRecurring: dbHoliday.isRecurring,
          color: dbHoliday.color,
          isConfigured: true,
        });
      }
    }

    return rows;
  }, [holidays, selectedYear]);

  function getDurationDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  function formatHolidayDate(dateString: string | null): string {
    if (!dateString) return '';
    return formatDayMonth(new Date(dateString));
  }

  function formatDateRange(startDate: string | null, endDate: string | null): string {
    if (!startDate || !endDate) return 'Not set';
    const start = formatHolidayDate(startDate);
    const end = formatHolidayDate(endDate);
    if (start === end) return start;
    return `${start} - ${end}`;
  }

  function openEditDialog(holiday: HolidayDisplayRow) {
    setEditingHoliday(holiday);
    setEditStartDate(holiday.startDate?.split('T')[0] || '');
    setEditEndDate(holiday.endDate?.split('T')[0] || '');
  }

  async function handleSaveHoliday() {
    if (!editingHoliday || !editStartDate || !editEndDate) return;

    setSavingHoliday(editingHoliday.name);

    try {
      if (editingHoliday.id) {
        // Update existing
        const response = await fetch(`/api/admin/public-holidays/${editingHoliday.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: editStartDate,
            endDate: editEndDate,
          }),
        });

        if (response.ok) {
          toast.success(`${editingHoliday.name} updated`);
          setEditingHoliday(null);
          fetchHolidays();
        } else {
          const data = await response.json();
          toast.error(data.error || 'Failed to update holiday');
        }
      } else {
        // Create new
        const response = await fetch('/api/admin/public-holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingHoliday.name,
            description: editingHoliday.description,
            startDate: editStartDate,
            endDate: editEndDate,
            year: selectedYear,
            isRecurring: editingHoliday.isRecurring,
            color: editingHoliday.color,
          }),
        });

        if (response.ok) {
          toast.success(`${editingHoliday.name} configured`);
          setEditingHoliday(null);
          fetchHolidays();
        } else {
          const data = await response.json();
          toast.error(data.error || 'Failed to save holiday');
        }
      }
    } catch (error) {
      console.error('Error saving holiday:', error);
      toast.error('Failed to save holiday');
    } finally {
      setSavingHoliday(null);
    }
  }

  async function handleClearHoliday(holiday: HolidayDisplayRow) {
    if (!holiday.id) return;

    setSavingHoliday(holiday.name);
    try {
      const response = await fetch(`/api/admin/public-holidays/${holiday.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`${holiday.name} dates cleared`);
        fetchHolidays();
      } else {
        toast.error('Failed to clear holiday');
      }
    } catch (error) {
      console.error('Error clearing holiday:', error);
      toast.error('Failed to clear holiday');
    } finally {
      setSavingHoliday(null);
    }
  }

  async function handleAddCustomHoliday(e: React.FormEvent) {
    e.preventDefault();
    if (!customName.trim() || !customStartDate || !customEndDate) return;

    setIsAddingCustom(true);
    try {
      const response = await fetch('/api/admin/public-holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName.trim(),
          description: '',
          startDate: customStartDate,
          endDate: customEndDate,
          year: selectedYear,
          isRecurring: false,
          color: '#6B7280',
        }),
      });

      if (response.ok) {
        toast.success('Custom holiday added');
        setShowAddCustom(false);
        setCustomName('');
        setCustomStartDate('');
        setCustomEndDate('');
        fetchHolidays();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add holiday');
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast.error('Failed to add holiday');
    } finally {
      setIsAddingCustom(false);
    }
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
                <Button variant="outline" size="sm" onClick={() => setShowAddCustom(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom
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
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Holiday</TableHead>
                    <TableHead>Date(s)</TableHead>
                    <TableHead className="text-center w-20">Days</TableHead>
                    <TableHead className="text-center w-24">Status</TableHead>
                    {isAdmin && <TableHead className="text-right w-24">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayHolidays.map((holiday) => (
                    <TableRow
                      key={holiday.name}
                      className={!holiday.isConfigured ? 'bg-muted/30' : ''}
                    >
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
                            <span className="ml-2 text-xs text-muted-foreground">(Fixed)</span>
                          )}
                          <p className="text-sm text-muted-foreground">{holiday.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {holiday.isConfigured ? (
                          <span>{formatDateRange(holiday.startDate, holiday.endDate)}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Not set</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{holiday.durationDays}</TableCell>
                      <TableCell className="text-center">
                        {holiday.isConfigured ? (
                          <Badge variant="default" className="bg-green-600">
                            Set
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(holiday)}
                            disabled={savingHoliday === holiday.name}
                          >
                            {savingHoliday === holiday.name ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Pencil className="h-4 w-4 mr-1" />
                                {holiday.isConfigured ? 'Edit' : 'Set'}
                              </>
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Set Holiday Dialog */}
      <Dialog open={!!editingHoliday} onOpenChange={(open) => !open && setEditingHoliday(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday?.isConfigured ? 'Edit' : 'Set'} {editingHoliday?.name}
            </DialogTitle>
            <DialogDescription>
              {editingHoliday?.description}
              {editingHoliday && editingHoliday.flexibleDuration && editingHoliday.minDays && (
                <span className="block mt-1 text-blue-600">
                  Minimum {editingHoliday.minDays} days (can be extended)
                </span>
              )}
              {editingHoliday && !editingHoliday.flexibleDuration && editingHoliday.durationDays > 1 && (
                <span className="block mt-1 text-blue-600">
                  This holiday spans {editingHoliday.durationDays} days
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => {
                    setEditStartDate(e.target.value);
                    // Auto-set end date based on duration (only for fixed-duration holidays)
                    if (editingHoliday && e.target.value && !editingHoliday.flexibleDuration) {
                      const start = new Date(e.target.value);
                      start.setDate(start.getDate() + editingHoliday.durationDays - 1);
                      setEditEndDate(start.toISOString().split('T')[0]);
                    }
                    // For flexible holidays, set minimum end date
                    if (editingHoliday && e.target.value && editingHoliday.flexibleDuration && editingHoliday.minDays) {
                      const start = new Date(e.target.value);
                      start.setDate(start.getDate() + editingHoliday.minDays - 1);
                      setEditEndDate(start.toISOString().split('T')[0]);
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-date">End Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  min={editStartDate ? (() => {
                    // For flexible holidays, enforce minimum days
                    if (editingHoliday?.flexibleDuration && editingHoliday?.minDays) {
                      const start = new Date(editStartDate);
                      start.setDate(start.getDate() + editingHoliday.minDays - 1);
                      return start.toISOString().split('T')[0];
                    }
                    return editStartDate;
                  })() : undefined}
                />
                {editingHoliday?.flexibleDuration && editStartDate && editEndDate && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {getDurationDays(editStartDate, editEndDate)} days
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <div>
              {editingHoliday?.isConfigured && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    if (editingHoliday) {
                      handleClearHoliday(editingHoliday);
                      setEditingHoliday(null);
                    }
                  }}
                >
                  Clear Dates
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingHoliday(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveHoliday}
                disabled={!editStartDate || !editEndDate || !!savingHoliday}
              >
                {savingHoliday ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Holiday Dialog */}
      <Dialog open={showAddCustom} onOpenChange={setShowAddCustom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Holiday</DialogTitle>
            <DialogDescription>Add a holiday not in the standard Qatar list</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCustomHoliday}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="custom-name">Holiday Name</Label>
                <Input
                  id="custom-name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., Company Anniversary"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-start-date">Start Date</Label>
                  <Input
                    id="custom-start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => {
                      setCustomStartDate(e.target.value);
                      if (!customEndDate) setCustomEndDate(e.target.value);
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-end-date">End Date</Label>
                  <Input
                    id="custom-end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddCustom(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingCustom}>
                {isAddingCustom ? 'Adding...' : 'Add Holiday'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
