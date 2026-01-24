import {
  WORK_MILESTONES,
  calculateDaysWorked,
  getNextMilestone,
  getUpcomingMilestones,
  getAchievedMilestones,
  getMilestoneByDays,
  isMilestoneDay,
  getMilestoneTierColor,
} from '@/lib/hr/work-milestones';

describe('Work Milestones', () => {
  describe('WORK_MILESTONES constant', () => {
    it('should have 10 defined milestones', () => {
      expect(WORK_MILESTONES).toHaveLength(10);
    });

    it('should be sorted by days in ascending order', () => {
      for (let i = 1; i < WORK_MILESTONES.length; i++) {
        expect(WORK_MILESTONES[i].days).toBeGreaterThan(WORK_MILESTONES[i - 1].days);
      }
    });

    it('should have valid tier values for all milestones', () => {
      const validTiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
      for (const milestone of WORK_MILESTONES) {
        expect(validTiers).toContain(milestone.tier);
      }
    });

    it('should include expected milestone days', () => {
      const expectedDays = [90, 100, 365, 500, 730, 1000, 1825, 2500, 3650, 5000];
      const actualDays = WORK_MILESTONES.map((m) => m.days);
      expect(actualDays).toEqual(expectedDays);
    });
  });

  describe('calculateDaysWorked', () => {
    it('should return 0 for same day', () => {
      const today = new Date('2024-06-15');
      expect(calculateDaysWorked(today, today)).toBe(0);
    });

    it('should return positive days for past date of joining', () => {
      const doj = new Date('2024-01-01');
      const reference = new Date('2024-01-11');
      expect(calculateDaysWorked(doj, reference)).toBe(10);
    });

    it('should return negative days for future date of joining', () => {
      const doj = new Date('2024-06-20');
      const reference = new Date('2024-06-15');
      expect(calculateDaysWorked(doj, reference)).toBe(-5);
    });

    it('should handle year boundaries', () => {
      const doj = new Date('2023-12-25');
      const reference = new Date('2024-01-05');
      expect(calculateDaysWorked(doj, reference)).toBe(11);
    });

    it('should ignore time component', () => {
      const doj = new Date('2024-01-01T23:59:59');
      const reference = new Date('2024-01-02T00:00:01');
      expect(calculateDaysWorked(doj, reference)).toBe(1);
    });
  });

  describe('getNextMilestone', () => {
    it('should return first milestone (90 days) for new employee', () => {
      const doj = new Date('2024-06-01');
      const reference = new Date('2024-06-01');
      const result = getNextMilestone(doj, reference);

      expect(result).not.toBeNull();
      expect(result?.milestone.days).toBe(90);
      expect(result?.daysUntil).toBe(90);
    });

    it('should return second milestone after first is passed', () => {
      const doj = new Date('2024-01-01');
      const reference = new Date('2024-04-01'); // 91 days later
      const result = getNextMilestone(doj, reference);

      expect(result).not.toBeNull();
      expect(result?.milestone.days).toBe(100);
    });

    it('should return null for employee who hasn\'t started yet', () => {
      const doj = new Date('2024-07-01');
      const reference = new Date('2024-06-01');
      const result = getNextMilestone(doj, reference);

      expect(result).toBeNull();
    });

    it('should return null when all milestones achieved', () => {
      const doj = new Date('2010-01-01');
      const reference = new Date('2024-06-01'); // More than 5000 days
      const result = getNextMilestone(doj, reference);

      expect(result).toBeNull();
    });

    it('should calculate correct target date', () => {
      const doj = new Date('2024-01-01');
      const reference = new Date('2024-01-01');
      const result = getNextMilestone(doj, reference);

      expect(result).not.toBeNull();
      // 90 days from Jan 1, 2024 is March 31, 2024
      const expectedTarget = new Date('2024-03-31');
      expect(result?.targetDate.toDateString()).toBe(expectedTarget.toDateString());
    });
  });

  describe('getUpcomingMilestones', () => {
    it('should return empty array for employee who hasn\'t started', () => {
      const doj = new Date('2024-07-01');
      const reference = new Date('2024-06-01');
      const result = getUpcomingMilestones(doj, 30, reference);

      expect(result).toEqual([]);
    });

    it('should return milestone if within look-ahead window', () => {
      const doj = new Date('2024-01-01');
      const reference = new Date('2024-03-20'); // 79 days, 11 days until 90
      const result = getUpcomingMilestones(doj, 30, reference);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].milestone.days).toBe(90);
      expect(result[0].daysUntil).toBe(11);
    });

    it('should return multiple milestones if within window', () => {
      const doj = new Date('2024-01-01');
      const reference = new Date('2024-03-28'); // 87 days, both 90 and 100 within 30 days
      const result = getUpcomingMilestones(doj, 30, reference);

      expect(result.length).toBe(2);
      expect(result[0].milestone.days).toBe(90);
      expect(result[1].milestone.days).toBe(100);
    });

    it('should include today\'s milestone (daysUntil = 0)', () => {
      const doj = new Date('2024-01-01');
      const reference = new Date('2024-03-31'); // Exactly 90 days
      const result = getUpcomingMilestones(doj, 30, reference);

      const todayMilestone = result.find((r) => r.daysUntil === 0);
      expect(todayMilestone).toBeDefined();
      expect(todayMilestone?.milestone.days).toBe(90);
    });

    it('should return empty array if no milestones in window', () => {
      const doj = new Date('2024-01-01');
      const reference = new Date('2024-02-01'); // 31 days, 59 until next (90)
      const result = getUpcomingMilestones(doj, 30, reference);

      expect(result).toEqual([]);
    });
  });

  describe('getAchievedMilestones', () => {
    it('should return empty array for new employee', () => {
      const doj = new Date('2024-06-01');
      const reference = new Date('2024-06-01');
      const result = getAchievedMilestones(doj, reference);

      expect(result).toEqual([]);
    });

    it('should return empty array for employee who hasn\'t started', () => {
      const doj = new Date('2024-07-01');
      const reference = new Date('2024-06-01');
      const result = getAchievedMilestones(doj, reference);

      expect(result).toEqual([]);
    });

    it('should return achieved milestones with correct dates', () => {
      const doj = new Date('2024-01-01');
      const reference = new Date('2024-04-15'); // 105 days - achieved 90 and 100
      const result = getAchievedMilestones(doj, reference);

      expect(result.length).toBe(2);
      expect(result[0].milestone.days).toBe(90);
      expect(result[1].milestone.days).toBe(100);
    });

    it('should calculate correct achieved dates', () => {
      const doj = new Date('2024-01-01');
      const reference = new Date('2024-04-15');
      const result = getAchievedMilestones(doj, reference);

      // 90 days from Jan 1 = March 31
      expect(result[0].achievedDate.toDateString()).toBe(new Date('2024-03-31').toDateString());
      // 100 days from Jan 1 = April 10
      expect(result[1].achievedDate.toDateString()).toBe(new Date('2024-04-10').toDateString());
    });

    it('should return all milestones for long-tenured employee', () => {
      const doj = new Date('2010-01-01');
      const reference = new Date('2024-06-01');
      const result = getAchievedMilestones(doj, reference);

      expect(result.length).toBe(WORK_MILESTONES.length);
    });
  });

  describe('getMilestoneByDays', () => {
    it('should return milestone for exact match', () => {
      const result = getMilestoneByDays(90);
      expect(result).toBeDefined();
      expect(result?.name).toBe('Probation Complete');
    });

    it('should return undefined for non-milestone day', () => {
      const result = getMilestoneByDays(91);
      expect(result).toBeUndefined();
    });

    it('should find all defined milestones', () => {
      for (const milestone of WORK_MILESTONES) {
        const result = getMilestoneByDays(milestone.days);
        expect(result).toBeDefined();
        expect(result?.name).toBe(milestone.name);
      }
    });
  });

  describe('isMilestoneDay', () => {
    it('should return true for milestone days', () => {
      expect(isMilestoneDay(90)).toBe(true);
      expect(isMilestoneDay(100)).toBe(true);
      expect(isMilestoneDay(365)).toBe(true);
      expect(isMilestoneDay(1000)).toBe(true);
      expect(isMilestoneDay(5000)).toBe(true);
    });

    it('should return false for non-milestone days', () => {
      expect(isMilestoneDay(0)).toBe(false);
      expect(isMilestoneDay(1)).toBe(false);
      expect(isMilestoneDay(89)).toBe(false);
      expect(isMilestoneDay(101)).toBe(false);
      expect(isMilestoneDay(999)).toBe(false);
    });
  });

  describe('getMilestoneTierColor', () => {
    it('should return correct colors for bronze tier', () => {
      const result = getMilestoneTierColor('bronze');
      expect(result.bg).toBe('bg-amber-100');
      expect(result.text).toBe('text-amber-800');
      expect(result.border).toBe('border-amber-300');
    });

    it('should return correct colors for silver tier', () => {
      const result = getMilestoneTierColor('silver');
      expect(result.bg).toBe('bg-slate-100');
      expect(result.text).toBe('text-slate-700');
      expect(result.border).toBe('border-slate-300');
    });

    it('should return correct colors for gold tier', () => {
      const result = getMilestoneTierColor('gold');
      expect(result.bg).toBe('bg-yellow-100');
      expect(result.text).toBe('text-yellow-800');
      expect(result.border).toBe('border-yellow-400');
    });

    it('should return correct colors for platinum tier', () => {
      const result = getMilestoneTierColor('platinum');
      expect(result.bg).toBe('bg-cyan-100');
      expect(result.text).toBe('text-cyan-800');
      expect(result.border).toBe('border-cyan-300');
    });

    it('should return correct colors for diamond tier', () => {
      const result = getMilestoneTierColor('diamond');
      expect(result.bg).toBe('bg-violet-100');
      expect(result.text).toBe('text-violet-800');
      expect(result.border).toBe('border-violet-300');
    });

    it('should return default gray for unknown tier', () => {
      // @ts-expect-error - Testing unknown tier
      const result = getMilestoneTierColor('unknown');
      expect(result.bg).toBe('bg-gray-100');
      expect(result.text).toBe('text-gray-800');
      expect(result.border).toBe('border-gray-300');
    });
  });

  describe('Milestone tier assignments', () => {
    it('should have correct tiers for early milestones', () => {
      expect(getMilestoneByDays(90)?.tier).toBe('bronze');
      expect(getMilestoneByDays(100)?.tier).toBe('bronze');
    });

    it('should have correct tiers for mid-level milestones', () => {
      expect(getMilestoneByDays(365)?.tier).toBe('silver');
      expect(getMilestoneByDays(500)?.tier).toBe('silver');
      expect(getMilestoneByDays(730)?.tier).toBe('silver');
    });

    it('should have correct tiers for senior milestones', () => {
      expect(getMilestoneByDays(1000)?.tier).toBe('gold');
      expect(getMilestoneByDays(1825)?.tier).toBe('gold');
    });

    it('should have correct tiers for veteran milestones', () => {
      expect(getMilestoneByDays(2500)?.tier).toBe('platinum');
      expect(getMilestoneByDays(3650)?.tier).toBe('platinum');
    });

    it('should have correct tier for legendary milestone', () => {
      expect(getMilestoneByDays(5000)?.tier).toBe('diamond');
    });
  });
});
