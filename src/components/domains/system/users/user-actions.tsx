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
      <Link href={`/admin/users/${userId}`}>
        <Button variant="outline" size="sm">
          View Details
        </Button>
      </Link>
    </div>
  );
}
