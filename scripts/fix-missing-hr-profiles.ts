/**
 * Fix Missing HR Profiles Script
 *
 * This script creates HRProfile records for organization members who don't have one.
 * Run with: npx tsx scripts/fix-missing-hr-profiles.ts <organization-id>
 *
 * Example: npx tsx scripts/fix-missing-hr-profiles.ts clxxxxxxxxxxxxxxxx
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgId = process.argv[2];

  if (!orgId) {
    console.error('Usage: npx tsx scripts/fix-missing-hr-profiles.ts <organization-id>');
    console.error('');
    console.error('To find your organization ID, run:');
    console.error('  SELECT id, name, slug FROM "Organization";');
    process.exit(1);
  }

  console.log(`\n🔍 Finding organization: ${orgId}\n`);

  // Verify organization exists
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true, codePrefix: true },
  });

  if (!org) {
    console.error(`❌ Organization not found: ${orgId}`);
    process.exit(1);
  }

  console.log(`✅ Organization: ${org.name} (${org.slug})`);
  console.log(`   Code Prefix: ${org.codePrefix || 'ORG'}\n`);

  // Find all users in this organization
  const orgMembers = await prisma.organizationUser.findMany({
    where: { organizationId: orgId },
    include: {
      user: {
        include: {
          hrProfile: true,
        },
      },
    },
  });

  console.log(`👥 Total organization members: ${orgMembers.length}\n`);

  // Find members without hrProfile for this org
  const membersWithoutProfile: typeof orgMembers = [];
  const membersWithProfile: typeof orgMembers = [];
  const membersWithWrongTenantProfile: typeof orgMembers = [];

  for (const member of orgMembers) {
    if (!member.user.hrProfile) {
      membersWithoutProfile.push(member);
    } else if (member.user.hrProfile.tenantId !== orgId) {
      membersWithWrongTenantProfile.push(member);
    } else {
      membersWithProfile.push(member);
    }
  }

  console.log(`✅ Members with correct HR profile: ${membersWithProfile.length}`);
  console.log(`⚠️  Members with HR profile for different org: ${membersWithWrongTenantProfile.length}`);
  console.log(`❌ Members without HR profile: ${membersWithoutProfile.length}\n`);

  if (membersWithoutProfile.length === 0 && membersWithWrongTenantProfile.length === 0) {
    console.log('🎉 All members have correct HR profiles. Nothing to do!\n');
    return;
  }

  // Show members needing profiles
  if (membersWithoutProfile.length > 0) {
    console.log('Members needing HR profiles:');
    for (const member of membersWithoutProfile) {
      console.log(`  - ${member.user.name || member.user.email} (${member.user.id})`);
    }
    console.log('');
  }

  if (membersWithWrongTenantProfile.length > 0) {
    console.log('Members with HR profile for different organization:');
    for (const member of membersWithWrongTenantProfile) {
      console.log(`  - ${member.user.name || member.user.email} (${member.user.id}) - current tenantId: ${member.user.hrProfile?.tenantId}`);
    }
    console.log('');
  }

  // Get the code prefix for generating employee IDs
  const codePrefix = org.codePrefix || 'ORG';
  const year = new Date().getFullYear();

  // Get existing employee count for this prefix
  const existingCount = await prisma.hRProfile.count({
    where: {
      tenantId: orgId,
      employeeId: { startsWith: `${codePrefix}-${year}` },
    },
  });

  console.log(`📝 Creating HR profiles...\n`);

  let created = 0;
  let nextSeq = existingCount + 1;

  // Create profiles for members without any profile
  for (const member of membersWithoutProfile) {
    const employeeId = `${codePrefix}-${year}-${String(nextSeq).padStart(3, '0')}`;

    try {
      await prisma.hRProfile.create({
        data: {
          tenantId: orgId,
          userId: member.user.id,
          employeeId: employeeId,
          onboardingComplete: true,
          onboardingStep: 0,
        },
      });
      console.log(`  ✅ Created: ${member.user.name || member.user.email} -> ${employeeId}`);
      created++;
      nextSeq++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`  ⚠️  Skipped: ${member.user.name || member.user.email} - already has a profile`);
      } else {
        console.error(`  ❌ Failed: ${member.user.name || member.user.email} - ${error.message}`);
      }
    }
  }

  // For members with wrong tenant profile, we need to create a new one for this org
  // (Users can have profiles in multiple orgs if they belong to multiple orgs)
  // But since userId is unique in HRProfile, we can't create duplicates
  // We'd need to update the existing profile's tenantId instead
  if (membersWithWrongTenantProfile.length > 0) {
    console.log('\n⚠️  Members with profiles for different organizations cannot be automatically fixed.');
    console.log('   This is because HRProfile.userId is unique - a user can only have one HR profile.');
    console.log('   Options:');
    console.log('   1. Update the existing profile\'s tenantId (will remove from other org)');
    console.log('   2. Delete the old profile and create a new one');
    console.log('');
    console.log('   To update tenantId manually:');
    for (const member of membersWithWrongTenantProfile) {
      console.log(`   UPDATE "HRProfile" SET "tenantId" = '${orgId}' WHERE "userId" = '${member.user.id}';`);
    }
  }

  console.log(`\n✅ Created ${created} HR profiles.\n`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
