'use client';

/**
 * @file SetupChecklist.tsx
 * @description Dashboard widget showing setup progress - one task at a time
 * @module dashboard
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Image,
  Palette,
  Package,
  UserPlus,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    link: '/admin/organization',
    icon: Building2,
  },
  {
    field: 'logoUploaded',
    title: 'Upload company logo',
    description: 'Add your company logo to personalize your workspace',
    link: '/admin/organization',
    icon: Image,
  },
  {
    field: 'brandingConfigured',
    title: 'Configure brand colors',
    description: 'Customize colors to match your brand identity',
    link: '/admin/organization',
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
    link: '/admin/employees',
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

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

  // Don't render if loading, complete, or dismissed
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (data?.isComplete || isDismissed) {
    return null;
  }

  const progress = data?.progress;
  const completedCount = data?.completedCount ?? 0;
  const totalCount = data?.totalCount ?? CHECKLIST_ITEMS.length;

  // Get only pending items
  const pendingItems = CHECKLIST_ITEMS.filter(
    (item) => !progress?.[item.field]
  );

  if (pendingItems.length === 0) {
    return null;
  }

  // Ensure currentIndex is within bounds
  const safeIndex = Math.min(currentIndex, pendingItems.length - 1);
  const currentItem = pendingItems[safeIndex];
  const Icon = currentItem.icon;

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % pendingItems.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + pendingItems.length) % pendingItems.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl p-4 mb-6 text-white shadow-lg"
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.field}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Icon className="w-6 h-6" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
              Setup {safeIndex + 1} of {pendingItems.length} remaining
            </span>
            <span className="text-white/40">•</span>
            <span className="text-xs text-white/70">
              {completedCount}/{totalCount} done
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.field}
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -10, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <p className="font-semibold text-white truncate">{currentItem.title}</p>
              <p className="text-sm text-white/70 truncate">{currentItem.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        {pendingItems.length > 1 && (
          <div className="flex-shrink-0 flex items-center gap-1">
            <button
              onClick={goPrev}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Previous task"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Next task"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Action Button */}
        <Link
          href={currentItem.link}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
        >
          <span>Start</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        {/* Dismiss */}
        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress dots */}
      {pendingItems.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {pendingItems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === safeIndex
                  ? 'w-4 bg-white'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to task ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
