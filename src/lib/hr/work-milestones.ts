/**
 * Work Milestone Definitions and Utilities
 *
 * Defines day-based work milestones for celebrating employee tenure.
 * These complement traditional yearly anniversaries with meaningful
 * day-count milestones.
 */

export interface WorkMilestone {
  days: number;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

/**
 * Defined work milestones in ascending order of days.
 *
 * Selection rationale:
 * - Front-loaded for retention (90, 100, 365, 500 days)
 * - Round numbers are psychologically satisfying (100, 500, 1000, etc.)
 * - Traditional years preserved (365, 730, 1825, 3650)
 * - Gaps grow with tenure (early: months, later: years)
 */
export const WORK_MILESTONES: WorkMilestone[] = [
  {
    days: 90,
    name: 'Probation Complete',
    description: 'Successfully completed probation period',
    tier: 'bronze',
  },
  {
    days: 100,
    name: 'Century Club',
    description: '100 days with the company',
    tier: 'bronze',
  },
  {
    days: 365,
    name: 'First Anniversary',
    description: 'One full year with the company',
    tier: 'silver',
  },
  {
    days: 500,
    name: '500 Days',
    description: 'Half a thousand days of dedication',
    tier: 'silver',
  },
  {
    days: 730,
    name: 'Second Anniversary',
    description: 'Two years with the company',
    tier: 'silver',
  },
  {
    days: 1000,
    name: 'Thousand Day Titan',
    description: 'A thousand days of commitment',
    tier: 'gold',
  },
  {
    days: 1825,
    name: 'Five Year Veteran',
    description: 'Five years of dedicated service',
    tier: 'gold',
  },
  {
    days: 2500,
    name: '2.5K Champion',
    description: '2,500 days of excellence',
    tier: 'platinum',
  },
  {
    days: 3650,
    name: 'Decade Legend',
    description: 'A full decade with the company',
    tier: 'platinum',
  },
  {
    days: 5000,
    name: 'Hall of Fame',
    description: '5,000 days - truly exceptional',
    tier: 'diamond',
  },
];

/**
 * Get milestone tier color for UI styling
 */
export function getMilestoneTierColor(tier: WorkMilestone['tier']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (tier) {
    case 'bronze':
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-300',
      };
    case 'silver':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
      };
    case 'gold':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-400',
      };
    case 'platinum':
      return {
        bg: 'bg-cyan-100',
        text: 'text-cyan-800',
        border: 'border-cyan-300',
      };
    case 'diamond':
      return {
        bg: 'bg-violet-100',
        text: 'text-violet-800',
        border: 'border-violet-300',
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
      };
  }
}

/**
 * Calculate days worked since date of joining
 */
export function calculateDaysWorked(dateOfJoining: Date, referenceDate: Date = new Date()): number {
  const startOfDoj = new Date(dateOfJoining);
  startOfDoj.setHours(0, 0, 0, 0);

  const startOfRef = new Date(referenceDate);
  startOfRef.setHours(0, 0, 0, 0);

  const diffTime = startOfRef.getTime() - startOfDoj.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get the next upcoming milestone for an employee
 * Returns null if no more milestones or employee hasn't started
 */
export function getNextMilestone(
  dateOfJoining: Date,
  referenceDate: Date = new Date()
): { milestone: WorkMilestone; daysUntil: number; targetDate: Date } | null {
  const daysWorked = calculateDaysWorked(dateOfJoining, referenceDate);

  if (daysWorked < 0) {
    // Employee hasn't started yet
    return null;
  }

  // Find the next milestone that hasn't been reached
  const nextMilestone = WORK_MILESTONES.find((m) => m.days > daysWorked);

  if (!nextMilestone) {
    // All milestones achieved
    return null;
  }

  const daysUntil = nextMilestone.days - daysWorked;
  const targetDate = new Date(dateOfJoining);
  targetDate.setDate(targetDate.getDate() + nextMilestone.days);

  return {
    milestone: nextMilestone,
    daysUntil,
    targetDate,
  };
}

/**
 * Get all upcoming milestones within a given number of days
 */
export function getUpcomingMilestones(
  dateOfJoining: Date,
  lookAheadDays: number = 30,
  referenceDate: Date = new Date()
): Array<{ milestone: WorkMilestone; daysUntil: number; targetDate: Date }> {
  const daysWorked = calculateDaysWorked(dateOfJoining, referenceDate);
  const results: Array<{ milestone: WorkMilestone; daysUntil: number; targetDate: Date }> = [];

  if (daysWorked < 0) {
    return results;
  }

  for (const milestone of WORK_MILESTONES) {
    const daysUntil = milestone.days - daysWorked;

    // Include milestones that are upcoming (0 = today, positive = future)
    // and within the look-ahead window
    if (daysUntil >= 0 && daysUntil <= lookAheadDays) {
      const targetDate = new Date(dateOfJoining);
      targetDate.setDate(targetDate.getDate() + milestone.days);

      results.push({
        milestone,
        daysUntil,
        targetDate,
      });
    }
  }

  return results;
}

/**
 * Get all achieved milestones for an employee
 */
export function getAchievedMilestones(
  dateOfJoining: Date,
  referenceDate: Date = new Date()
): Array<{ milestone: WorkMilestone; achievedDate: Date }> {
  const daysWorked = calculateDaysWorked(dateOfJoining, referenceDate);
  const results: Array<{ milestone: WorkMilestone; achievedDate: Date }> = [];

  if (daysWorked < 0) {
    return results;
  }

  for (const milestone of WORK_MILESTONES) {
    if (milestone.days <= daysWorked) {
      const achievedDate = new Date(dateOfJoining);
      achievedDate.setDate(achievedDate.getDate() + milestone.days);

      results.push({
        milestone,
        achievedDate,
      });
    }
  }

  return results;
}

/**
 * Get milestone by days (exact match)
 */
export function getMilestoneByDays(days: number): WorkMilestone | undefined {
  return WORK_MILESTONES.find((m) => m.days === days);
}

/**
 * Check if a specific day count is a milestone
 */
export function isMilestoneDay(days: number): boolean {
  return WORK_MILESTONES.some((m) => m.days === days);
}
