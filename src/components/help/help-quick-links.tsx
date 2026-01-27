'use client';

import Link from 'next/link';
import * as Icons from 'lucide-react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';
import type { QuickLink, GettingStartedStep, PopularTopic, UserRole } from '@/lib/help/help-types';
import { filterByRole } from '@/lib/help/help-types';

// Dynamic icon component
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!IconComponent) return <HelpCircle className={className} />;
  return <IconComponent className={className} />;
}

// Quick Links Grid
interface HelpQuickLinksProps {
  links: QuickLink[];
  userRole: UserRole;
  className?: string;
}

export function HelpQuickLinks({ links, userRole, className }: HelpQuickLinksProps) {
  const filteredLinks = filterByRole(links, userRole).sort((a, b) => a.priority - b.priority);

  if (filteredLinks.length === 0) {
    return null;
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {filteredLinks.map((link) => (
        <Link
          key={link.id}
          href={link.url}
          className="flex items-center gap-3 p-4 rounded-lg border bg-white hover:border-blue-200 hover:shadow-sm transition-all group"
        >
          <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
            <DynamicIcon name={link.icon} className={`${ICON_SIZES.md} text-blue-600`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
              {link.title}
            </h4>
            <p className="text-xs text-gray-500 truncate">{link.description}</p>
          </div>
          <ArrowRight className={`${ICON_SIZES.sm} text-gray-300 group-hover:text-blue-600 transition-colors`} />
        </Link>
      ))}
    </div>
  );
}

// Getting Started Steps
interface HelpGettingStartedProps {
  steps: GettingStartedStep[];
  userRole: UserRole;
  className?: string;
}

export function HelpGettingStarted({ steps, userRole, className }: HelpGettingStartedProps) {
  const filteredSteps = filterByRole(steps, userRole);

  if (filteredSteps.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSteps.map((step, index) => (
          <Link
            key={step.id}
            href={step.url}
            className="relative flex items-start gap-4 p-4 rounded-lg border bg-white hover:border-blue-200 hover:shadow-sm transition-all group"
          >
            {/* Step number */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-sm flex-shrink-0">
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                {step.title}
              </h4>
              <p className="text-sm text-gray-500 mt-1">{step.description}</p>
            </div>

            <ArrowRight className={`${ICON_SIZES.sm} text-gray-300 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-1`} />
          </Link>
        ))}
      </div>
    </div>
  );
}

// Popular Topics List
interface HelpPopularTopicsProps {
  topics: PopularTopic[];
  userRole: UserRole;
  className?: string;
  limit?: number;
}

export function HelpPopularTopics({
  topics,
  userRole,
  className,
  limit = 6,
}: HelpPopularTopicsProps) {
  const filteredTopics = filterByRole(topics, userRole).slice(0, limit);

  if (filteredTopics.length === 0) {
    return null;
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {filteredTopics.map((topic) => (
        <li key={topic.id}>
          <Link
            href={topic.url}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <span className="text-gray-900 group-hover:text-blue-600 transition-colors">
                {topic.title}
              </span>
              <span className="text-xs text-gray-400 ml-2">{topic.category}</span>
            </div>
            <ArrowRight className={`${ICON_SIZES.sm} text-gray-300 group-hover:text-blue-600 transition-colors flex-shrink-0`} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Contact Support Card
interface HelpContactSupportProps {
  className?: string;
}

export function HelpContactSupport({ className }: HelpContactSupportProps) {
  return (
    <div className={cn('rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 p-6', className)}>
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-white shadow-sm">
          <DynamicIcon name="MessageCircle" className={`${ICON_SIZES.lg} text-blue-600`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Need More Help?</h3>
          <p className="text-sm text-gray-600 mt-1">
            Can&apos;t find what you&apos;re looking for? Contact your organization&apos;s administrator for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
