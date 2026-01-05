import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { TeamMemberRole } from '@prisma/client';
import { arrayToCSV, formatDateForCSV } from '@/lib/core/csv-utils';

export const maxDuration = 60; // Set max duration to 60 seconds for large exports

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.teamMemberRole !== TeamMemberRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    // Fetch all data from database (tenant-scoped)
    const [
      teamMembers,
      assets,
      subscriptions,
      suppliers,
      assetHistory,
      subscriptionHistory,
      supplierEngagements,
      activityLogs,
      maintenanceRecords,
      profileChangeRequests,
      // Purchase Requests
      purchaseRequests,
      purchaseRequestItems,
      purchaseRequestHistory,
    ] = await Promise.all([
      prisma.teamMember.findMany({
        where: { tenantId },
      }),
      prisma.asset.findMany({
        where: { tenantId },
        include: {
          assignedMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          location: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.subscription.findMany({
        where: { tenantId },
        include: {
          assignedMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.supplier.findMany({
        where: { tenantId },
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
        where: { asset: { tenantId } },
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              type: true,
              model: true,
            },
          },
          fromMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          toMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.subscriptionHistory.findMany({
        where: { subscription: { tenantId } },
        include: {
          subscription: {
            select: {
              id: true,
              serviceName: true,
            },
          },
          oldMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          newMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.supplierEngagement.findMany({
        where: { tenantId },
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
        where: { tenantId },
        include: {
          actorMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.maintenanceRecord.findMany({
        where: { tenantId },
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
      prisma.profileChangeRequest.findMany({
        where: { tenantId },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      // Purchase Requests
      prisma.purchaseRequest.findMany({
        where: { tenantId },
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
      prisma.purchaseRequestItem.findMany({
        where: { purchaseRequest: { tenantId } },
      }),
      prisma.purchaseRequestHistory.findMany({
        where: { purchaseRequest: { tenantId } },
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
    const membersData = teamMembers.map(m => ({
      id: m.id,
      name: m.name || '',
      email: m.email,
      role: m.role,
      isEmployee: m.isEmployee ? 'Yes' : 'No',
      isOnWps: m.isOnWps ? 'Yes' : 'No',
      employeeCode: m.employeeCode || '',
      designation: m.designation || '',
      dateOfJoining: m.dateOfJoining ? formatDateForCSV(m.dateOfJoining) : '',
      createdAt: formatDateForCSV(m.createdAt),
      updatedAt: formatDateForCSV(m.updatedAt),
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
      assignedMemberId: a.assignedMemberId || '',
      assignedMember: a.assignedMember ? (a.assignedMember.name || a.assignedMember.email) : '',
      status: a.status,
      location: a.location?.name || '',
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
      assignedMemberId: s.assignedMemberId || '',
      assignedMember: s.assignedMember ? (s.assignedMember.name || s.assignedMember.email) : '',
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
      fromMemberId: h.fromMemberId || '',
      fromMemberName: h.fromMember ? (h.fromMember.name || h.fromMember.email) : '',
      toMemberId: h.toMemberId || '',
      toMemberName: h.toMember ? (h.toMember.name || h.toMember.email) : '',
      performedById: h.performedById || '',
      performerName: h.performedBy ? (h.performedBy.name || h.performedBy.email) : '',
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
      oldMemberId: h.oldMemberId || '',
      oldMemberName: h.oldMember ? (h.oldMember.name || h.oldMember.email) : '',
      newMemberId: h.newMemberId || '',
      newMemberName: h.newMember ? (h.newMember.name || h.newMember.email) : '',
      assignmentDate: formatDateForCSV(h.assignmentDate),
      reactivationDate: formatDateForCSV(h.reactivationDate),
      notes: h.notes || '',
      performedById: h.performedById || '',
      performerName: h.performedBy ? (h.performedBy.name || h.performedBy.email) : '',
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
      actorMemberId: l.actorMemberId || '',
      actorName: l.actorMember ? (l.actorMember.name || l.actorMember.email) : 'System',
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

    // Profile Change Requests
    const profileChangeRequestsData = profileChangeRequests.map(r => ({
      id: r.id,
      memberId: r.memberId,
      memberName: r.member ? (r.member.name || r.member.email) : '',
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
      version: '5.0',
      totalTeamMembers: teamMembers.length,
      totalAssets: assets.length,
      totalSubscriptions: subscriptions.length,
      totalSuppliers: suppliers.length,
      totalAssetHistory: assetHistory.length,
      totalSubscriptionHistory: subscriptionHistory.length,
      totalSupplierEngagements: supplierEngagements.length,
      totalActivityLogs: activityLogs.length,
      totalMaintenanceRecords: maintenanceRecords.length,
      totalProfileChangeRequests: profileChangeRequests.length,
      // Purchase Requests
      totalPurchaseRequests: purchaseRequests.length,
      totalPurchaseRequestItems: purchaseRequestItems.length,
      totalPurchaseRequestHistory: purchaseRequestHistory.length,
    }];

    // Create Excel file with multiple sheets - ALL data included
    const sheets = [
      { name: 'Metadata', data: metadataData, headers: Object.keys(metadataData[0]).map(key => ({ key, header: key })) },
      { name: 'Team Members', data: membersData, headers: Object.keys(membersData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Assets', data: assetsData, headers: Object.keys(assetsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Subscriptions', data: subscriptionsData, headers: Object.keys(subscriptionsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Suppliers', data: suppliersData, headers: Object.keys(suppliersData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Asset History', data: assetHistoryData, headers: Object.keys(assetHistoryData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Sub History', data: subscriptionHistoryData, headers: Object.keys(subscriptionHistoryData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Supplier Engagements', data: supplierEngagementsData, headers: Object.keys(supplierEngagementsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Activity Logs', data: activityLogsData, headers: Object.keys(activityLogsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Maintenance', data: maintenanceRecordsData, headers: Object.keys(maintenanceRecordsData[0] || {}).map(key => ({ key, header: key })) },
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
