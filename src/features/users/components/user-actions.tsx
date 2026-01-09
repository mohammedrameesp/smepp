/**
 * @file user-actions.tsx
 * @description Action buttons for user list row, including view details link
 * @module components/domains/system/users
 */
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface UserActionsProps {
  userId: string;
  userName: string;
  userEmail: string;
  currentUserId: string;
  isSystemAccount?: boolean;
}

export function UserActions({
  userId,
}: UserActionsProps) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/admin/users/${userId}`}>
          View
        </Link>
      </Button>
    </div>
  );
}
