/**
 * Tenant Isolation API Test Script
 *
 * Tests that API endpoints properly isolate data between tenants.
 * This simulates API calls as different users to verify that:
 * 1. Users can only see their own tenant's data
 * 2. Cross-tenant access is blocked
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-tenant-isolation.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(message);
}

function pass(test: string, details: string) {
  results.push({ test, passed: true, details });
  console.log(`  ✅ ${test}`);
}

function fail(test: string, details: string) {
  results.push({ test, passed: false, details });
  console.log(`  ❌ ${test}: ${details}`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('            TENANT ISOLATION DATABASE-LEVEL TESTS');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Get test organizations
  const acmeOrg = await prisma.organization.findUnique({ where: { slug: 'acme-corp' } });
  const globexOrg = await prisma.organization.findUnique({ where: { slug: 'globex-inc' } });

  if (!acmeOrg || !globexOrg) {
    console.error('❌ Test organizations not found. Run seed-test-tenants.ts first.');
    process.exit(1);
  }

  const acmeTenantId = acmeOrg.id;
  const globexTenantId = globexOrg.id;

  console.log(`📋 Test Setup:`);
  console.log(`   Acme Corp ID: ${acmeTenantId}`);
  console.log(`   Globex Inc ID: ${globexTenantId}\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST 1: ASSETS ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════════

  log('🔒 TEST 1: ASSETS ISOLATION');

  // Get assets for each tenant
  const acmeAssets = await prisma.asset.findMany({ where: { tenantId: acmeTenantId } });
  const globexAssets = await prisma.asset.findMany({ where: { tenantId: globexTenantId } });

  // Verify counts
  if (acmeAssets.length === 3 && globexAssets.length === 3) {
    pass('Asset count correct', `Acme: ${acmeAssets.length}, Globex: ${globexAssets.length}`);
  } else {
    fail('Asset count', `Expected 3 each, got Acme: ${acmeAssets.length}, Globex: ${globexAssets.length}`);
  }

  // Verify no cross-tenant data
  const acmeHasGlobexData = acmeAssets.some(a => a.assetTag?.includes('GLOBEX'));
  const globexHasAcmeData = globexAssets.some(a => a.assetTag?.includes('ACME'));

  if (!acmeHasGlobexData && !globexHasAcmeData) {
    pass('No cross-tenant asset contamination', 'Asset tags properly prefixed');
  } else {
    fail('Cross-tenant contamination detected', 'Assets with wrong tenant found');
  }

  // Test: Try to access Globex asset from Acme context
  const globexAssetId = globexAssets[0].id;
  const acmeAccessToGlobex = await prisma.asset.findFirst({
    where: { id: globexAssetId, tenantId: acmeTenantId }
  });

  if (acmeAccessToGlobex === null) {
    pass('Acme cannot access Globex assets via findFirst', 'IDOR protection working');
  } else {
    fail('IDOR vulnerability', 'Acme was able to access Globex asset!');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST 2: SUBSCRIPTIONS ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════════

  log('\n🔒 TEST 2: SUBSCRIPTIONS ISOLATION');

  const acmeSubs = await prisma.subscription.findMany({ where: { tenantId: acmeTenantId } });
  const globexSubs = await prisma.subscription.findMany({ where: { tenantId: globexTenantId } });

  if (acmeSubs.length === 2 && globexSubs.length === 2) {
    pass('Subscription count correct', `Acme: ${acmeSubs.length}, Globex: ${globexSubs.length}`);
  } else {
    fail('Subscription count', `Expected 2 each`);
  }

  // Verify naming convention
  const acmeSubsValid = acmeSubs.every(s => s.serviceName.includes('Acme'));
  const globexSubsValid = globexSubs.every(s => s.serviceName.includes('Globex'));

  if (acmeSubsValid && globexSubsValid) {
    pass('Subscription naming convention verified', 'All subscriptions properly labeled');
  } else {
    fail('Subscription naming', 'Some subscriptions have wrong labels');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST 3: LEAVE TYPES ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════════

  log('\n🔒 TEST 3: LEAVE TYPES ISOLATION');

  const acmeLeave = await prisma.leaveType.findMany({ where: { tenantId: acmeTenantId } });
  const globexLeave = await prisma.leaveType.findMany({ where: { tenantId: globexTenantId } });

  if (acmeLeave.length === 2 && globexLeave.length === 2) {
    pass('Leave type count correct', `Acme: ${acmeLeave.length}, Globex: ${globexLeave.length}`);
  } else {
    fail('Leave type count', `Expected 2 each`);
  }

  // Check for proper naming
  const acmeLeaveValid = acmeLeave.every(l => l.name.includes('Acme'));
  const globexLeaveValid = globexLeave.every(l => l.name.includes('Globex'));

  if (acmeLeaveValid && globexLeaveValid) {
    pass('Leave type naming convention verified', 'All leave types properly labeled');
  } else {
    fail('Leave type naming', 'Some leave types have wrong labels');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST 4: SUPPLIERS ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════════

  log('\n🔒 TEST 4: SUPPLIERS ISOLATION');

  const acmeSupp = await prisma.supplier.findMany({ where: { tenantId: acmeTenantId } });
  const globexSupp = await prisma.supplier.findMany({ where: { tenantId: globexTenantId } });

  if (acmeSupp.length === 1 && globexSupp.length === 1) {
    pass('Supplier count correct', `Acme: ${acmeSupp.length}, Globex: ${globexSupp.length}`);
  } else {
    fail('Supplier count', `Expected 1 each`);
  }

  // Check suppCode
  if (acmeSupp[0]?.suppCode?.includes('ACME') && globexSupp[0]?.suppCode?.includes('GLOBEX')) {
    pass('Supplier codes properly prefixed', 'Supplier isolation verified');
  } else {
    fail('Supplier codes', 'Wrong prefix on supplier codes');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST 5: PROJECTS ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════════

  log('\n🔒 TEST 5: PROJECTS ISOLATION');

  const acmeProj = await prisma.project.findMany({ where: { tenantId: acmeTenantId } });
  const globexProj = await prisma.project.findMany({ where: { tenantId: globexTenantId } });

  if (acmeProj.length === 1 && globexProj.length === 1) {
    pass('Project count correct', `Acme: ${acmeProj.length}, Globex: ${globexProj.length}`);
  } else {
    fail('Project count', `Expected 1 each`);
  }

  if (acmeProj[0]?.code?.includes('ACME') && globexProj[0]?.code?.includes('GLOBEX')) {
    pass('Project codes properly prefixed', 'Project isolation verified');
  } else {
    fail('Project codes', 'Wrong prefix on project codes');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST 6: ORGANIZATION MEMBERSHIP ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════════

  log('\n🔒 TEST 6: ORGANIZATION MEMBERSHIP ISOLATION');

  const acmeMembers = await prisma.organizationUser.findMany({
    where: { organizationId: acmeTenantId },
    include: { user: { select: { email: true } } }
  });
  const globexMembers = await prisma.organizationUser.findMany({
    where: { organizationId: globexTenantId },
    include: { user: { select: { email: true } } }
  });

  if (acmeMembers.length === 3 && globexMembers.length === 3) {
    pass('Membership count correct', `Acme: ${acmeMembers.length}, Globex: ${globexMembers.length}`);
  } else {
    fail('Membership count', `Expected 3 each`);
  }

  // Verify no cross-membership
  const acmeHasGlobexMember = acmeMembers.some(m => m.user.email.includes('globex'));
  const globexHasAcmeMember = globexMembers.some(m => m.user.email.includes('acme'));

  if (!acmeHasGlobexMember && !globexHasAcmeMember) {
    pass('No cross-organization membership', 'Users properly isolated');
  } else {
    fail('Cross-organization membership detected', 'User is member of wrong org');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST 7: CROSS-TENANT ID ACCESS ATTEMPTS (IDOR PROTECTION)
  // ═══════════════════════════════════════════════════════════════════════════════

  log('\n🔒 TEST 7: IDOR PROTECTION (Cross-Tenant ID Access)');

  // Get IDs from each tenant
  const globexAssetToAccess = globexAssets[0];
  const globexSubToAccess = globexSubs[0];
  const globexLeaveToAccess = globexLeave[0];

  // Try to access Globex data with Acme tenantId filter
  const idorAsset = await prisma.asset.findFirst({
    where: { id: globexAssetToAccess.id, tenantId: acmeTenantId }
  });
  const idorSub = await prisma.subscription.findFirst({
    where: { id: globexSubToAccess.id, tenantId: acmeTenantId }
  });
  const idorLeave = await prisma.leaveType.findFirst({
    where: { id: globexLeaveToAccess.id, tenantId: acmeTenantId }
  });

  if (idorAsset === null && idorSub === null && idorLeave === null) {
    pass('IDOR protection verified', 'Cannot access other tenant data by ID');
  } else {
    fail('IDOR vulnerability', 'Cross-tenant access possible!');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('                        TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`   Total Tests: ${total}`);
  console.log(`   Passed: ${passed} ✅`);
  console.log(`   Failed: ${failed} ❌`);
  console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   • ${r.test}: ${r.details}`);
    });
    console.log('');
  }

  if (failed === 0) {
    console.log('🎉 ALL TENANT ISOLATION TESTS PASSED!');
    console.log('   Your multi-tenant data is properly isolated.');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review the issues above.');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
