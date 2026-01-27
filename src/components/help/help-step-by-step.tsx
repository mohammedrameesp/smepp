'use client';

import { Check, Lightbulb, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';
import type { WorkflowStep } from '@/lib/help/help-types';

interface HelpStepByStepProps {
  title?: string;
  description?: string;
  steps: WorkflowStep[];
  className?: string;
}

interface StepItemProps {
  step: WorkflowStep;
  isLast: boolean;
}

function StepItem({ step, isLast }: StepItemProps) {
  return (
    <div className="relative flex gap-4">
      {/* Step number and line */}
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-sm flex-shrink-0">
          {step.step}
        </div>
        {!isLast && (
          <div className="w-0.5 h-full bg-blue-200 mt-2" />
        )}
      </div>

      {/* Step content */}
      <div className={cn('flex-1 pb-8', isLast && 'pb-0')}>
        <h4 className="font-medium text-gray-900 mb-1">{step.title}</h4>
        <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>

        {/* Tip callout */}
        {step.tip && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <Lightbulb className={`${ICON_SIZES.sm} text-amber-500 mt-0.5 flex-shrink-0`} />
            <p className="text-sm text-amber-800">{step.tip}</p>
          </div>
        )}

        {/* Screenshot placeholder */}
        {step.screenshot && (
          <div className="mt-3 rounded-lg border bg-gray-50 p-4 text-center">
            <div className="text-sm text-gray-400">Screenshot: {step.screenshot}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function HelpStepByStep({
  title,
  description,
  steps,
  className,
}: HelpStepByStepProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className={cn('rounded-lg border bg-white p-6', className)}>
      {title && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}

      <div className="space-y-0">
        {steps.map((step, index) => (
          <StepItem
            key={step.step}
            step={step}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// Compact version for inline workflows
interface HelpCompactStepsProps {
  steps: string[];
  className?: string;
}

export function HelpCompactSteps({ steps, className }: HelpCompactStepsProps) {
  return (
    <ol className={cn('list-decimal list-inside space-y-2 text-sm text-gray-600', className)}>
      {steps.map((step, index) => (
        <li key={index} className="leading-relaxed">{step}</li>
      ))}
    </ol>
  );
}

// Checklist version
interface HelpChecklistProps {
  items: string[];
  className?: string;
}

export function HelpChecklist({ items, className }: HelpChecklistProps) {
  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2">
          <Check className={`${ICON_SIZES.sm} text-green-500 mt-0.5 flex-shrink-0`} />
          <span className="text-sm text-gray-600">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// Note/Warning callout
interface HelpNoteProps {
  type?: 'info' | 'warning' | 'tip';
  children: React.ReactNode;
  className?: string;
}

const noteStyles = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    icon: AlertCircle,
    iconColor: 'text-blue-500',
    textColor: 'text-blue-800',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    icon: AlertCircle,
    iconColor: 'text-amber-500',
    textColor: 'text-amber-800',
  },
  tip: {
    bg: 'bg-green-50',
    border: 'border-green-100',
    icon: Lightbulb,
    iconColor: 'text-green-500',
    textColor: 'text-green-800',
  },
};

export function HelpNote({ type = 'info', children, className }: HelpNoteProps) {
  const styles = noteStyles[type];
  const IconComponent = styles.icon;

  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-lg border', styles.bg, styles.border, className)}>
      <IconComponent className={cn(`${ICON_SIZES.md} mt-0.5 flex-shrink-0`, styles.iconColor)} />
      <div className={cn('text-sm', styles.textColor)}>{children}</div>
    </div>
  );
}
