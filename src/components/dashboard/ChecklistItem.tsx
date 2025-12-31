'use client';

/**
 * @file ChecklistItem.tsx
 * @description Individual checklist item component for setup progress
 * @module dashboard
 */

import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface ChecklistItemProps {
  title: string;
  description: string;
  link: string;
  isCompleted: boolean;
  icon: LucideIcon;
}

export function ChecklistItem({
  title,
  description,
  link,
  isCompleted,
  icon: Icon,
}: ChecklistItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`group flex items-center gap-4 p-4 rounded-xl border transition-all ${
        isCompleted
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* Completion indicator */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isCompleted
            ? 'bg-green-500'
            : 'bg-slate-100 group-hover:bg-slate-200'
        }`}
      >
        {isCompleted ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <Check className="w-5 h-5 text-white" />
          </motion.div>
        ) : (
          <Icon className="w-5 h-5 text-slate-500" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium ${
            isCompleted ? 'text-green-800 line-through' : 'text-slate-900'
          }`}
        >
          {title}
        </p>
        <p
          className={`text-sm ${
            isCompleted ? 'text-green-600' : 'text-slate-500'
          }`}
        >
          {description}
        </p>
      </div>

      {/* Action */}
      {!isCompleted && (
        <Link
          href={link}
          className="flex-shrink-0 flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span>Start</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </motion.div>
  );
}
