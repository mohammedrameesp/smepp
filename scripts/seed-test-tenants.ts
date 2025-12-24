/**
 * Multi-Tenant Test Seed Script
 *
 * Creates 2 distinct organizations with dummy data to test tenant isolation.
 * Each organization has clear naming conventions:
 * - Organization A: "Acme Corp" - prefixes: ACME-
 * - Organization B: "Globex Inc" - prefixes: GLOBEX-
 *
 * Run with: npx ts-node scripts/seed-test-tenants.ts
 */

import { PrismaClient, Role, OrgRole, AssetStatus, BillingCycle, SubscriptionTier } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DATA DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const ORG_A = {
  name: 'Acme Corp',
  slug: 'acme-corp',
  prefix: 'ACME',
  currency: 'USD',
  timezone: 'America/New_York',
};

const ORG_B = {
  name: 'Globex Inc',
  slug: 'globex-inc',
  prefix: 'GLOBEX',
  currency: 'QAR',
  timezone: 'Asia/Qatar',
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🌱 Seeding multi-tenant test data...\n');

  // Clean up existing test data (only our test orgs)
  console.log('🧹 Cleaning up existing test organizations...');

  const existingOrgs = await prisma.organization.findMany({
    where: { slug: { in: [ORG_A.slug, ORG_B.slug] } },
  });

  for (const org of existingOrgs) {
    await prisma.organization.delete({ where: { id: org.id } });
  }

  // Delete test users
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'admin@acme-corp.test',
          'employee1@acme-corp.test',
          'employee2@acme-corp.test',
          'admin@globex-inc.test',
          'employee1@globex-inc.test',
          'employee2@globex-inc.test',
        ]
      }
    }
  });

  console.log('✅ Cleanup complete\n');

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE ORGANIZATION A: ACME CORP
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log(`📦 Creating ${ORG_A.name}...`);

  const orgA = await prisma.organization.create({
    data: {
      name: ORG_A.name,
      slug: ORG_A.slug,
      currency: ORG_A.currency,
      timezone: ORG_A.timezone,
      subscriptionTier: SubscriptionTier.PROFESSIONAL,
      maxUsers: 50,
      maxAssets: 500,
    },
  });

  // Create users for Org A
  const passwordHash = await hashPassword('Test123!');

  const acmeAdmin = await prisma.user.create({
    data: {
      name: 'Alice Admin (Acme)',
      email: 'admin@acme-corp.test',
      role: Role.ADMIN,
      passwordHash,
    },
  });

  const acmeEmployee1 = await prisma.user.create({
    data: {
      name: 'Bob Builder (Acme)',
      email: 'employee1@acme-corp.test',
      role: Role.EMPLOYEE,
      passwordHash,
    },
  });

  const acmeEmployee2 = await prisma.user.create({
    data: {
      name: 'Carol Clerk (Acme)',
      email: 'employee2@acme-corp.test',
      role: Role.EMPLOYEE,
      passwordHash,
    },
  });

  // Add users to Org A membership
  await prisma.organizationUser.createMany({
    data: [
      { organizationId: orgA.id, userId: acmeAdmin.id, role: OrgRole.OWNER, isOwner: true },
      { organizationId: orgA.id, userId: acmeEmployee1.id, role: OrgRole.MEMBER },
      { organizationId: orgA.id, userId: acmeEmployee2.id, role: OrgRole.MEMBER },
    ],
  });

  // Create Acme Assets
  const acmeAssets = await Promise.all([
    prisma.asset.create({
      data: {
        tenantId: orgA.id,
        assetTag: 'ACME-LAPTOP-001',
        type: 'Laptop',
        brand: 'Apple',
        model: 'MacBook Pro 16" (Acme)',
        serial: 'ACME-MBP-2024-001',
        configuration: 'M3 Pro, 36GB RAM, 1TB SSD',
        status: AssetStatus.IN_USE,
        assignedUserId: acmeEmployee1.id,
        price: 3499,
        priceCurrency: 'USD',
        priceQAR: 12746,
        notes: 'Primary dev machine for Bob',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId: orgA.id,
        assetTag: 'ACME-MONITOR-001',
        type: 'Monitor',
        brand: 'Dell',
        model: 'UltraSharp 32" 4K (Acme)',
        serial: 'ACME-DELL-2024-001',
        status: AssetStatus.IN_USE,
        assignedUserId: acmeEmployee1.id,
        price: 899,
        priceCurrency: 'USD',
        priceQAR: 3275,
      },
    }),
    prisma.asset.create({
      data: {
        tenantId: orgA.id,
        assetTag: 'ACME-LAPTOP-002',
        type: 'Laptop',
        brand: 'Lenovo',
        model: 'ThinkPad X1 Carbon (Acme)',
        serial: 'ACME-LEN-2024-001',
        status: AssetStatus.SPARE,
        price: 1899,
        priceCurrency: 'USD',
        priceQAR: 6918,
        notes: 'Spare laptop for Acme',
      },
    }),
  ]);

  // Create Acme Subscriptions
  const acmeSubscriptions = await Promise.all([
    prisma.subscription.create({
      data: {
        tenantId: orgA.id,
        serviceName: 'GitHub Enterprise (Acme)',
        category: 'Development',
        vendor: 'GitHub',
        accountId: 'acme-github-001',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 2500,
        costCurrency: 'USD',
        costQAR: 9100,
        assignedUserId: acmeAdmin.id,
        purchaseDate: new Date('2024-01-01'),
        renewalDate: new Date('2025-01-01'),
        autoRenew: true,
        notes: 'Acme team GitHub subscription',
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId: orgA.id,
        serviceName: 'Slack Business (Acme)',
        category: 'Communication',
        vendor: 'Slack',
        accountId: 'acme-slack-001',
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 150,
        costCurrency: 'USD',
        costQAR: 546,
        assignedUserId: acmeAdmin.id,
        purchaseDate: new Date('2024-01-01'),
        renewalDate: new Date('2024-02-01'),
        autoRenew: true,
      },
    }),
  ]);

  // Create Acme Leave Types
  const acmeLeaveTypes = await Promise.all([
    prisma.leaveType.create({
      data: {
        tenantId: orgA.id,
        name: 'Annual Leave (Acme)',
        description: 'Acme annual vacation leave',
        color: '#3B82F6',
        defaultDays: 20,
        category: 'STANDARD',
        isPaid: true,
        requiresApproval: true,
        isActive: true,
        accrualBased: true,
      },
    }),
    prisma.leaveType.create({
      data: {
        tenantId: orgA.id,
        name: 'Sick Leave (Acme)',
        description: 'Acme sick leave policy',
        color: '#EF4444',
        defaultDays: 10,
        category: 'MEDICAL',
        isPaid: true,
        requiresApproval: true,
        requiresDocument: true,
        isActive: true,
      },
    }),
  ]);

  // Create Acme Supplier
  const acmeSupplier = await prisma.supplier.create({
    data: {
      tenantId: orgA.id,
      suppCode: 'ACME-SUP-001',
      name: 'Acme Tech Supplies',
      category: 'IT Equipment',
      status: 'APPROVED',
      city: 'New York',
      country: 'USA',
      primaryContactName: 'John Supplier',
      primaryContactEmail: 'john@acme-supplies.test',
    },
  });

  // Create Acme Project
  const acmeProject = await prisma.project.create({
    data: {
      tenantId: orgA.id,
      code: 'ACME-PRJ-001',
      name: 'Acme Website Redesign',
      description: 'Complete overhaul of Acme corporate website',
      status: 'ACTIVE',
      clientType: 'INTERNAL',
      clientName: 'Acme Marketing Dept',
      managerId: acmeAdmin.id,
      createdById: acmeAdmin.id,
      startDate: new Date('2024-01-15'),
    },
  });

  console.log(`  ✅ Created ${acmeAssets.length} assets`);
  console.log(`  ✅ Created ${acmeSubscriptions.length} subscriptions`);
  console.log(`  ✅ Created ${acmeLeaveTypes.length} leave types`);
  console.log(`  ✅ Created 1 supplier: ${acmeSupplier.name}`);
  console.log(`  ✅ Created 1 project: ${acmeProject.name}`);
  console.log(`  ✅ Created 3 users with memberships\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE ORGANIZATION B: GLOBEX INC
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log(`📦 Creating ${ORG_B.name}...`);

  const orgB = await prisma.organization.create({
    data: {
      name: ORG_B.name,
      slug: ORG_B.slug,
      currency: ORG_B.currency,
      timezone: ORG_B.timezone,
      subscriptionTier: SubscriptionTier.STARTER,
      maxUsers: 15,
      maxAssets: 100,
    },
  });

  // Create users for Org B
  const globexAdmin = await prisma.user.create({
    data: {
      name: 'Gary Globex (Admin)',
      email: 'admin@globex-inc.test',
      role: Role.ADMIN,
      passwordHash,
    },
  });

  const globexEmployee1 = await prisma.user.create({
    data: {
      name: 'Hannah Helper (Globex)',
      email: 'employee1@globex-inc.test',
      role: Role.EMPLOYEE,
      passwordHash,
    },
  });

  const globexEmployee2 = await prisma.user.create({
    data: {
      name: 'Ivan Intern (Globex)',
      email: 'employee2@globex-inc.test',
      role: Role.EMPLOYEE,
      passwordHash,
    },
  });

  // Add users to Org B membership
  await prisma.organizationUser.createMany({
    data: [
      { organizationId: orgB.id, userId: globexAdmin.id, role: OrgRole.OWNER, isOwner: true },
      { organizationId: orgB.id, userId: globexEmployee1.id, role: OrgRole.MEMBER },
      { organizationId: orgB.id, userId: globexEmployee2.id, role: OrgRole.MEMBER },
    ],
  });

  // Create Globex Assets
  const globexAssets = await Promise.all([
    prisma.asset.create({
      data: {
        tenantId: orgB.id,
        assetTag: 'GLOBEX-LAPTOP-001',
        type: 'Laptop',
        brand: 'HP',
        model: 'EliteBook 850 G10 (Globex)',
        serial: 'GLOBEX-HP-2024-001',
        configuration: 'Intel i7, 32GB RAM, 512GB SSD',
        status: AssetStatus.IN_USE,
        assignedUserId: globexEmployee1.id,
        price: 5500,
        priceCurrency: 'QAR',
        priceQAR: 5500,
        notes: 'Primary laptop for Hannah',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId: orgB.id,
        assetTag: 'GLOBEX-PHONE-001',
        type: 'Mobile Phone',
        brand: 'Samsung',
        model: 'Galaxy S24 Ultra (Globex)',
        serial: 'GLOBEX-SAM-2024-001',
        status: AssetStatus.IN_USE,
        assignedUserId: globexAdmin.id,
        price: 4200,
        priceCurrency: 'QAR',
        priceQAR: 4200,
      },
    }),
    prisma.asset.create({
      data: {
        tenantId: orgB.id,
        assetTag: 'GLOBEX-PRINTER-001',
        type: 'Printer',
        brand: 'Canon',
        model: 'imageCLASS MF753 (Globex)',
        serial: 'GLOBEX-CAN-2024-001',
        status: AssetStatus.SPARE,
        price: 2800,
        priceCurrency: 'QAR',
        priceQAR: 2800,
        notes: 'Office printer for Globex',
      },
    }),
  ]);

  // Create Globex Subscriptions
  const globexSubscriptions = await Promise.all([
    prisma.subscription.create({
      data: {
        tenantId: orgB.id,
        serviceName: 'Microsoft 365 Business (Globex)',
        category: 'Productivity',
        vendor: 'Microsoft',
        accountId: 'globex-m365-001',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 4500,
        costCurrency: 'QAR',
        costQAR: 4500,
        assignedUserId: globexAdmin.id,
        purchaseDate: new Date('2024-02-01'),
        renewalDate: new Date('2025-02-01'),
        autoRenew: true,
        notes: 'Globex team Office subscription',
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId: orgB.id,
        serviceName: 'Zoom Pro (Globex)',
        category: 'Communication',
        vendor: 'Zoom',
        accountId: 'globex-zoom-001',
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 200,
        costCurrency: 'QAR',
        costQAR: 200,
        assignedUserId: globexAdmin.id,
        purchaseDate: new Date('2024-02-01'),
        renewalDate: new Date('2024-03-01'),
        autoRenew: true,
      },
    }),
  ]);

  // Create Globex Leave Types
  const globexLeaveTypes = await Promise.all([
    prisma.leaveType.create({
      data: {
        tenantId: orgB.id,
        name: 'Annual Leave (Globex)',
        description: 'Globex annual vacation - 30 days per Qatar labor law',
        color: '#10B981',
        defaultDays: 30,
        category: 'STANDARD',
        isPaid: true,
        requiresApproval: true,
        isActive: true,
        accrualBased: true,
      },
    }),
    prisma.leaveType.create({
      data: {
        tenantId: orgB.id,
        name: 'Sick Leave (Globex)',
        description: 'Globex medical leave policy',
        color: '#F59E0B',
        defaultDays: 14,
        category: 'MEDICAL',
        isPaid: true,
        requiresApproval: true,
        requiresDocument: true,
        isActive: true,
      },
    }),
  ]);

  // Create Globex Supplier
  const globexSupplier = await prisma.supplier.create({
    data: {
      tenantId: orgB.id,
      suppCode: 'GLOBEX-SUP-001',
      name: 'Globex Office Solutions',
      category: 'Office Supplies',
      status: 'APPROVED',
      city: 'Doha',
      country: 'Qatar',
      primaryContactName: 'Ahmed Supplier',
      primaryContactEmail: 'ahmed@globex-supplies.test',
    },
  });

  // Create Globex Project
  const globexProject = await prisma.project.create({
    data: {
      tenantId: orgB.id,
      code: 'GLOBEX-PRJ-001',
      name: 'Globex ERP Implementation',
      description: 'New ERP system rollout for Globex operations',
      status: 'PLANNING',
      clientType: 'INTERNAL',
      clientName: 'Globex Operations',
      managerId: globexAdmin.id,
      createdById: globexAdmin.id,
      startDate: new Date('2024-03-01'),
    },
  });

  console.log(`  ✅ Created ${globexAssets.length} assets`);
  console.log(`  ✅ Created ${globexSubscriptions.length} subscriptions`);
  console.log(`  ✅ Created ${globexLeaveTypes.length} leave types`);
  console.log(`  ✅ Created 1 supplier: ${globexSupplier.name}`);
  console.log(`  ✅ Created 1 project: ${globexProject.name}`);
  console.log(`  ✅ Created 3 users with memberships\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // VERIFY TENANT ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🔒 VERIFYING TENANT ISOLATION...\n');

  // Test 1: Assets isolation
  const acmeAssetsCheck = await prisma.asset.findMany({ where: { tenantId: orgA.id } });
  const globexAssetsCheck = await prisma.asset.findMany({ where: { tenantId: orgB.id } });

  console.log('📊 ASSETS:');
  console.log(`   Acme assets: ${acmeAssetsCheck.length} (expected: 3)`);
  console.log(`   Globex assets: ${globexAssetsCheck.length} (expected: 3)`);
  console.log(`   Acme asset tags: ${acmeAssetsCheck.map(a => a.assetTag).join(', ')}`);
  console.log(`   Globex asset tags: ${globexAssetsCheck.map(a => a.assetTag).join(', ')}`);

  const acmeHasGlobexAssets = acmeAssetsCheck.some(a => a.assetTag?.includes('GLOBEX'));
  const globexHasAcmeAssets = globexAssetsCheck.some(a => a.assetTag?.includes('ACME'));
  console.log(`   ✅ No cross-contamination: ${!acmeHasGlobexAssets && !globexHasAcmeAssets}\n`);

  // Test 2: Subscriptions isolation
  const acmeSubsCheck = await prisma.subscription.findMany({ where: { tenantId: orgA.id } });
  const globexSubsCheck = await prisma.subscription.findMany({ where: { tenantId: orgB.id } });

  console.log('📊 SUBSCRIPTIONS:');
  console.log(`   Acme subscriptions: ${acmeSubsCheck.length} (expected: 2)`);
  console.log(`   Globex subscriptions: ${globexSubsCheck.length} (expected: 2)`);
  console.log(`   ✅ Isolated: ${acmeSubsCheck.every(s => s.serviceName.includes('Acme')) && globexSubsCheck.every(s => s.serviceName.includes('Globex'))}\n`);

  // Test 3: Leave Types isolation
  const acmeLeaveCheck = await prisma.leaveType.findMany({ where: { tenantId: orgA.id } });
  const globexLeaveCheck = await prisma.leaveType.findMany({ where: { tenantId: orgB.id } });

  console.log('📊 LEAVE TYPES:');
  console.log(`   Acme leave types: ${acmeLeaveCheck.length} (expected: 2)`);
  console.log(`   Globex leave types: ${globexLeaveCheck.length} (expected: 2)`);
  console.log(`   ✅ Isolated: ${acmeLeaveCheck.every(l => l.name.includes('Acme')) && globexLeaveCheck.every(l => l.name.includes('Globex'))}\n`);

  // Test 4: Suppliers isolation
  const acmeSuppCheck = await prisma.supplier.findMany({ where: { tenantId: orgA.id } });
  const globexSuppCheck = await prisma.supplier.findMany({ where: { tenantId: orgB.id } });

  console.log('📊 SUPPLIERS:');
  console.log(`   Acme suppliers: ${acmeSuppCheck.length} (expected: 1)`);
  console.log(`   Globex suppliers: ${globexSuppCheck.length} (expected: 1)`);
  console.log(`   ✅ Isolated: ${acmeSuppCheck[0]?.suppCode?.includes('ACME') && globexSuppCheck[0]?.suppCode?.includes('GLOBEX')}\n`);

  // Test 5: Projects isolation
  const acmeProjCheck = await prisma.project.findMany({ where: { tenantId: orgA.id } });
  const globexProjCheck = await prisma.project.findMany({ where: { tenantId: orgB.id } });

  console.log('📊 PROJECTS:');
  console.log(`   Acme projects: ${acmeProjCheck.length} (expected: 1)`);
  console.log(`   Globex projects: ${globexProjCheck.length} (expected: 1)`);
  console.log(`   ✅ Isolated: ${acmeProjCheck[0]?.code?.includes('ACME') && globexProjCheck[0]?.code?.includes('GLOBEX')}\n`);

  // Test 6: Organization memberships
  const acmeMembersCheck = await prisma.organizationUser.findMany({
    where: { organizationId: orgA.id },
    include: { user: { select: { email: true } } }
  });
  const globexMembersCheck = await prisma.organizationUser.findMany({
    where: { organizationId: orgB.id },
    include: { user: { select: { email: true } } }
  });

  console.log('📊 MEMBERSHIPS:');
  console.log(`   Acme members: ${acmeMembersCheck.length} (expected: 3)`);
  console.log(`   Globex members: ${globexMembersCheck.length} (expected: 3)`);
  console.log(`   Acme emails: ${acmeMembersCheck.map(m => m.user.email).join(', ')}`);
  console.log(`   Globex emails: ${globexMembersCheck.map(m => m.user.email).join(', ')}`);
  const noOverlap = !acmeMembersCheck.some(m => m.user.email.includes('globex')) &&
                   !globexMembersCheck.some(m => m.user.email.includes('acme'));
  console.log(`   ✅ No membership overlap: ${noOverlap}\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                       SEED COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('🔐 LOGIN CREDENTIALS:');
  console.log('');
  console.log('   ACME CORP (acme-corp.yourdomain.com):');
  console.log('   ├─ Admin: admin@acme-corp.test / Test123!');
  console.log('   ├─ Employee: employee1@acme-corp.test / Test123!');
  console.log('   └─ Employee: employee2@acme-corp.test / Test123!');
  console.log('');
  console.log('   GLOBEX INC (globex-inc.yourdomain.com):');
  console.log('   ├─ Admin: admin@globex-inc.test / Test123!');
  console.log('   ├─ Employee: employee1@globex-inc.test / Test123!');
  console.log('   └─ Employee: employee2@globex-inc.test / Test123!');
  console.log('');
  console.log('🎉 Multi-tenant test data seeded successfully!');
  console.log('');
  console.log('To test isolation:');
  console.log('1. Login to Acme Corp and verify you only see ACME-prefixed data');
  console.log('2. Login to Globex Inc and verify you only see GLOBEX-prefixed data');
  console.log('3. Try direct API calls with different tenant IDs to verify isolation');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
