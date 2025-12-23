import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { arrayToCSV, formatDateForCSV } from '@/lib/csv-utils';

export const maxDuration = 60; // Set max duration to 60 seconds for large exports

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data from database
    const [
      users,
      assets,
      subscriptions,
      suppliers,
      assetHistory,
      subscriptionHistory,
      supplierEngagements,
      activityLogs,
      maintenanceRecords,
      hrProfiles,
      profileChangeRequests,
      // Purchase Requests
      purchaseRequests,
      purchaseRequestItems,
      purchaseRequestHistory,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.asset.findMany({
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.subscription.findMany({
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.supplier.findMany({
        include: {
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.assetHistory.findMany({
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              type: true,
              model: true,
            },
          },
          fromUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          performer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.subscriptionHistory.findMany({
        include: {
          subscription: {
            select: {
              id: true,
              serviceName: true,
            },
          },
          oldUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          newUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          performer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.supplierEngagement.findMany({
        include: {
          supplier: {
            select: {
              id: true,
              suppCode: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.activityLog.findMany({
        include: {
          actorUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.maintenanceRecord.findMany({
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              type: true,
              model: true,
            },
          },
        },
      }),
      prisma.hRProfile.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.profileChangeRequest.findMany({
        include: {
          hrProfile: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      }),
      // Purchase Requests
      prisma.purchaseRequest.findMany({
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.purchaseRequestItem.findMany(),
      prisma.purchaseRequestHistory.findMany({
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    // Transform data for Excel sheets
    const usersData = users.map(u => ({
      id: u.id,
      name: u.name || '',
      email: u.email,
      role: u.role,
      isSystemAccount: u.isSystemAccount ? 'Yes' : 'No',
      emailVerified: u.emailVerified ? formatDateForCSV(u.emailVerified) : '',
      createdAt: formatDateForCSV(u.createdAt),
      updatedAt: formatDateForCSV(u.updatedAt),
    }));

    const assetsData = assets.map(a => ({
      id: a.id,
      assetTag: a.assetTag || '',
      type: a.type,
      category: a.category || '',
      brand: a.brand || '',
      model: a.model,
      serial: a.serial || '',
      configuration: a.configuration || '',
      purchaseDate: formatDateForCSV(a.purchaseDate),
      warrantyExpiry: formatDateForCSV(a.warrantyExpiry),
      supplier: a.supplier || '',
      invoiceNumber: a.invoiceNumber || '',
      assignedUserId: a.assignedUserId || '',
      assignedUser: a.assignedUser ? (a.assignedUser.name || a.assignedUser.email) : '',
      status: a.status,
      acquisitionType: a.acquisitionType,
      location: a.location || '',
      price: a.price ? Number(a.price) : '',
      priceCurrency: a.priceCurrency || '',
      priceQAR: a.priceQAR ? Number(a.priceQAR) : '',
      notes: a.notes || '',
      createdAt: formatDateForCSV(a.createdAt),
      updatedAt: formatDateForCSV(a.updatedAt),
    }));

    const subscriptionsData = subscriptions.map(s => ({
      id: s.id,
      serviceName: s.serviceName,
      category: s.category || '',
      accountId: s.accountId || '',
      purchaseDate: formatDateForCSV(s.purchaseDate),
      renewalDate: formatDateForCSV(s.renewalDate),
      billingCycle: s.billingCycle,
      costPerCycle: s.costPerCycle ? Number(s.costPerCycle) : '',
      costCurrency: s.costCurrency || '',
      costQAR: s.costQAR ? Number(s.costQAR) : '',
      vendor: s.vendor || '',
      status: s.status,
      assignedUserId: s.assignedUserId || '',
      assignedUser: s.assignedUser ? (s.assignedUser.name || s.assignedUser.email) : '',
      autoRenew: s.autoRenew ? 'Yes' : 'No',
      paymentMethod: s.paymentMethod || '',
      notes: s.notes || '',
      cancelledAt: formatDateForCSV(s.cancelledAt),
      reactivatedAt: formatDateForCSV(s.reactivatedAt),
      lastActiveRenewalDate: formatDateForCSV(s.lastActiveRenewalDate),
      createdAt: formatDateForCSV(s.createdAt),
      updatedAt: formatDateForCSV(s.updatedAt),
    }));

    const suppliersData = suppliers.map(s => ({
      id: s.id,
      suppCode: s.suppCode || '',
      name: s.name,
      category: s.category,
      address: s.address || '',
      city: s.city || '',
      country: s.country || '',
      website: s.website || '',
      establishmentYear: s.establishmentYear || '',
      primaryContactName: s.primaryContactName || '',
      primaryContactTitle: s.primaryContactTitle || '',
      primaryContactEmail: s.primaryContactEmail || '',
      primaryContactMobile: s.primaryContactMobile || '',
      secondaryContactName: s.secondaryContactName || '',
      secondaryContactTitle: s.secondaryContactTitle || '',
      secondaryContactEmail: s.secondaryContactEmail || '',
      secondaryContactMobile: s.secondaryContactMobile || '',
      paymentTerms: s.paymentTerms || '',
      additionalInfo: s.additionalInfo || '',
      status: s.status,
      rejectionReason: s.rejectionReason || '',
      approvedById: s.approvedById || '',
      approvedBy: s.approvedBy ? (s.approvedBy.name || s.approvedBy.email) : '',
      approvedAt: formatDateForCSV(s.approvedAt),
      createdAt: formatDateForCSV(s.createdAt),
      updatedAt: formatDateForCSV(s.updatedAt),
    }));

    // Asset History
    const assetHistoryData = assetHistory.map(h => ({
      id: h.id,
      assetId: h.assetId,
      assetTag: h.asset?.assetTag || '',
      assetType: h.asset?.type || '',
      assetModel: h.asset?.model || '',
      action: h.action,
      fromUserId: h.fromUserId || '',
      fromUserName: h.fromUser ? (h.fromUser.name || h.fromUser.email) : '',
      toUserId: h.toUserId || '',
      toUserName: h.toUser ? (h.toUser.name || h.toUser.email) : '',
      performedBy: h.performedBy || '',
      performerName: h.performer ? (h.performer.name || h.performer.email) : '',
      notes: h.notes || '',
      createdAt: formatDateForCSV(h.createdAt),
    }));

    // Subscription History
    const subscriptionHistoryData = subscriptionHistory.map(h => ({
      id: h.id,
      subscriptionId: h.subscriptionId,
      subscriptionName: h.subscription?.serviceName || '',
      action: h.action,
      oldStatus: h.oldStatus || '',
      newStatus: h.newStatus || '',
      oldRenewalDate: formatDateForCSV(h.oldRenewalDate),
      newRenewalDate: formatDateForCSV(h.newRenewalDate),
      oldUserId: h.oldUserId || '',
      oldUserName: h.oldUser ? (h.oldUser.name || h.oldUser.email) : '',
      newUserId: h.newUserId || '',
      newUserName: h.newUser ? (h.newUser.name || h.newUser.email) : '',
      assignmentDate: formatDateForCSV(h.assignmentDate),
      reactivationDate: formatDateForCSV(h.reactivationDate),
      notes: h.notes || '',
      performedBy: h.performedBy || '',
      performerName: h.performer ? (h.performer.name || h.performer.email) : '',
      createdAt: formatDateForCSV(h.createdAt),
    }));

    // Supplier Engagements
    const supplierEngagementsData = supplierEngagements.map(e => ({
      id: e.id,
      supplierId: e.supplierId,
      supplierCode: e.supplier?.suppCode || '',
      supplierName: e.supplier?.name || '',
      date: formatDateForCSV(e.date),
      rating: e.rating || '',
      notes: e.notes || '',
      createdById: e.createdById,
      createdByName: e.createdBy ? (e.createdBy.name || e.createdBy.email) : '',
      createdAt: formatDateForCSV(e.createdAt),
    }));

    // Activity Logs
    const activityLogsData = activityLogs.map(l => ({
      id: l.id,
      entityType: l.entityType,
      entityId: l.entityId,
      action: l.action,
      actorUserId: l.actorUserId || '',
      actorUserName: l.actorUser ? (l.actorUser.name || l.actorUser.email) : 'System',
      payload: JSON.stringify(l.payload || {}),
      timestamp: formatDateForCSV(l.at),
    }));

    // Maintenance Records
    const maintenanceRecordsData = maintenanceRecords.map(m => ({
      id: m.id,
      assetId: m.assetId,
      assetTag: m.asset?.assetTag || '',
      assetType: m.asset?.type || '',
      assetModel: m.asset?.model || '',
      maintenanceDate: formatDateForCSV(m.maintenanceDate),
      performedBy: m.performedBy || '',
      notes: m.notes || '',
      createdAt: formatDateForCSV(m.createdAt),
      updatedAt: formatDateForCSV(m.updatedAt),
    }));

    // HR Profiles
    const hrProfilesData = hrProfiles.map(h => ({
      id: h.id,
      userId: h.userId,
      userName: h.user ? (h.user.name || h.user.email) : '',
      dateOfBirth: formatDateForCSV(h.dateOfBirth),
      gender: h.gender || '',
      maritalStatus: h.maritalStatus || '',
      nationality: h.nationality || '',
      qatarMobile: h.qatarMobile || '',
      otherMobileCode: h.otherMobileCode || '',
      otherMobileNumber: h.otherMobileNumber || '',
      personalEmail: h.personalEmail || '',
      qidNumber: h.qidNumber || '',
      qidExpiry: formatDateForCSV(h.qidExpiry),
      passportNumber: h.passportNumber || '',
      passportExpiry: formatDateForCSV(h.passportExpiry),
      healthCardExpiry: formatDateForCSV(h.healthCardExpiry),
      sponsorshipType: h.sponsorshipType || '',
      employeeId: h.employeeId || '',
      designation: h.designation || '',
      dateOfJoining: formatDateForCSV(h.dateOfJoining),
      bankName: h.bankName || '',
      iban: h.iban || '',
      highestQualification: h.highestQualification || '',
      specialization: h.specialization || '',
      institutionName: h.institutionName || '',
      graduationYear: h.graduationYear || '',
      hasDrivingLicense: h.hasDrivingLicense ? 'Yes' : 'No',
      licenseExpiry: formatDateForCSV(h.licenseExpiry),
      onboardingStep: h.onboardingStep,
      onboardingComplete: h.onboardingComplete ? 'Yes' : 'No',
      createdAt: formatDateForCSV(h.createdAt),
      updatedAt: formatDateForCSV(h.updatedAt),
    }));

    // Profile Change Requests
    const profileChangeRequestsData = profileChangeRequests.map(r => ({
      id: r.id,
      hrProfileId: r.hrProfileId,
      description: r.description,
      status: r.status,
      resolvedById: r.resolvedById || '',
      resolvedAt: formatDateForCSV(r.resolvedAt),
      resolverNotes: r.resolverNotes || '',
      createdAt: formatDateForCSV(r.createdAt),
      updatedAt: formatDateForCSV(r.updatedAt),
    }));

    // Purchase Requests
    const purchaseRequestsData = purchaseRequests.map(r => ({
      id: r.id,
      referenceNumber: r.referenceNumber,
      requestDate: formatDateForCSV(r.requestDate),
      status: r.status,
      priority: r.priority,
      requesterId: r.requesterId,
      requesterName: r.requester ? (r.requester.name || r.requester.email) : '',
      title: r.title,
      description: r.description || '',
      justification: r.justification || '',
      neededByDate: formatDateForCSV(r.neededByDate),
      totalAmount: r.totalAmount ? Number(r.totalAmount) : '',
      currency: r.currency,
      totalAmountQAR: r.totalAmountQAR ? Number(r.totalAmountQAR) : '',
      reviewedById: r.reviewedById || '',
      reviewedByName: r.reviewedBy ? (r.reviewedBy.name || r.reviewedBy.email) : '',
      reviewedAt: formatDateForCSV(r.reviewedAt),
      reviewNotes: r.reviewNotes || '',
      completedAt: formatDateForCSV(r.completedAt),
      completionNotes: r.completionNotes || '',
      createdAt: formatDateForCSV(r.createdAt),
      updatedAt: formatDateForCSV(r.updatedAt),
    }));

    // Purchase Request Items
    const purchaseRequestItemsData = purchaseRequestItems.map(i => ({
      id: i.id,
      purchaseRequestId: i.purchaseRequestId,
      itemNumber: i.itemNumber,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice ? Number(i.unitPrice) : '',
      currency: i.currency,
      unitPriceQAR: i.unitPriceQAR ? Number(i.unitPriceQAR) : '',
      totalPrice: i.totalPrice ? Number(i.totalPrice) : '',
      totalPriceQAR: i.totalPriceQAR ? Number(i.totalPriceQAR) : '',
      category: i.category || '',
      supplier: i.supplier || '',
      notes: i.notes || '',
      createdAt: formatDateForCSV(i.createdAt),
      updatedAt: formatDateForCSV(i.updatedAt),
    }));

    // Purchase Request History
    const purchaseRequestHistoryData = purchaseRequestHistory.map(h => ({
      id: h.id,
      purchaseRequestId: h.purchaseRequestId,
      action: h.action,
      previousStatus: h.previousStatus || '',
      newStatus: h.newStatus || '',
      performedById: h.performedById,
      performedByName: h.performedBy ? (h.performedBy.name || h.performedBy.email) : '',
      details: h.details || '',
      createdAt: formatDateForCSV(h.createdAt),
    }));

    // Metadata sheet
    const metadataData = [{
      exportDate: new Date().toISOString(),
      exportedBy: session.user.email,
      version: '4.0',
      totalUsers: users.length,
      totalAssets: assets.length,
      totalSubscriptions: subscriptions.length,
      totalSuppliers: suppliers.length,
      totalAssetHistory: assetHistory.length,
      totalSubscriptionHistory: subscriptionHistory.length,
      totalSupplierEngagements: supplierEngagements.length,
      totalActivityLogs: activityLogs.length,
      totalMaintenanceRecords: maintenanceRecords.length,
      totalHRProfiles: hrProfiles.length,
      totalProfileChangeRequests: profileChangeRequests.length,
      // Purchase Requests
      totalPurchaseRequests: purchaseRequests.length,
      totalPurchaseRequestItems: purchaseRequestItems.length,
      totalPurchaseRequestHistory: purchaseRequestHistory.length,
    }];

    // Create Excel file with multiple sheets - ALL data included
    const sheets = [
      { name: 'Metadata', data: metadataData, headers: Object.keys(metadataData[0]).map(key => ({ key, header: key })) },
      { name: 'Users', data: usersData, headers: Object.keys(usersData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Assets', data: assetsData, headers: Object.keys(assetsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Subscriptions', data: subscriptionsData, headers: Object.keys(subscriptionsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Suppliers', data: suppliersData, headers: Object.keys(suppliersData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Asset History', data: assetHistoryData, headers: Object.keys(assetHistoryData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Sub History', data: subscriptionHistoryData, headers: Object.keys(subscriptionHistoryData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Supplier Engagements', data: supplierEngagementsData, headers: Object.keys(supplierEngagementsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Activity Logs', data: activityLogsData, headers: Object.keys(activityLogsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Maintenance', data: maintenanceRecordsData, headers: Object.keys(maintenanceRecordsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'HR Profiles', data: hrProfilesData, headers: Object.keys(hrProfilesData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Profile Changes', data: profileChangeRequestsData, headers: Object.keys(profileChangeRequestsData[0] || {}).map(key => ({ key, header: key })) },
      // Purchase Requests
      { name: 'Purchase Requests', data: purchaseRequestsData, headers: Object.keys(purchaseRequestsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'PR Items', data: purchaseRequestItemsData, headers: Object.keys(purchaseRequestItemsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'PR History', data: purchaseRequestHistoryData, headers: Object.keys(purchaseRequestHistoryData[0] || {}).map(key => ({ key, header: key })) },
    ];

    const excelBuffer = await arrayToCSV([], [], sheets);
    const filename = `full_backup_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Full backup export error:', error);
    return NextResponse.json(
      { error: 'Failed to create full backup' },
      { status: 500 }
    );
  }
}
