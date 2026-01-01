import { Calendar, Palmtree, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type EventType = 'leave' | 'renewal';

interface UpcomingEvent {
  id: string;
  type: EventType;
  title: string;
  date: Date;
  endDate?: Date;
  subtitle?: string;
  color?: string;
}

interface UpcomingCardProps {
  events: UpcomingEvent[];
  className?: string;
}

const typeConfig: Record<EventType, { bgColor: string; iconBg: string; textColor: string }> = {
  leave: {
    bgColor: 'bg-blue-50',
    iconBg: 'bg-white',
    textColor: 'text-blue-600',
  },
  renewal: {
    bgColor: 'bg-amber-50',
    iconBg: 'bg-white',
    textColor: 'text-amber-600',
  },
};

export function UpcomingCard({ events, className }: UpcomingCardProps) {
  return (
    <div className={cn('bg-white border rounded-xl p-4', className)}>
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <Calendar className="h-5 w-5 text-violet-500" />
        Upcoming
      </h3>

      {events.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-medium">Nothing upcoming</p>
          <p className="text-xs">Your approved leave and renewals will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.slice(0, 4).map((event) => {
            const config = typeConfig[event.type];
            const day = format(new Date(event.date), 'd');
            const month = format(new Date(event.date), 'MMM').toUpperCase();

            return (
              <div
                key={`${event.type}-${event.id}`}
                className={cn('flex items-center gap-3 p-3 rounded-lg', config.bgColor)}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex flex-col items-center justify-center shadow-sm',
                    config.iconBg
                  )}
                >
                  <span className={cn('text-sm font-bold', config.textColor)}>{day}</span>
                  <span className={cn('text-[10px]', config.textColor)}>{month}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{event.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {event.endDate ? (
                      <>
                        {format(new Date(event.date), 'MMM d')} - {format(new Date(event.endDate), 'MMM d')}
                        {event.subtitle && ` • ${event.subtitle}`}
                      </>
                    ) : (
                      event.subtitle
                    )}
                  </p>
                </div>
                {event.type === 'leave' ? (
                  <Palmtree className="h-4 w-4 text-blue-400 flex-shrink-0" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-amber-400 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
