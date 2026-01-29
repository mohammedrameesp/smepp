/**
 * @file calendar-utils.test.ts
 * @description Unit tests for calendar utilities
 * @module utils
 */

import {
  DEFAULT_WEEKEND_DAYS,
  normalizeDate,
  isWeekend,
  isHoliday,
  isWorkingDay,
  countCalendarDays,
  countWorkingDays,
  countHolidayDays,
  getNextWorkingDay,
  getPreviousWorkingDay,
  addWorkingDays,
  getHolidaysInRange,
  getHolidayNamesInRange,
  isSameDay,
  datesOverlap,
  getMonthStart,
  getMonthEnd,
  getYearStart,
  getYearEnd,
  HolidayLike,
} from '@/lib/utils/calendar-utils';

describe('Calendar Utils', () => {
  describe('DEFAULT_WEEKEND_DAYS', () => {
    it('should be Friday and Saturday (Qatar/GCC)', () => {
      expect(DEFAULT_WEEKEND_DAYS).toEqual([5, 6]);
    });
  });

  describe('normalizeDate', () => {
    it('should set time to midnight', () => {
      const date = new Date('2024-06-15T14:30:45.123Z');
      const normalized = normalizeDate(date);

      expect(normalized.getHours()).toBe(0);
      expect(normalized.getMinutes()).toBe(0);
      expect(normalized.getSeconds()).toBe(0);
      expect(normalized.getMilliseconds()).toBe(0);
    });

    it('should not modify the original date', () => {
      const original = new Date('2024-06-15T14:30:45.123Z');
      const originalTime = original.getTime();
      normalizeDate(original);

      expect(original.getTime()).toBe(originalTime);
    });

    it('should preserve the date', () => {
      const date = new Date('2024-06-15T23:59:59.999Z');
      const normalized = normalizeDate(date);

      expect(normalized.getDate()).toBe(date.getDate());
      expect(normalized.getMonth()).toBe(date.getMonth());
      expect(normalized.getFullYear()).toBe(date.getFullYear());
    });
  });

  describe('isWeekend', () => {
    it('should return true for Friday (day 5) with default GCC weekend', () => {
      const friday = new Date('2024-06-14'); // Friday
      expect(isWeekend(friday)).toBe(true);
    });

    it('should return true for Saturday (day 6) with default GCC weekend', () => {
      const saturday = new Date('2024-06-15'); // Saturday
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return false for Sunday with default GCC weekend', () => {
      const sunday = new Date('2024-06-16'); // Sunday
      expect(isWeekend(sunday)).toBe(false);
    });

    it('should return false for weekdays with default GCC weekend', () => {
      const monday = new Date('2024-06-17'); // Monday
      const tuesday = new Date('2024-06-18'); // Tuesday
      const wednesday = new Date('2024-06-19'); // Wednesday
      const thursday = new Date('2024-06-20'); // Thursday

      expect(isWeekend(monday)).toBe(false);
      expect(isWeekend(tuesday)).toBe(false);
      expect(isWeekend(wednesday)).toBe(false);
      expect(isWeekend(thursday)).toBe(false);
    });

    it('should support custom weekend days (Western Sat/Sun)', () => {
      const westernWeekend = [0, 6]; // Sunday and Saturday
      const saturday = new Date('2024-06-15'); // Saturday
      const sunday = new Date('2024-06-16'); // Sunday
      const friday = new Date('2024-06-14'); // Friday

      expect(isWeekend(saturday, westernWeekend)).toBe(true);
      expect(isWeekend(sunday, westernWeekend)).toBe(true);
      expect(isWeekend(friday, westernWeekend)).toBe(false);
    });
  });

  describe('isHoliday', () => {
    const holidays: HolidayLike[] = [
      { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-01'), name: "New Year's Day" },
      { startDate: new Date('2024-12-18'), endDate: new Date('2024-12-18'), name: 'Qatar National Day' },
      { startDate: new Date('2024-04-10'), endDate: new Date('2024-04-12'), name: 'Eid al-Fitr' },
    ];

    it('should return holiday name for a holiday', () => {
      const newYear = new Date('2024-01-01');
      expect(isHoliday(newYear, holidays)).toBe("New Year's Day");
    });

    it('should return null for non-holiday', () => {
      const regularDay = new Date('2024-06-15');
      expect(isHoliday(regularDay, holidays)).toBeNull();
    });

    it('should handle multi-day holidays', () => {
      expect(isHoliday(new Date('2024-04-10'), holidays)).toBe('Eid al-Fitr');
      expect(isHoliday(new Date('2024-04-11'), holidays)).toBe('Eid al-Fitr');
      expect(isHoliday(new Date('2024-04-12'), holidays)).toBe('Eid al-Fitr');
      expect(isHoliday(new Date('2024-04-09'), holidays)).toBeNull();
      expect(isHoliday(new Date('2024-04-13'), holidays)).toBeNull();
    });

    it('should return "Holiday" for holidays without name', () => {
      const unnamedHolidays: HolidayLike[] = [
        { startDate: new Date('2024-05-01'), endDate: new Date('2024-05-01') },
      ];
      expect(isHoliday(new Date('2024-05-01'), unnamedHolidays)).toBe('Holiday');
    });

    it('should return null for empty holidays array', () => {
      expect(isHoliday(new Date('2024-01-01'), [])).toBeNull();
    });
  });

  describe('isWorkingDay', () => {
    const holidays: HolidayLike[] = [
      { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-01'), name: "New Year's Day" },
    ];

    it('should return true for a regular weekday', () => {
      const monday = new Date('2024-06-17'); // Monday
      expect(isWorkingDay(monday)).toBe(true);
    });

    it('should return false for weekend', () => {
      const friday = new Date('2024-06-14'); // Friday (GCC weekend)
      expect(isWorkingDay(friday)).toBe(false);
    });

    it('should return false for holiday', () => {
      const newYear = new Date('2024-01-01');
      expect(isWorkingDay(newYear, { holidays })).toBe(false);
    });

    it('should return false for holiday on a weekday', () => {
      // Jan 1, 2024 is a Monday
      expect(isWorkingDay(new Date('2024-01-01'), { holidays })).toBe(false);
    });
  });

  describe('countCalendarDays', () => {
    it('should return 1 for same day', () => {
      const date = new Date('2024-06-15');
      expect(countCalendarDays(date, date)).toBe(1);
    });

    it('should count inclusive days', () => {
      const start = new Date('2024-06-15');
      const end = new Date('2024-06-20');
      expect(countCalendarDays(start, end)).toBe(6);
    });

    it('should return 0 for end before start', () => {
      const start = new Date('2024-06-20');
      const end = new Date('2024-06-15');
      expect(countCalendarDays(start, end)).toBe(0);
    });

    it('should handle month boundaries', () => {
      const start = new Date('2024-06-28');
      const end = new Date('2024-07-02');
      expect(countCalendarDays(start, end)).toBe(5);
    });
  });

  describe('countWorkingDays', () => {
    it('should exclude weekends by default', () => {
      // Mon Jun 17 to Fri Jun 21, 2024 (includes Fri which is weekend)
      const start = new Date('2024-06-17');
      const end = new Date('2024-06-21');
      // Mon, Tue, Wed, Thu = 4 working days (Fri is weekend in GCC)
      expect(countWorkingDays(start, end)).toBe(4);
    });

    it('should include weekends when specified', () => {
      const start = new Date('2024-06-17');
      const end = new Date('2024-06-21');
      expect(countWorkingDays(start, end, { includeWeekends: true })).toBe(5);
    });

    it('should exclude holidays when specified', () => {
      const holidays: HolidayLike[] = [
        { startDate: new Date('2024-06-18'), endDate: new Date('2024-06-18'), name: 'Holiday' },
      ];
      const start = new Date('2024-06-17');
      const end = new Date('2024-06-20');
      // Mon, Tue (holiday), Wed, Thu = 3 working days
      expect(countWorkingDays(start, end, { holidays, excludeHolidays: true })).toBe(3);
    });

    it('should handle custom weekend days', () => {
      const westernWeekend = [0, 6]; // Sat/Sun
      // Sat Jun 15 to Tue Jun 18
      const start = new Date('2024-06-15');
      const end = new Date('2024-06-18');
      // Sat (weekend), Sun (weekend), Mon, Tue = 2 working days
      expect(countWorkingDays(start, end, { weekendDays: westernWeekend })).toBe(2);
    });
  });

  describe('countHolidayDays', () => {
    const holidays: HolidayLike[] = [
      { startDate: new Date('2024-06-17'), endDate: new Date('2024-06-17'), name: 'Holiday 1' },
      { startDate: new Date('2024-06-19'), endDate: new Date('2024-06-20'), name: 'Holiday 2' },
    ];

    it('should count holiday days in range', () => {
      const start = new Date('2024-06-15');
      const end = new Date('2024-06-21');
      // 17, 19, 20 but 21 is Friday (weekend), so only 17, 19, 20 if they're not weekends
      // 17 is Mon, 19 is Wed, 20 is Thu = 3 holiday days
      expect(countHolidayDays(start, end, holidays)).toBe(3);
    });

    it('should exclude holidays that fall on weekends by default', () => {
      const weekendHolidays: HolidayLike[] = [
        { startDate: new Date('2024-06-14'), endDate: new Date('2024-06-14'), name: 'Friday Holiday' },
      ];
      const start = new Date('2024-06-13');
      const end = new Date('2024-06-16');
      // June 14 is Friday (weekend), so it shouldn't count
      expect(countHolidayDays(start, end, weekendHolidays)).toBe(0);
    });

    it('should include weekend holidays when specified', () => {
      const weekendHolidays: HolidayLike[] = [
        { startDate: new Date('2024-06-14'), endDate: new Date('2024-06-14'), name: 'Friday Holiday' },
      ];
      const start = new Date('2024-06-13');
      const end = new Date('2024-06-16');
      expect(countHolidayDays(start, end, weekendHolidays, false)).toBe(1);
    });
  });

  describe('getNextWorkingDay', () => {
    it('should return next day if it is a working day', () => {
      const monday = new Date('2024-06-17'); // Monday
      const nextDay = getNextWorkingDay(monday);
      expect(nextDay.getDate()).toBe(18); // Tuesday
    });

    it('should skip weekends', () => {
      const thursday = new Date('2024-06-20'); // Thursday
      const nextDay = getNextWorkingDay(thursday);
      expect(nextDay.getDate()).toBe(23); // Sunday (skips Fri and Sat)
    });

    it('should skip holidays', () => {
      const holidays: HolidayLike[] = [
        { startDate: new Date('2024-06-18'), endDate: new Date('2024-06-18'), name: 'Holiday' },
      ];
      const monday = new Date('2024-06-17');
      const nextDay = getNextWorkingDay(monday, { holidays });
      expect(nextDay.getDate()).toBe(19); // Wednesday (skips Tuesday holiday)
    });
  });

  describe('getPreviousWorkingDay', () => {
    it('should return previous day if it is a working day', () => {
      const tuesday = new Date('2024-06-18');
      const prevDay = getPreviousWorkingDay(tuesday);
      expect(prevDay.getDate()).toBe(17); // Monday
    });

    it('should skip weekends', () => {
      const sunday = new Date('2024-06-16');
      const prevDay = getPreviousWorkingDay(sunday);
      expect(prevDay.getDate()).toBe(13); // Thursday (skips Fri and Sat)
    });
  });

  describe('addWorkingDays', () => {
    it('should add working days forward', () => {
      const monday = new Date('2024-06-17');
      const result = addWorkingDays(monday, 3);
      // Mon + 3 working days = Thu (skipping nothing in this case)
      expect(result.getDate()).toBe(20);
    });

    it('should skip weekends when adding', () => {
      const thursday = new Date('2024-06-20');
      const result = addWorkingDays(thursday, 2);
      // Thu + 2 = Sun, Mon (skips Fri, Sat)
      expect(result.getDate()).toBe(24); // Tuesday
    });

    it('should subtract working days with negative number', () => {
      const thursday = new Date('2024-06-20');
      const result = addWorkingDays(thursday, -2);
      // Thu - 2 = Tue, Mon
      expect(result.getDate()).toBe(18);
    });

    it('should handle zero days', () => {
      const date = new Date('2024-06-17');
      const result = addWorkingDays(date, 0);
      expect(result.getDate()).toBe(17);
    });
  });

  describe('getHolidaysInRange', () => {
    const holidays: HolidayLike[] = [
      { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-01'), name: "New Year's Day" },
      { startDate: new Date('2024-06-15'), endDate: new Date('2024-06-17'), name: 'Summer Holiday' },
      { startDate: new Date('2024-12-25'), endDate: new Date('2024-12-25'), name: 'Christmas' },
    ];

    it('should return holidays within range', () => {
      const start = new Date('2024-06-01');
      const end = new Date('2024-06-30');
      const result = getHolidaysInRange(start, end, holidays);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Summer Holiday');
    });

    it('should return empty array if no holidays in range', () => {
      const start = new Date('2024-02-01');
      const end = new Date('2024-02-28');
      const result = getHolidaysInRange(start, end, holidays);
      expect(result).toHaveLength(0);
    });

    it('should include holidays that partially overlap', () => {
      const start = new Date('2024-06-17');
      const end = new Date('2024-06-20');
      const result = getHolidaysInRange(start, end, holidays);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Summer Holiday');
    });
  });

  describe('getHolidayNamesInRange', () => {
    const holidays: HolidayLike[] = [
      { startDate: new Date('2024-06-15'), endDate: new Date('2024-06-17'), name: 'Summer Holiday' },
      { startDate: new Date('2024-06-20'), endDate: new Date('2024-06-20'), name: 'Another Holiday' },
    ];

    it('should return unique holiday names', () => {
      const start = new Date('2024-06-01');
      const end = new Date('2024-06-30');
      const names = getHolidayNamesInRange(start, end, holidays);
      expect(names).toEqual(['Summer Holiday', 'Another Holiday']);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date('2024-06-15T10:00:00');
      const date2 = new Date('2024-06-15T22:30:00');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2024-06-15');
      const date2 = new Date('2024-06-16');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('datesOverlap', () => {
    it('should return true for overlapping ranges', () => {
      expect(
        datesOverlap(
          new Date('2024-06-10'),
          new Date('2024-06-20'),
          new Date('2024-06-15'),
          new Date('2024-06-25')
        )
      ).toBe(true);
    });

    it('should return true for touching ranges', () => {
      expect(
        datesOverlap(
          new Date('2024-06-10'),
          new Date('2024-06-15'),
          new Date('2024-06-15'),
          new Date('2024-06-20')
        )
      ).toBe(true);
    });

    it('should return false for non-overlapping ranges', () => {
      expect(
        datesOverlap(
          new Date('2024-06-10'),
          new Date('2024-06-14'),
          new Date('2024-06-16'),
          new Date('2024-06-20')
        )
      ).toBe(false);
    });

    it('should return true for contained range', () => {
      expect(
        datesOverlap(
          new Date('2024-06-10'),
          new Date('2024-06-20'),
          new Date('2024-06-12'),
          new Date('2024-06-18')
        )
      ).toBe(true);
    });
  });

  describe('getMonthStart', () => {
    it('should return first day of month at midnight', () => {
      const date = new Date('2024-06-15T14:30:00');
      const start = getMonthStart(date);

      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(5); // June
      expect(start.getFullYear()).toBe(2024);
      expect(start.getHours()).toBe(0);
    });
  });

  describe('getMonthEnd', () => {
    it('should return last day of month at end of day', () => {
      const date = new Date('2024-06-15T14:30:00');
      const end = getMonthEnd(date);

      expect(end.getDate()).toBe(30); // June has 30 days
      expect(end.getMonth()).toBe(5); // June
      expect(end.getFullYear()).toBe(2024);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
    });

    it('should handle February in leap year', () => {
      const date = new Date('2024-02-15');
      const end = getMonthEnd(date);
      expect(end.getDate()).toBe(29); // 2024 is a leap year
    });

    it('should handle February in non-leap year', () => {
      const date = new Date('2023-02-15');
      const end = getMonthEnd(date);
      expect(end.getDate()).toBe(28);
    });
  });

  describe('getYearStart', () => {
    it('should return January 1st at midnight', () => {
      const date = new Date('2024-06-15T14:30:00');
      const start = getYearStart(date);

      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(0); // January
      expect(start.getFullYear()).toBe(2024);
      expect(start.getHours()).toBe(0);
    });
  });

  describe('getYearEnd', () => {
    it('should return December 31st at end of day', () => {
      const date = new Date('2024-06-15T14:30:00');
      const end = getYearEnd(date);

      expect(end.getDate()).toBe(31);
      expect(end.getMonth()).toBe(11); // December
      expect(end.getFullYear()).toBe(2024);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
    });
  });
});
