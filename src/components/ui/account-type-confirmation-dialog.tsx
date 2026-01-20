/**
 * @file account-type-confirmation-dialog.tsx
 * @description Dialog for owners to confirm whether their account is a personal employee
 *              account or a service/shared account (like info@, admin@, etc.)
 * @module components/ui
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, User, Building2, Mail, Check } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { isLikelyServiceAccount } from '@/lib/utils/service-account-detection';

interface AccountTypeOption {
  type: 'employee' | 'service';
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  buttonLabel: string;
}

const accountTypeOptions: AccountTypeOption[] = [
  {
    type: 'employee',
    icon: <User className="h-6 w-6" />,
    title: 'Employee Account',
    description: 'This is my personal work account',
    features: [
      'Personal profile in team list',
      'HR features (leave, payroll)',
      'Employee self-service portal',
    ],
    buttonLabel: 'This is me',
  },
  {
    type: 'service',
    icon: <Building2 className="h-6 w-6" />,
    title: 'Service Account',
    description: 'This is a shared/generic account',
    features: [
      'Shows organization logo',
      'Admin access only',
      'No HR profile or leave management',
    ],
    buttonLabel: 'This is shared',
  },
];

interface AccountTypeConfirmationDialogProps {
  email: string;
  memberId: string;
  onConfirmed?: () => void;
}

export function AccountTypeConfirmationDialog({
  email,
  memberId,
  onConfirmed,
}: AccountTypeConfirmationDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState<'employee' | 'service' | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Pre-select based on email pattern detection
  const isLikelyService = isLikelyServiceAccount(email);
  const suggestedType = isLikelyService ? 'service' : 'employee';

  const handleConfirm = async (type: 'employee' | 'service') => {
    setSelectedType(type);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/me/account-type', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEmployee: type === 'employee' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update account type');
      }

      // Refresh the page to reflect changes
      router.refresh();
      onConfirmed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
      setSelectedType(null);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-[600px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Mail className="h-5 w-5" />
            <span className="text-sm font-medium">Account Setup</span>
          </div>
          <DialogTitle className="text-xl">Confirm Your Account Type</DialogTitle>
          <DialogDescription className="text-base">
            {isLikelyService ? (
              <>
                We noticed your email (<span className="font-medium">{email}</span>) looks like a
                shared account. Please confirm how this account will be used.
              </>
            ) : (
              <>
                Please confirm how your account (<span className="font-medium">{email}</span>) will
                be used in this organization.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          {accountTypeOptions.map((option) => {
            const isSelected = selectedType === option.type;
            const isSuggested = option.type === suggestedType;

            return (
              <div
                key={option.type}
                className={cn(
                  'relative flex flex-col rounded-lg border-2 p-4 transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : isSuggested
                      ? 'border-blue-200 bg-blue-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                )}
              >
                {isSuggested && !isSelected && (
                  <span className="absolute -top-2 right-2 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    Suggested
                  </span>
                )}

                <div
                  className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-full mb-3',
                    option.type === 'employee' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {option.icon}
                </div>

                <h3 className="font-semibold text-lg mb-1">{option.title}</h3>
                <p className="text-sm text-gray-500 mb-3">{option.description}</p>

                <ul className="space-y-2 mb-4 flex-1">
                  {option.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={option.type === 'employee' ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => handleConfirm(option.type)}
                  disabled={isLoading}
                >
                  {isLoading && selectedType === option.type ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    option.buttonLabel
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="text-sm text-red-600 text-center pb-2">
            {error}
          </div>
        )}

        <div className="text-center text-sm text-gray-500 border-t pt-4">
          You can change this later in your Profile Settings
        </div>
      </DialogContent>
    </Dialog>
  );
}
