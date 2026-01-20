/**
 * @file layout-client.tsx
 * @description Client component for HR layout - renders account type confirmation dialog
 * @module app/admin/(hr)
 */

'use client';

import { useState } from 'react';
import { AccountTypeConfirmationDialog } from '@/components/ui/account-type-confirmation-dialog';

interface HRLayoutClientProps {
  children: React.ReactNode;
  needsAccountTypeConfirmation: boolean;
  memberEmail: string;
  memberId: string;
}

export function HRLayoutClient({
  children,
  needsAccountTypeConfirmation,
  memberEmail,
  memberId,
}: HRLayoutClientProps) {
  const [showDialog, setShowDialog] = useState(needsAccountTypeConfirmation);

  const handleConfirmed = () => {
    setShowDialog(false);
  };

  return (
    <>
      {showDialog && (
        <AccountTypeConfirmationDialog
          email={memberEmail}
          memberId={memberId}
          onConfirmed={handleConfirmed}
        />
      )}
      {children}
    </>
  );
}
