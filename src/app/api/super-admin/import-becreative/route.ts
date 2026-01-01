/**
 * @file route.ts
 * @description Import backup data into Be Creative organization
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { requireRecent2FA } from '@/lib/two-factor';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require super admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // SECURITY: Require recent 2FA verification for data import
    const require2FAResult = await requireRecent2FA(session.user.id);
    if (require2FAResult) return require2FAResult;

    const backupData = await request.json();

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
      const allOrgs = await prisma.organization.findMany({ select: { id: true, name: true, slug: true } });
      return NextResponse.json({
        success: false,
        error: 'Organization "Be Creative" not found',
        availableOrgs: allOrgs,
      }, { status: 404 });
    }

    // AUDIT: Log import operation for security tracking
    console.log('[AUDIT] Data import initiated:', JSON.stringify({
      event: 'IMPORT_DATA_START',
      timestamp: new Date().toISOString(),
      superAdmin: {
        id: session.user.id,
        email: session.user.email,
      },
      targetOrganization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      backupMetadata: backupData._metadata,
    }));

    const tenantId = org.id;

    const results = {
      users: { created: 0, skipped: 0 },
      orgUsers: { created: 0, skipped: 0 },
      assets: { created: 0, skipped: 0 },
      assetHistories: { created: 0, skipped: 0 },
      subscriptions: { created: 0, skipped: 0 },
      suppliers: { created: 0, skipped: 0 },
      hrProfiles: { created: 0, skipped: 0 },
      purchaseRequests: { created: 0, skipped: 0 },
      purchaseRequestItems: { created: 0, skipped: 0 },
    };

    // 1. Import Users
    for (const user of backupData.users || []) {
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
        results.users.created++;
      } else {
        results.users.skipped++;
      }

      // Create TeamMember entry for organization membership
      const existingMember = await prisma.teamMember.findFirst({
        where: { tenantId, email: existingUser.email },
      });

      if (!existingMember) {
        await prisma.teamMember.create({
          data: {
            tenantId,
            email: existingUser.email,
            name: existingUser.name,
            canLogin: true,
            role: user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
            isOwner: user.role === 'ADMIN' && user.email === 'ramees@becreative.qa',
          },
        });
        results.orgUsers.created++;
      } else {
        results.orgUsers.skipped++;
      }
    }

    // 2. Import Assets
    // First, get all valid user IDs for this tenant
    const validUserIds = new Set(
      (await prisma.user.findMany({ select: { id: true } })).map(u => u.id)
    );

    for (const asset of backupData.assets || []) {
      const existingAsset = await prisma.asset.findFirst({
        where: { assetTag: asset.assetTag, tenantId },
      });

      if (!existingAsset) {
        // Only set assignedMemberId if the user exists (legacy import uses assignedUserId)
        const assignedMemberId = asset.assignedMemberId || (asset.assignedUserId && validUserIds.has(asset.assignedUserId)
          ? asset.assignedUserId
          : null);

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
            assignedMemberId,
            assignmentDate: assignedMemberId && asset.assignmentDate ? new Date(asset.assignmentDate) : null,
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
        results.assets.created++;
      } else {
        results.assets.skipped++;
      }
    }

    // 3. Import Asset Histories
    for (const history of backupData.assetHistories || []) {
      try {
        const existingHistory = await prisma.assetHistory.findUnique({
          where: { id: history.id },
        });

        if (!existingHistory) {
          await prisma.assetHistory.create({
            data: {
              id: history.id,
              tenantId: org.id,
              assetId: history.assetId,
              action: history.action,
              fromMemberId: history.fromMemberId || history.fromUserId || history.userId || null,
              toMemberId: history.toMemberId || history.toUserId || null,
              notes: history.notes,
              performedById: history.performedById || history.performedBy || null,
              createdAt: new Date(history.createdAt),
            },
          });
          results.assetHistories.created++;
        } else {
          results.assetHistories.skipped++;
        }
      } catch (e) {
        results.assetHistories.skipped++;
      }
    }

    // 4. Import Subscriptions
    for (const sub of backupData.subscriptions || []) {
      const existingSub = await prisma.subscription.findFirst({
        where: { serviceName: sub.serviceName, tenantId },
      });

      if (!existingSub) {
        // Only set assignedMemberId if the user exists (legacy import uses assignedUserId)
        const subAssignedMemberId = sub.assignedMemberId || (sub.assignedUserId && validUserIds.has(sub.assignedUserId)
          ? sub.assignedUserId
          : null);

        await prisma.subscription.create({
          data: {
            id: sub.id,
            tenantId,
            serviceName: sub.serviceName,
            vendor: sub.provider || sub.vendor,
            category: sub.category,
            accountId: sub.accountNumber || sub.accountId,
            costPerCycle: sub.cost ? parseFloat(sub.cost) : (sub.costPerCycle ? parseFloat(sub.costPerCycle) : null),
            costCurrency: sub.costCurrency || 'QAR',
            costQAR: sub.costQAR ? parseFloat(sub.costQAR) : null,
            billingCycle: sub.billingCycle,
            renewalDate: sub.renewalDate ? new Date(sub.renewalDate) : null,
            status: sub.status,
            assignedMemberId: subAssignedMemberId,
            notes: sub.notes,
            createdAt: new Date(sub.createdAt),
            updatedAt: new Date(sub.updatedAt),
          },
        });
        results.subscriptions.created++;
      } else {
        results.subscriptions.skipped++;
      }
    }

    // 5. Import Suppliers
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
            category: supplier.category || 'General',
            primaryContactName: supplier.contactPerson || supplier.primaryContactName,
            primaryContactEmail: supplier.email || supplier.primaryContactEmail,
            primaryContactMobile: supplier.phone || supplier.primaryContactMobile,
            website: supplier.website,
            address: supplier.address,
            paymentTerms: supplier.paymentTerms,
            additionalInfo: supplier.notes || supplier.additionalInfo,
            status: supplier.status || 'APPROVED',
            createdAt: new Date(supplier.createdAt),
            updatedAt: new Date(supplier.updatedAt),
          },
        });
        results.suppliers.created++;
      } else {
        results.suppliers.skipped++;
      }
    }

    // 6. Import HR Profiles (now embedded in TeamMember - update existing members)
    for (const profile of backupData.hrProfiles || []) {
      try {
        // Find the TeamMember by email (HR profile userId was the User id)
        const member = await prisma.teamMember.findFirst({
          where: { tenantId, email: profile.userId ? undefined : profile.email },
        });

        if (member) {
          await prisma.teamMember.update({
            where: { id: member.id },
            data: {
              employeeCode: profile.employeeId,
              dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined,
              gender: profile.gender || undefined,
              nationality: profile.nationality || undefined,
              maritalStatus: profile.maritalStatus || undefined,
              qatarMobile: profile.personalPhone || profile.qatarMobile || undefined,
              personalEmail: profile.personalEmail || undefined,
              localEmergencyName: profile.emergencyContactName || profile.localEmergencyName || undefined,
              localEmergencyPhone: profile.emergencyContactPhone || profile.localEmergencyPhone || undefined,
              localEmergencyRelation: profile.emergencyContactRelation || profile.localEmergencyRelation || undefined,
              qidNumber: profile.qidNumber || undefined,
              qidExpiry: profile.qidExpiry ? new Date(profile.qidExpiry) : undefined,
              passportNumber: profile.passportNumber || undefined,
              passportExpiry: profile.passportExpiry ? new Date(profile.passportExpiry) : undefined,
              healthCardExpiry: profile.healthCardExpiry ? new Date(profile.healthCardExpiry) : undefined,
              dateOfJoining: profile.dateOfJoining ? new Date(profile.dateOfJoining) : undefined,
              designation: profile.designation || undefined,
              sponsorshipType: profile.visaSponsor || profile.sponsorshipType || undefined,
              contractExpiry: profile.contractEndDate ? new Date(profile.contractEndDate) : (profile.visaExpiry ? new Date(profile.visaExpiry) : undefined),
              bankName: profile.bankName || undefined,
              iban: profile.bankIban || profile.iban || undefined,
            },
          });
          results.hrProfiles.created++;
        } else {
          results.hrProfiles.skipped++;
        }
      } catch (e) {
        results.hrProfiles.skipped++;
      }
    }

    // 7. Import Purchase Requests
    // Get valid supplier IDs for this tenant
    const validSupplierIds = new Set(
      (await prisma.supplier.findMany({ where: { tenantId }, select: { id: true } })).map(s => s.id)
    );

    for (const pr of backupData.purchaseRequests || []) {
      const existingPR = await prisma.purchaseRequest.findFirst({
        where: { referenceNumber: pr.referenceNumber, tenantId },
      });

      if (!existingPR) {
        try {
          // Only set requesterId if the user exists
          const requesterId = pr.requesterId && validUserIds.has(pr.requesterId)
            ? pr.requesterId
            : null;

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
              requesterId,
              totalAmount: parseFloat(pr.totalAmount || '0'),
              currency: pr.currency || 'QAR',
              totalAmountQAR: pr.totalAmountQAR ? parseFloat(pr.totalAmountQAR) : undefined,
              vendorName: pr.vendorName,
              additionalNotes: pr.notes || pr.additionalNotes,
              createdAt: new Date(pr.createdAt),
              updatedAt: new Date(pr.updatedAt),
            },
          });
          results.purchaseRequests.created++;
        } catch (e) {
          results.purchaseRequests.skipped++;
        }
      } else {
        results.purchaseRequests.skipped++;
      }
    }

    // 8. Import Purchase Request Items
    for (const item of backupData.purchaseRequestItems || []) {
      try {
        const existingItem = await prisma.purchaseRequestItem.findUnique({
          where: { id: item.id },
        });

        if (!existingItem) {
          // Calculate required values
          const quantity = item.quantity || 1;
          const unitPrice = item.estimatedUnitPrice || item.unitPrice || 0;
          const totalPrice = item.totalPrice || (quantity * unitPrice);

          await prisma.purchaseRequestItem.create({
            data: {
              id: item.id,
              purchaseRequestId: item.purchaseRequestId,
              itemNumber: item.itemNumber || 1,
              description: item.description,
              quantity,
              unitPrice: parseFloat(String(unitPrice)),
              currency: item.currency || 'QAR',
              unitPriceQAR: item.estimatedUnitPriceQAR ? parseFloat(item.estimatedUnitPriceQAR) : null,
              totalPrice: parseFloat(String(totalPrice)),
              totalPriceQAR: item.totalPriceQAR ? parseFloat(item.totalPriceQAR) : null,
              category: item.category,
              supplier: item.preferredVendor || item.supplier,
              notes: item.specifications || item.notes,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
            },
          });
          results.purchaseRequestItems.created++;
        } else {
          results.purchaseRequestItems.skipped++;
        }
      } catch (e) {
        results.purchaseRequestItems.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      organization: { id: org.id, name: org.name, slug: org.slug },
      results,
    });

  } catch (error) {
    console.error('Import failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
