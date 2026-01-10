import { Cake, Award } from 'lucide-react';
import { cn } from '@/lib/core/utils';

interface Celebration {
  id: string;
  name: string;
  type: 'birthday' | 'anniversary';
  date: Date;
  years?: number; // For anniversaries
}

interface CelebrationsCardProps {
  celebrations: Celebration[];
  className?: string;
}

function getRelativeDay(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 7) return `in ${diffDays} days`;
  return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function CelebrationsCard({ celebrations, className }: CelebrationsCardProps) {
  if (celebrations.length === 0) return null;

  return (
    <div
      className={cn(
        'p-4 bg-white border border-gray-200 rounded-xl',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎉</span>
        <h3 className="font-semibold text-gray-900">Celebrations This Week</h3>
      </div>

      <div className="space-y-2">
        {celebrations.slice(0, 3).map((celebration) => (
          <div key={celebration.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
                  celebration.type === 'birthday'
                    ? 'bg-slate-100 text-pink-600'
                    : 'bg-slate-100 text-purple-600'
                )}
              >
                {getInitials(celebration.name)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{celebration.name}</p>
                <p className="text-xs text-gray-500">
                  {celebration.type === 'birthday' ? (
                    <>Birthday {getRelativeDay(celebration.date)}!</>
                  ) : (
                    <>{celebration.years} year anniversary {getRelativeDay(celebration.date)}</>
                  )}
                </p>
              </div>
            </div>
            <span className="text-sm">
              {celebration.type === 'birthday' ? '🎉' : '🏆'}
            </span>
          </div>
        ))}
      </div>

      {celebrations.length > 3 && (
        <p className="text-xs text-gray-500 mt-2">
          +{celebrations.length - 3} more this week
        </p>
      )}
    </div>
  );
}
