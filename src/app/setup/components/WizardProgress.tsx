'use client';

/**
 * @file WizardProgress.tsx
 * @description Progress indicator for setup wizard with step dots
 * @module setup/components
 */

import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: { title: string; description?: string }[];
}

export function WizardProgress({ currentStep, totalSteps, steps }: WizardProgressProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="px-4 py-6 bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto">
        {/* Step indicator text */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-600">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-slate-500">
            {steps[currentStep - 1]?.title}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-6">
          <motion.div
            className="h-full bg-slate-900 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const stepNum = index + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div key={stepNum} className="flex flex-col items-center flex-1">
                {/* Connector line (except for first step) */}
                {index > 0 && (
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 -z-10">
                    <div
                      className={`h-full transition-colors ${
                        isCompleted || isCurrent ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    />
                  </div>
                )}

                {/* Step dot */}
                <motion.div
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                    isCompleted
                      ? 'bg-slate-900 border-slate-900'
                      : isCurrent
                      ? 'bg-white border-slate-900'
                      : 'bg-white border-slate-300'
                  }`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {isCompleted ? (
                    <Check className={`${ICON_SIZES.sm} text-white`} />
                  ) : (
                    <span
                      className={`text-sm font-medium ${
                        isCurrent ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {stepNum}
                    </span>
                  )}
                </motion.div>

                {/* Step label (hidden on mobile) */}
                <span
                  className={`mt-2 text-xs font-medium hidden sm:block ${
                    isCurrent ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
