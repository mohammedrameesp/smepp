'use client';

import { Play, Clock, Video } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import type { VideoPlaceholder, UserRole } from '@/lib/help/help-types';
import { filterByRole } from '@/lib/help/help-types';

interface HelpVideoEmbedProps {
  video: VideoPlaceholder;
}

interface HelpVideoGridProps {
  videos: VideoPlaceholder[];
  userRole: UserRole;
}

export function HelpVideoEmbed({ video }: HelpVideoEmbedProps) {
  if (video.isPlaceholder) {
    return (
      <div className="rounded-lg border bg-gray-50 overflow-hidden">
        {/* Placeholder thumbnail */}
        <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/80 shadow-sm mb-3">
              <Video className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Coming Soon</p>
          </div>
        </div>

        {/* Video info */}
        <div className="p-4">
          <h4 className="font-medium text-gray-900">{video.title}</h4>
          {video.description && (
            <p className="text-sm text-gray-500 mt-1">{video.description}</p>
          )}
          {video.duration && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              <span>{video.duration}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If actual video URL is provided (future implementation)
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      {/* Video thumbnail with play button */}
      <div className="relative aspect-video bg-gray-900 group cursor-pointer">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="h-8 w-8 text-gray-900 ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {video.duration}
          </div>
        )}
      </div>

      {/* Video info */}
      <div className="p-4">
        <h4 className="font-medium text-gray-900">{video.title}</h4>
        {video.description && (
          <p className="text-sm text-gray-500 mt-1">{video.description}</p>
        )}
      </div>
    </div>
  );
}

export function HelpVideoGrid({ videos, userRole }: HelpVideoGridProps) {
  const filteredVideos = filterByRole(videos, userRole);

  if (filteredVideos.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'grid gap-4',
      filteredVideos.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
    )}>
      {filteredVideos.map((video) => (
        <HelpVideoEmbed key={video.id} video={video} />
      ))}
    </div>
  );
}
