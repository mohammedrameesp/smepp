/**
 * @file layout.tsx
 * @description HR module layout - shows account type confirmation dialog for owners
 *              who haven't confirmed whether they're an employee or using a service account
 * @module app/admin/(hr)
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { HRLayoutClient } from './layout-client';

export default async function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.organizationId;
  const userId = session?.user?.id;

  let needsAccountTypeConfirmation = false;
  let memberEmail = '';
  let memberId = '';

  if (tenantId && userId) {
    // Check if current user is an owner and hasn't confirmed their account type
    const member = await prisma.teamMember.findFirst({
      where: {
        tenantId,
        id: userId,
      },
      select: {
        id: true,
        email: true,
        isOwner: true,
        accountTypeConfirmed: true,
      },
    });

    if (member?.isOwner && !member.accountTypeConfirmed) {
      needsAccountTypeConfirmation = true;
      memberEmail = member.email;
      memberId = member.id;
    }
  }

  return (
    <HRLayoutClient
      needsAccountTypeConfirmation={needsAccountTypeConfirmation}
      memberEmail={memberEmail}
      memberId={memberId}
    >
      {children}
    </HRLayoutClient>
  );
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
