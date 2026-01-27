/**
 * @file user-detail-actions.tsx
 * @description Action buttons for user detail page including edit, export, and delete operations
 * @module components/domains/system/users
 */
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExportUserPDFButton } from './export-user-pdf-button';
import { DeleteUserButton } from './delete-user-button';
import { FileText } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

interface UserDetailActionsProps {
  userId: string;
  userName: string;
  userEmail: string;
  currentUserId: string;
  isSystemAccount?: boolean;
}

export function UserDetailActions({ userId, userName, userEmail, currentUserId, isSystemAccount = false }: UserDetailActionsProps) {
  const displayName = userName || userEmail;
  const isSelf = userId === currentUserId;

  return (
    <div className="flex gap-2 flex-wrap">
      <ExportUserPDFButton
        userId={userId}
        userName={displayName}
        userEmail={userEmail}
      />
      {!isSystemAccount && (
        <Link href={`/admin/users/${userId}/hr`}>
          <Button variant="outline">
            <FileText className={`${ICON_SIZES.sm} mr-2`} />
            HR Profile
          </Button>
        </Link>
      )}
      <Link href={`/admin/users/${userId}/edit`}>
        <Button>Edit User</Button>
      </Link>
      <Link href="/admin/users">
        <Button variant="outline">Back to Users</Button>
      </Link>
      {!isSelf && !isSystemAccount && (
        <DeleteUserButton
          userId={userId}
          userName={displayName}
        />
      )}
    </div>
  );
}
