'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Cake, Award, User, Trophy } from 'lucide-react';

type MilestoneTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface CelebrationEvent {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  photoUrl: string | null;
  type: 'birthday' | 'work_anniversary' | 'work_milestone';
  date: string;
  daysUntil: number;
  yearsCompleting?: number;
  milestone?: {
    days: number;
    name: string;
    description: string;
    tier: MilestoneTier;
  };
}

interface Summary {
  total: number;
  todayBirthdays: number;
  todayAnniversaries: number;
  todayMilestones: number;
  upcomingBirthdays: number;
  upcomingAnniversaries: number;
  upcomingMilestones: number;
}

const MILESTONE_TIER_COLORS: Record<MilestoneTier, { bg: string; text: string; border: string }> = {
  bronze: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  silver: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  gold: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
  platinum: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
  diamond: { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
};

const DISPLAY_COUNT = 2;

export function CelebrationsWidget() {
  const [celebrations, setCelebrations] = useState<CelebrationEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchCelebrations();
  }, []);

  const fetchCelebrations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/employees/celebrations');

      if (!response.ok) {
        throw new Error('Failed to fetch celebrations');
      }

      const data = await response.json();
      setCelebrations(data.celebrations || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error fetching celebrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysLabel = (days: number) => {
    if (days === 0) return 'Today!';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  const getDaysBadgeClass = (days: number) => {
    if (days === 0) return 'bg-green-100 text-green-800 border-green-300';
    if (days <= 7) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" />
            Celebrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (celebrations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" />
            Celebrations
          </CardTitle>
          <CardDescription>Birthdays & Work Anniversaries</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-4">
            No celebrations in the next 30 days
          </p>
        </CardContent>
      </Card>
    );
  }

  const todayCount = summary ? summary.todayBirthdays + summary.todayAnniversaries + (summary.todayMilestones || 0) : 0;
  const upcomingCount = summary ? summary.upcomingBirthdays + summary.upcomingAnniversaries + (summary.upcomingMilestones || 0) : 0;
  const displayedCelebrations = showAll ? celebrations : celebrations.slice(0, DISPLAY_COUNT);
  const remainingCount = celebrations.length - DISPLAY_COUNT;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cake className="h-4 w-4 text-pink-500" />
              Celebrations
              {!showAll && remainingCount > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  +{remainingCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              {todayCount > 0 && (
                <span className="text-green-600 font-medium">{todayCount} today</span>
              )}
              {todayCount > 0 && upcomingCount > 0 && ' | '}
              {upcomingCount > 0 && (
                <span className="text-blue-600 font-medium">{upcomingCount} upcoming</span>
              )}
            </CardDescription>
          </div>
          {celebrations.length > DISPLAY_COUNT && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : 'View All'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className={`space-y-2 ${showAll ? 'max-h-64 overflow-y-auto' : ''}`}>
          {displayedCelebrations.map((event, index) => (
            <div
              key={`${event.employeeId}-${event.type}-${index}`}
              className={`p-3 rounded-lg border ${
                event.daysUntil === 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {event.photoUrl ? (
                    <img
                      src={event.photoUrl}
                      alt={event.employeeName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/employees/${event.employeeId}`}
                    className="font-medium text-sm text-gray-900 hover:underline truncate block"
                  >
                    {event.employeeName}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {event.type === 'birthday' ? (
                      <Badge variant="outline" className="bg-pink-100 text-pink-800 border-pink-300 text-xs">
                        <Cake className="h-3 w-3 mr-1" />
                        Birthday
                      </Badge>
                    ) : event.type === 'work_anniversary' ? (
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
                        <Award className="h-3 w-3 mr-1" />
                        {event.yearsCompleting}yr
                      </Badge>
                    ) : event.type === 'work_milestone' && event.milestone ? (
                      <Badge
                        variant="outline"
                        className={`text-xs ${MILESTONE_TIER_COLORS[event.milestone.tier].bg} ${MILESTONE_TIER_COLORS[event.milestone.tier].text} ${MILESTONE_TIER_COLORS[event.milestone.tier].border}`}
                        title={event.milestone.description}
                      >
                        <Trophy className="h-3 w-3 mr-1" />
                        {event.milestone.days}d
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className={`text-xs ${getDaysBadgeClass(event.daysUntil)}`}>
                      {getDaysLabel(event.daysUntil)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
