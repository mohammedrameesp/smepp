import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Use session pooler URL with proper URL encoding
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.bwgsqpvbfyehbgzeldvu:MrpCkraPkl%40053@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function importData() {
  console.log('Starting import for Be Creative organization...\n');

  // Read the backup file
  const backupPath = 'C:\\Users\\moham\\Downloads\\damp-full-backup-2025-12-27T18-00-47-770Z.json';
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  console.log('Backup metadata:', backupData._metadata);
  console.log('Counts:', backupData._counts);

  // Find the Be Creative organization
  const org = await prisma.organization.findFirst({
    where: {
      name: {
        contains: 'Be Creative',
        mode: 'insensitive',
      },
    },
  });

  if (!org) {
    console.error('Organization "Be Creative" not found!');
    const allOrgs = await prisma.organization.findMany({ select: { id: true, name: true, slug: true } });
    console.log('Available organizations:', allOrgs);
    return;
  }

  console.log(`\nFound organization: ${org.name} (${org.id})`);
  const tenantId = org.id;

  // Start importing data
  try {
    // 1. Import Users and create OrganizationUser entries
    console.log('\n--- Importing Users ---');
    for (const user of backupData.users) {
      // Check if user already exists
      let existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser) {
        existingUser = await prisma.user.create({
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
            image: user.image,
            role: user.role,
            isSystemAccount: user.isSystemAccount || false,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
        });
        console.log(`  Created user: ${user.name} (${user.email})`);
      } else {
        console.log(`  User exists: ${user.name} (${user.email})`);
      }

      // Create OrganizationUser entry if not exists
      const existingOrgUser = await prisma.organizationUser.findUnique({
        where: {
          organizationId_userId: {
            organizationId: tenantId,
            userId: existingUser.id,
          },
        },
      });

      if (!existingOrgUser) {
        await prisma.organizationUser.create({
          data: {
            organizationId: tenantId,
            userId: existingUser.id,
            role: user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
            isOwner: user.role === 'ADMIN' && user.email === 'ramees@becreative.qa',
          },
        });
        console.log(`    Added to organization: ${user.email}`);
      }
    }

    // 2. Import Assets
    console.log('\n--- Importing Assets ---');
    for (const asset of backupData.assets) {
      const existingAsset = await prisma.asset.findFirst({
        where: { assetTag: asset.assetTag, tenantId },
      });

      if (!existingAsset) {
        await prisma.asset.create({
          data: {
            id: asset.id,
            tenantId,
            assetTag: asset.assetTag,
            type: asset.type,
            category: asset.category,
            brand: asset.brand,
            model: asset.model,
            serial: asset.serial,
            configuration: asset.configuration,
            purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : null,
            warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry) : null,
            supplier: asset.supplier,
            invoiceNumber: asset.invoiceNumber,
            assignedUserId: asset.assignedUserId,
            assignmentDate: asset.assignmentDate ? new Date(asset.assignmentDate) : null,
            status: asset.status,
            acquisitionType: asset.acquisitionType || 'NEW_PURCHASE',
            transferNotes: asset.transferNotes,
            price: asset.price ? parseFloat(asset.price) : null,
            priceCurrency: asset.priceCurrency || 'QAR',
            priceQAR: asset.priceQAR ? parseFloat(asset.priceQAR) : null,
            notes: asset.notes,
            location: asset.location,
            createdAt: new Date(asset.createdAt),
            updatedAt: new Date(asset.updatedAt),
          },
        });
        console.log(`  Created asset: ${asset.assetTag} - ${asset.brand} ${asset.model}`);
      } else {
        console.log(`  Asset exists: ${asset.assetTag}`);
      }
    }

    // 3. Import Asset Histories
    console.log('\n--- Importing Asset Histories ---');
    let historyCount = 0;
    for (const history of backupData.assetHistories || []) {
      try {
        const existingHistory = await prisma.assetHistory.findUnique({
          where: { id: history.id },
        });

        if (!existingHistory) {
          await prisma.assetHistory.create({
            data: {
              id: history.id,
              tenantId,
              assetId: history.assetId,
              userId: history.userId,
              action: history.action,
              startDate: history.startDate ? new Date(history.startDate) : null,
              endDate: history.endDate ? new Date(history.endDate) : null,
              notes: history.notes,
              performedById: history.performedById,
              createdAt: new Date(history.createdAt),
            },
          });
          historyCount++;
        }
      } catch (e) {
        // Skip if foreign key constraint fails
      }
    }
    console.log(`  Created ${historyCount} asset history records`);

    // 4. Import Subscriptions
    console.log('\n--- Importing Subscriptions ---');
    for (const sub of backupData.subscriptions || []) {
      const existingSub = await prisma.subscription.findFirst({
        where: { serviceName: sub.serviceName, tenantId },
      });

      if (!existingSub) {
        await prisma.subscription.create({
          data: {
            id: sub.id,
            tenantId,
            serviceName: sub.serviceName,
            provider: sub.provider,
            category: sub.category,
            accountNumber: sub.accountNumber,
            accountEmail: sub.accountEmail,
            cost: sub.cost ? parseFloat(sub.cost) : null,
            costCurrency: sub.costCurrency || 'QAR',
            costQAR: sub.costQAR ? parseFloat(sub.costQAR) : null,
            billingCycle: sub.billingCycle,
            renewalDate: sub.renewalDate ? new Date(sub.renewalDate) : null,
            status: sub.status,
            assignedUserId: sub.assignedUserId,
            notes: sub.notes,
            createdAt: new Date(sub.createdAt),
            updatedAt: new Date(sub.updatedAt),
          },
        });
        console.log(`  Created subscription: ${sub.serviceName}`);
      } else {
        console.log(`  Subscription exists: ${sub.serviceName}`);
      }
    }

    // 5. Import Suppliers
    console.log('\n--- Importing Suppliers ---');
    for (const supplier of backupData.suppliers || []) {
      const existingSupplier = await prisma.supplier.findFirst({
        where: { name: supplier.name, tenantId },
      });

      if (!existingSupplier) {
        await prisma.supplier.create({
          data: {
            id: supplier.id,
            tenantId,
            name: supplier.name,
            category: supplier.category,
            contactPerson: supplier.contactPerson,
            email: supplier.email,
            phone: supplier.phone,
            website: supplier.website,
            address: supplier.address,
            taxId: supplier.taxId,
            paymentTerms: supplier.paymentTerms,
            bankDetails: supplier.bankDetails,
            notes: supplier.notes,
            status: supplier.status || 'APPROVED',
            createdAt: new Date(supplier.createdAt),
            updatedAt: new Date(supplier.updatedAt),
          },
        });
        console.log(`  Created supplier: ${supplier.name}`);
      } else {
        console.log(`  Supplier exists: ${supplier.name}`);
      }
    }

    // 6. Import HR Profiles
    console.log('\n--- Importing HR Profiles ---');
    for (const profile of backupData.hrProfiles || []) {
      const existingProfile = await prisma.hRProfile.findUnique({
        where: { userId: profile.userId },
      });

      if (!existingProfile) {
        try {
          await prisma.hRProfile.create({
            data: {
              id: profile.id,
              tenantId,
              userId: profile.userId,
              employeeId: profile.employeeId,
              dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
              gender: profile.gender,
              nationality: profile.nationality,
              maritalStatus: profile.maritalStatus,
              personalPhone: profile.personalPhone,
              personalEmail: profile.personalEmail,
              emergencyContactName: profile.emergencyContactName,
              emergencyContactPhone: profile.emergencyContactPhone,
              emergencyContactRelation: profile.emergencyContactRelation,
              qidNumber: profile.qidNumber,
              qidExpiry: profile.qidExpiry ? new Date(profile.qidExpiry) : null,
              passportNumber: profile.passportNumber,
              passportExpiry: profile.passportExpiry ? new Date(profile.passportExpiry) : null,
              healthCardExpiry: profile.healthCardExpiry ? new Date(profile.healthCardExpiry) : null,
              drivingLicenseExpiry: profile.drivingLicenseExpiry ? new Date(profile.drivingLicenseExpiry) : null,
              dateOfJoining: profile.dateOfJoining ? new Date(profile.dateOfJoining) : null,
              employmentType: profile.employmentType,
              designation: profile.designation,
              department: profile.department,
              reportingManagerId: profile.reportingManagerId,
              workLocation: profile.workLocation,
              visaStatus: profile.visaStatus,
              visaSponsor: profile.visaSponsor,
              visaExpiry: profile.visaExpiry ? new Date(profile.visaExpiry) : null,
              probationEndDate: profile.probationEndDate ? new Date(profile.probationEndDate) : null,
              contractEndDate: profile.contractEndDate ? new Date(profile.contractEndDate) : null,
              bankName: profile.bankName,
              bankAccountNumber: profile.bankAccountNumber,
              bankIban: profile.bankIban,
              createdAt: new Date(profile.createdAt),
              updatedAt: new Date(profile.updatedAt),
            },
          });
          console.log(`  Created HR profile for: ${profile.employeeId}`);
        } catch (e) {
          console.log(`  Skipped HR profile: ${profile.employeeId} (user not found)`);
        }
      } else {
        console.log(`  HR Profile exists for: ${profile.employeeId}`);
      }
    }

    // 7. Import Purchase Requests
    console.log('\n--- Importing Purchase Requests ---');
    for (const pr of backupData.purchaseRequests || []) {
      const existingPR = await prisma.purchaseRequest.findFirst({
        where: { referenceNumber: pr.referenceNumber, tenantId },
      });

      if (!existingPR) {
        try {
          await prisma.purchaseRequest.create({
            data: {
              id: pr.id,
              tenantId,
              referenceNumber: pr.referenceNumber,
              title: pr.title,
              description: pr.description,
              justification: pr.justification,
              priority: pr.priority,
              status: pr.status,
              requesterId: pr.requesterId,
              totalAmount: pr.totalAmount ? parseFloat(pr.totalAmount) : null,
              currency: pr.currency || 'QAR',
              totalAmountQAR: pr.totalAmountQAR ? parseFloat(pr.totalAmountQAR) : null,
              supplierId: pr.supplierId,
              projectId: pr.projectId,
              notes: pr.notes,
              createdAt: new Date(pr.createdAt),
              updatedAt: new Date(pr.updatedAt),
            },
          });
          console.log(`  Created PR: ${pr.referenceNumber} - ${pr.title}`);
        } catch (e) {
          console.log(`  Skipped PR: ${pr.referenceNumber} (requester not found)`);
        }
      } else {
        console.log(`  PR exists: ${pr.referenceNumber}`);
      }
    }

    // 8. Import Purchase Request Items
    console.log('\n--- Importing Purchase Request Items ---');
    let itemCount = 0;
    for (const item of backupData.purchaseRequestItems || []) {
      try {
        const existingItem = await prisma.purchaseRequestItem.findUnique({
          where: { id: item.id },
        });

        if (!existingItem) {
          await prisma.purchaseRequestItem.create({
            data: {
              id: item.id,
              purchaseRequestId: item.purchaseRequestId,
              description: item.description,
              quantity: item.quantity,
              estimatedUnitPrice: item.estimatedUnitPrice ? parseFloat(item.estimatedUnitPrice) : null,
              currency: item.currency || 'QAR',
              estimatedUnitPriceQAR: item.estimatedUnitPriceQAR ? parseFloat(item.estimatedUnitPriceQAR) : null,
              totalPrice: item.totalPrice ? parseFloat(item.totalPrice) : null,
              totalPriceQAR: item.totalPriceQAR ? parseFloat(item.totalPriceQAR) : null,
              category: item.category,
              specifications: item.specifications,
              preferredVendor: item.preferredVendor,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
            },
          });
          itemCount++;
        }
      } catch (e) {
        // Skip if foreign key constraint fails
      }
    }
    console.log(`  Created ${itemCount} purchase request items`);

    console.log('\n=== Import Complete ===');
    console.log(`Organization: ${org.name}`);
    console.log(`Tenant ID: ${tenantId}`);

  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importData().catch(console.error);
