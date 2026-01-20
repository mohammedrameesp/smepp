/**
 * Script to reset account type confirmation for testing
 *
 * Usage:
 *   npx ts-node scripts/reset-account-type.ts              # Reset all owners
 *   npx ts-node scripts/reset-account-type.ts <email>      # Reset specific user by email
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAccountType(email?: string) {
  console.log('🔄 Resetting account type confirmation...\n');

  const where = email
    ? { email, isOwner: true }
    : { isOwner: true, accountTypeConfirmed: true };

  // Find matching members
  const members = await prisma.teamMember.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      isEmployee: true,
      accountTypeConfirmed: true,
      tenantId: true,
    },
  });

  if (members.length === 0) {
    console.log('No matching members found.');
    if (email) {
      console.log(`\nMake sure the email "${email}" belongs to an owner.`);
    }
    return;
  }

  // Get organization names
  const tenantIds = [...new Set(members.map(m => m.tenantId))];
  const orgs = await prisma.organization.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true },
  });
  const orgMap = new Map(orgs.map(o => [o.id, o.name]));

  console.log(`Found ${members.length} member(s) to reset:\n`);

  for (const member of members) {
    console.log(`  - ${member.name || 'Unknown'} (${member.email})`);
    console.log(`    Organization: ${orgMap.get(member.tenantId) || member.tenantId}`);
    console.log(`    Current isEmployee: ${member.isEmployee}`);
    console.log(`    accountTypeConfirmed: ${member.accountTypeConfirmed}`);
    console.log('');
  }

  // Reset the fields
  const result = await prisma.teamMember.updateMany({
    where,
    data: {
      accountTypeConfirmed: false,
      accountTypeConfirmedAt: null,
    },
  });

  console.log(`✅ Reset ${result.count} member(s)`);
  console.log('\nNow visit the Employees page to see the confirmation dialog again.');
}

async function main() {
  const email = process.argv[2];

  if (email) {
    console.log(`Resetting account type for: ${email}\n`);
  } else {
    console.log('Resetting account type for ALL confirmed owners\n');
  }

  await resetAccountType(email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
