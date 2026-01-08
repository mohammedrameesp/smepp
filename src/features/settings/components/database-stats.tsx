/**
 * @file database-stats.tsx
 * @description Dashboard component displaying database record counts and statistics
 * @module components/domains/system/settings
 */
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Users, Package, CreditCard, Activity } from 'lucide-react';

interface DatabaseStatsProps {
  stats: {
    users: number;
    assets: number;
    subscriptions: number;
    suppliers: number;
    activityLogs: number;
  };
}

export function DatabaseStats({ stats }: DatabaseStatsProps) {
  const statItems = [
    {
      label: 'Total Users',
      value: stats.users,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Total Assets',
      value: stats.assets,
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Subscriptions',
      value: stats.subscriptions,
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Suppliers',
      value: stats.suppliers,
      icon: Database,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Activity Logs',
      value: stats.activityLogs,
      icon: Activity,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ];

  const totalRecords = Object.values(stats).reduce((sum, val) => sum + val, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Overview</CardTitle>
          <CardDescription>
            Current database statistics and record counts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-900 mb-1">
                {totalRecords.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700 font-medium">
                Total Records in Database
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className={`p-3 rounded-lg ${item.bgColor}`}>
                    <Icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {item.value.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">{item.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
