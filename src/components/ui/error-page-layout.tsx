'use client';

import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

interface ErrorPageAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface ErrorPageLayoutProps {
  statusCode: string;
  statusCodeColor?: string;
  title: string;
  description: string | React.ReactNode;
  icon?: LucideIcon;
  iconColor?: string;
  primaryAction: ErrorPageAction;
  secondaryAction?: ErrorPageAction;
  helpText?: string;
  errorId?: string;
}

export function ErrorPageLayout({
  statusCode,
  statusCodeColor = 'text-gray-200',
  title,
  description,
  icon: Icon,
  iconColor = 'text-gray-400',
  primaryAction,
  secondaryAction,
  helpText,
  errorId,
}: ErrorPageLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg text-center">
        {/* Icon (for non-404 errors) */}
        {Icon && (
          <div className="mb-4 flex justify-center">
            <Icon className={`h-16 w-16 ${iconColor}`} aria-hidden="true" />
          </div>
        )}

        {/* Status Code */}
        <div className={Icon ? 'mb-4' : 'mb-8'}>
          <h1 className={`text-[150px] font-bold ${statusCodeColor} leading-none`}>
            {statusCode}
          </h1>
        </div>

        {/* Message */}
        <div className="mb-10">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{title}</h2>
          <div className="text-lg text-gray-600 leading-relaxed">{description}</div>
          {errorId && (
            <p className="mt-4 text-xs text-gray-500 font-mono">Error ID: {errorId}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={primaryAction.onClick}
            className="w-full h-14 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white font-semibold text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <primaryAction.icon className={`${ICON_SIZES.md} mr-2`} aria-hidden="true" />
            {primaryAction.label}
          </Button>

          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              className="w-full h-14 font-semibold text-base rounded-lg border-2 hover:bg-gray-50 transition-all duration-200"
            >
              <secondaryAction.icon className={`${ICON_SIZES.md} mr-2`} aria-hidden="true" />
              {secondaryAction.label}
            </Button>
          )}
        </div>

        {/* Help Text */}
        {helpText && <p className="mt-8 text-sm text-gray-500">{helpText}</p>}
      </div>
    </div>
  );
}
