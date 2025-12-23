'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ReactNode } from 'react';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  stats?: {
    label: string;
    value: string | number;
  }[];
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal' | 'indigo';
  comingSoon?: boolean;
}

const colorClasses = {
  blue: 'from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-blue-200',
  green: 'from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-green-200',
  purple: 'from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-purple-200',
  orange: 'from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-orange-200',
  red: 'from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border-red-200',
  teal: 'from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 border-teal-200',
  indigo: 'from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 border-indigo-200',
};

export function ModuleCard({
  title,
  description,
  icon,
  href,
  badge,
  badgeVariant = 'default',
  stats,
  color = 'blue',
  comingSoon = false,
}: ModuleCardProps) {
  const content = (
    <Card className={`relative overflow-hidden transition-all duration-200 bg-gradient-to-br ${colorClasses[color]} ${comingSoon ? 'opacity-60' : 'cursor-pointer hover:shadow-lg'}`}>
      {comingSoon && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="secondary" className="bg-gray-200 text-gray-700">Coming Soon</Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{icon}</div>
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              {badge && (
                <Badge variant={badgeVariant} className="mt-1 text-xs">
                  {badge}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm mb-3">
          {description}
        </CardDescription>

        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white/60 rounded p-2">
                <div className="text-xs text-gray-600">{stat.label}</div>
                <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {!comingSoon && (
          <Button variant="secondary" className="w-full mt-2" size="sm">
            Open Module →
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (comingSoon) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}
