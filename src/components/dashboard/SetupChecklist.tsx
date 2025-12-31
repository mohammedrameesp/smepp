'use client';

/**
 * @file SetupChecklist.tsx
 * @description Dashboard widget showing setup progress checklist
 * @module dashboard
 */

import { useEffect, useState } from 'react';
import {
  Building2,
  Image,
  Palette,
  Package,
  UserPlus,
  Users,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChecklistItem } from './ChecklistItem';
import type { LucideIcon } from 'lucide-react';

interface SetupProgressData {
  progress: {
    profileComplete: boolean;
    logoUploaded: boolean;
    brandingConfigured: boolean;
    firstAssetAdded: boolean;
    firstTeamMemberInvited: boolean;
    firstEmployeeAdded: boolean;
  } | null;
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  isComplete: boolean;
}

interface ChecklistItemConfig {
  field: keyof NonNullable<SetupProgressData['progress']>;
  title: string;
  description: string;
  link: string;
  icon: LucideIcon;
}

const CHECKLIST_ITEMS: ChecklistItemConfig[] = [
  {
    field: 'profileComplete',
    title: 'Complete organization profile',
    description: 'Set up your organization name and basic information',
    link: '/admin/settings',
    icon: Building2,
  },
  {
    field: 'logoUploaded',
    title: 'Upload company logo',
    description: 'Add your company logo to personalize your workspace',
    link: '/admin/settings',
    icon: Image,
  },
  {
    field: 'brandingConfigured',
    title: 'Configure brand colors',
    description: 'Customize colors to match your brand identity',
    link: '/admin/settings',
    icon: Palette,
  },
  {
    field: 'firstAssetAdded',
    title: 'Add your first asset',
    description: 'Start tracking your company assets',
    link: '/admin/assets/new',
    icon: Package,
  },
  {
    field: 'firstTeamMemberInvited',
    title: 'Invite a team member',
    description: 'Bring your team on board',
    link: '/admin/team',
    icon: UserPlus,
  },
  {
    field: 'firstEmployeeAdded',
    title: 'Add your first employee',
    description: 'Create your first employee record',
    link: '/admin/employees/new',
    icon: Users,
  },
];

export function SetupChecklist() {
  const [data, setData] = useState<SetupProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const response = await fetch('/api/organizations/setup-progress');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch setup progress:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgress();
  }, []);

  // Don't render if loading or complete
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  // Hide if complete
  if (data?.isComplete) {
    return null;
  }

  const progress = data?.progress;
  const completedCount = data?.completedCount ?? 0;
  const totalCount = data?.totalCount ?? CHECKLIST_ITEMS.length;
  const percentComplete = data?.percentComplete ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-6 mb-6 text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold">Complete your setup</h3>
            <p className="text-sm text-slate-400">
              {completedCount} of {totalCount} tasks completed
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentComplete}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <p className="text-right text-xs text-slate-400 mt-1">
          {percentComplete}% complete
        </p>
      </div>

      {/* Checklist items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 overflow-hidden"
          >
            {CHECKLIST_ITEMS.map((item, index) => (
              <motion.div
                key={item.field}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ChecklistItem
                  title={item.title}
                  description={item.description}
                  link={item.link}
                  isCompleted={progress?.[item.field] ?? false}
                  icon={item.icon}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
