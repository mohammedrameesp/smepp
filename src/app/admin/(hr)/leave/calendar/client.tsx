'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLeaveStatusVariant, formatLeaveDays, isPublicHoliday, type PublicHolidayData } from '@/features/leave/lib/leave-utils';
import { LeaveStatus } from '@prisma/client';
import Link from 'next/link';
import { formatDayMonth } from '@/lib/core/datetime';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  extendedProps: {
    requestNumber: string;
    userId: string;
    userName: string;
    userEmail: string;
    leaveTypeId: string;
    leaveTypeName: string;
    status: string;
    totalDays: number;
    requestType: string;
  };
}

interface LeaveType {
  id: string;
  name: string;
  color: string;
}

export function LeaveCalendarClient() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('approved');
  const [weekendDays, setWeekendDays] = useState<number[]>([5, 6]); // Default Friday-Saturday
  const [publicHolidays, setPublicHolidays] = useState<PublicHolidayData[]>([]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Get first and last day of the month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const params = new URLSearchParams();
      params.set('startDate', firstDay.toISOString().split('T')[0]);
      params.set('endDate', lastDay.toISOString().split('T')[0]);
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter.toUpperCase());
      }

      const response = await fetch(`/api/leave/calendar?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, statusFilter]);

  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch('/api/leave/types');
      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(data.leaveTypes || []);
      }
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  // Fetch organization settings for weekend days
  useEffect(() => {
    const fetchOrgSettings = async () => {
      try {
        const response = await fetch('/api/admin/organization', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.organization?.weekendDays?.length > 0) {
            setWeekendDays(data.organization.weekendDays);
          }
        }
      } catch (error) {
        console.error('Failed to fetch organization settings:', error);
      }
    };
    fetchOrgSettings();
  }, []);

  // Fetch public holidays when the year changes
  useEffect(() => {
    const fetchPublicHolidays = async () => {
      try {
        const year = currentDate.getFullYear();
        const response = await fetch(`/api/admin/public-holidays?year=${year}`);
        if (response.ok) {
          const data = await response.json();
          const holidays = (data.data || []).map((h: { id: string; name: string; description?: string | null; startDate: string; endDate: string; year: number; isRecurring: boolean; color: string }) => ({
            ...h,
            startDate: new Date(h.startDate),
            endDate: new Date(h.endDate),
          }));
          setPublicHolidays(holidays);
        }
      } catch (error) {
        console.error('Failed to fetch public holidays:', error);
      }
    };
    fetchPublicHolidays();
  }, [currentDate]);

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ date: Date | null; events: CalendarEvent[] }> = [];

    // Add empty days for the start of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: null, events: [] });
    }

    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];

      // Find events that include this day
      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.start).toISOString().split('T')[0];
        const eventEnd = new Date(event.end).toISOString().split('T')[0];
        return dateStr >= eventStart && dateStr <= eventEnd;
      });

      days.push({ date, events: dayEvents });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-lg min-w-[180px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={goToToday} disabled={isCurrentMonth}>
              Today
            </Button>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b">
          {leaveTypes.map(type => (
            <div key={type.id} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: type.color }}
              />
              <span>{type.name}</span>
            </div>
          ))}
          {publicHolidays.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Public Holiday</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {/* Day headers */}
            {dayNames.map(day => (
              <div
                key={day}
                className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-500"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              const isToday = day.date?.toDateString() === today.toDateString();
              const isWeekend = day.date && weekendDays.includes(day.date.getDay());
              const holidayName = day.date ? isPublicHoliday(day.date, publicHolidays) : null;
              const isHoliday = holidayName !== null;

              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 ${
                    day.date ? 'bg-white' : 'bg-gray-50'
                  } ${isWeekend ? 'bg-gray-50' : ''} ${isHoliday ? 'bg-red-50' : ''}`}
                >
                  {day.date && (
                    <>
                      <div
                        className={`text-sm mb-1 ${
                          isToday
                            ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                            : 'text-gray-500'
                        } ${isWeekend ? 'text-gray-400' : ''} ${isHoliday ? 'text-red-600 font-medium' : ''}`}
                      >
                        {day.date.getDate()}
                      </div>
                      {isHoliday && (
                        <div
                          className="text-xs p-1 rounded truncate text-white bg-red-500 mb-1"
                          title={holidayName}
                        >
                          {holidayName}
                        </div>
                      )}
                      <div className="space-y-1">
                        {day.events.slice(0, isHoliday ? 2 : 3).map(event => (
                          <Link
                            key={event.id}
                            href={`/admin/leave/requests/${event.id}`}
                            className="block"
                          >
                            <div
                              className="text-xs p-1 rounded truncate text-white hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: event.backgroundColor }}
                              title={`${event.extendedProps.userName} - ${event.extendedProps.leaveTypeName}`}
                            >
                              {event.extendedProps.userName.split(' ')[0]}
                            </div>
                          </Link>
                        ))}
                        {day.events.length > (isHoliday ? 2 : 3) && (
                          <div className="text-xs text-gray-500">
                            +{day.events.length - (isHoliday ? 2 : 3)} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Events List for the month */}
        {events.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-4">Leaves This Month ({events.length})</h3>
            <div className="space-y-2">
              {events.map(event => (
                <Link
                  key={event.id}
                  href={`/admin/leave/requests/${event.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: event.backgroundColor }}
                    />
                    <div>
                      <div className="font-medium">{event.extendedProps.userName}</div>
                      <div className="text-sm text-gray-500">
                        {event.extendedProps.leaveTypeName} - {formatLeaveDays(event.extendedProps.totalDays)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-500">
                      {formatDayMonth(event.start)}
                      {event.start !== event.end && (
                        <> - {formatDayMonth(event.end)}</>
                      )}
                    </div>
                    <Badge variant={getLeaveStatusVariant(event.extendedProps.status as LeaveStatus)}>
                      {event.extendedProps.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
