/**
 * @file whatsapp-verification-dialog.tsx
 * @description Dialog for eligible users (admins/approvers) to verify their WhatsApp
 *              number when the organization has WhatsApp alerts enabled
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MessageCircle, Check, AlertCircle } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { cn } from '@/lib/core/utils';

// Common country codes
const COUNTRY_CODES = [
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
];

type DialogState = 'phone-entry' | 'verifying' | 'success' | 'error';

interface WhatsAppVerificationDialogProps {
  phoneNumber: string | null;
  countryCode: string | null;
  onVerified?: () => void;
  onSnoozed?: () => void;
}

export function WhatsAppVerificationDialog({
  phoneNumber: initialPhoneNumber,
  countryCode: initialCountryCode,
  onVerified,
  onSnoozed,
}: WhatsAppVerificationDialogProps) {
  const router = useRouter();
  const [state, setState] = React.useState<DialogState>('phone-entry');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [countryCode, setCountryCode] = React.useState(initialCountryCode || '+974');
  const [phoneNumber, setPhoneNumber] = React.useState(initialPhoneNumber || '');

  const handleSubmitPhone = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    setError(null);
    setState('verifying');

    try {
      const response = await fetch('/api/users/me/whatsapp-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          countryCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify phone number');
      }

      if (data.verified) {
        setState('success');
        setTimeout(() => {
          router.refresh();
          onVerified?.();
        }, 2000);
      } else {
        // Phone saved but not verified (WhatsApp message couldn't be sent)
        setError(data.error || 'Verification message could not be sent. Please try again later.');
        setState('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setState('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setState('phone-entry');
    setError(null);
  };

  const handleSnooze = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/users/me/whatsapp-verification', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 3 }),
      });

      if (!response.ok) {
        throw new Error('Failed to snooze reminder');
      }

      router.refresh();
      onSnoozed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to snooze');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-[450px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Success State */}
        {state === 'success' && (
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className={`${ICON_SIZES.xl} text-green-600`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              WhatsApp Verified!
            </h3>
            <p className="text-gray-600">
              You will now receive important notifications via WhatsApp.
            </p>
          </div>
        )}

        {/* Phone Entry / Error State */}
        {(state === 'phone-entry' || state === 'error') && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <MessageCircle className={ICON_SIZES.md} />
                <span className="text-sm font-medium">WhatsApp Verification</span>
              </div>
              <DialogTitle className="text-xl">Verify Your WhatsApp Number</DialogTitle>
              <DialogDescription className="text-base">
                Your organization uses WhatsApp for important alerts. Please verify your
                number to receive notifications for approvals and updates.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((cc) => (
                        <SelectItem key={cc.code} value={cc.code}>
                          {cc.flag} {cc.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="55123456"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (error) setError(null);
                    }}
                    className="flex-1"
                  />
                </div>
                {initialPhoneNumber && (
                  <p className="text-xs text-gray-500">
                    Pre-filled from your profile. You can update it if needed.
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className={`${ICON_SIZES.md} text-red-500 mt-0.5 flex-shrink-0`} />
                  <div>
                    <p className="text-sm text-red-700">{error}</p>
                    {state === 'error' && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-red-700 underline"
                        onClick={handleRetry}
                      >
                        Try again
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>What happens next?</strong>
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• We&apos;ll send a test message to verify your number</li>
                  <li>• You&apos;ll receive alerts for pending approvals</li>
                  <li>• Quick action buttons for approve/reject</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                onClick={handleSnooze}
                disabled={isLoading}
              >
                Remind Me Later
              </Button>
              <Button
                onClick={handleSubmitPhone}
                disabled={isLoading || !phoneNumber.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
                    Verifying...
                  </>
                ) : (
                  'Verify Number'
                )}
              </Button>
            </div>
          </>
        )}

        {/* Verifying State */}
        {state === 'verifying' && (
          <div className="py-8 text-center">
            <Loader2 className={`${ICON_SIZES['2xl']} animate-spin text-green-600 mx-auto mb-4`} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sending Verification...
            </h3>
            <p className="text-gray-600">
              Please wait while we send a test message to your WhatsApp.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
