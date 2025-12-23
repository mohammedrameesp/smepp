'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface SubscriptionActionsProps {
  subscriptionId: string;
}

export function SubscriptionActions({ subscriptionId }: SubscriptionActionsProps) {
  return (
    <Link href={`/admin/subscriptions/${subscriptionId}`}>
      <Button variant="outline" size="sm">
        View
      </Button>
    </Link>
  );
}
