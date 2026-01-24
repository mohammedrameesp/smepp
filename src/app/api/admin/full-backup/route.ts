import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import ExcelJS from 'exceljs';
import { withErrorHandler } from '@/lib/http/handler';

export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;

    // Helper to safely query tables that might not exist
    const safeQuery = async <T>(query: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await query;
      } catch {
        return fallback;
      }
    };

    // Fetch all data from all tables (tenant-scoped)
    const [
      teamMembers,
      assets,
      assetHistory,
      maintenanceRecords,
      subscriptions,
      subscriptionHistory,
      activityLogs,
      suppliers,
      supplierEngagements,
      profileChangeRequests,
      purchaseRequests,
      purchaseRequestItems,
    ] = await Promise.all([
      prisma.teamMember.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
          isEmployee: true,
          isOnWps: true,
          employeeCode: true,
          designation: true,
          dateOfJoining: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.asset.findMany({
        where: { tenantId },
        include: {
          assignedMember: { select: { email: true, name: true } },
          assetCategory: { select: { name: true } },
        },
      }),
      prisma.assetHistory.findMany({
        where: { asset: { tenantId } },
        include: {
          asset: { select: { assetTag: true, model: true } },
          fromMember: { select: { email: true, name: true } },
          toMember: { select: { email: true, name: true } },
          performedBy: { select: { email: true, name: true } },
        },
      }),
      prisma.maintenanceRecord.findMany({
        where: { tenantId },
        include: {
          asset: { select: { assetTag: true, model: true } },
          performedBy: { select: { name: true, email: true } },
        },
      }),
      prisma.subscription.findMany({
        where: { tenantId },
        include: {
          assignedMember: { select: { email: true, name: true } },
        },
      }),
      prisma.subscriptionHistory.findMany({
        where: { subscription: { tenantId } },
        include: {
          subscription: { select: { serviceName: true } },
          oldMember: { select: { email: true, name: true } },
          newMember: { select: { email: true, name: true } },
          performedBy: { select: { email: true, name: true } },
        },
      }),
      prisma.activityLog.findMany({
        where: { tenantId },
        include: {
          actorMember: { select: { email: true, name: true } },
        },
      }),
      prisma.supplier.findMany({ where: { tenantId } }),
      prisma.supplierEngagement.findMany({
        where: { tenantId },
        include: {
          supplier: { select: { name: true } },
        },
      }),
      safeQuery(prisma.profileChangeRequest.findMany({
        where: { tenantId },
        include: {
          member: { select: { email: true, name: true } },
        },
      }), []),
      safeQuery(prisma.purchaseRequest.findMany({
        where: { tenantId },
        include: {
          requester: { select: { email: true, name: true } },
        },
      }), []),
      safeQuery(prisma.purchaseRequestItem.findMany({
        where: { purchaseRequest: { tenantId } },
        include: {
          purchaseRequest: { select: { referenceNumber: true } },
        },
      }), []),
    ]);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Asset Management System';
    workbook.created = new Date();

    // Helper to format dates consistently
    const formatDate = (date: Date | null | undefined): string => {
      if (!date) return '';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // 1. Team Members Sheet
    const membersSheet = workbook.addWorksheet('Team Members');
    membersSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Is Employee', key: 'isEmployee', width: 15 },
      { header: 'Is On WPS', key: 'isOnWps', width: 15 },
      { header: 'Employee Code', key: 'employeeCode', width: 20 },
      { header: 'Designation', key: 'designation', width: 25 },
      { header: 'Date of Joining', key: 'dateOfJoining', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    teamMembers.forEach(member => {
      membersSheet.addRow({
        id: member.id,
        name: member.name || '',
        email: member.email,
        role: member.isAdmin ? 'ADMIN' : 'MEMBER',
        isEmployee: member.isEmployee ? 'Yes' : 'No',
        isOnWps: member.isOnWps ? 'Yes' : 'No',
        employeeCode: member.employeeCode || '',
        designation: member.designation || '',
        dateOfJoining: formatDate(member.dateOfJoining),
        createdAt: formatDate(member.createdAt),
        updatedAt: formatDate(member.updatedAt),
      });
    });

    // 2. Assets Sheet
    const assetsSheet = workbook.addWorksheet('Assets');
    assetsSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Asset Tag', key: 'assetTag', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Model', key: 'model', width: 25 },
      { header: 'Serial', key: 'serial', width: 25 },
      { header: 'Configuration', key: 'configuration', width: 30 },
      { header: 'Purchase Date', key: 'purchaseDate', width: 20 },
      { header: 'Warranty Expiry', key: 'warrantyExpiry', width: 20 },
      { header: 'Supplier', key: 'supplier', width: 25 },
      { header: 'Invoice Number', key: 'invoiceNumber', width: 25 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Price Currency', key: 'priceCurrency', width: 15 },
      { header: 'Price USD', key: 'priceQAR', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Assigned Member ID', key: 'assignedMemberId', width: 30 },
      { header: 'Assigned Member Email', key: 'assignedMemberEmail', width: 30 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    assets.forEach(asset => {
      assetsSheet.addRow({
        id: asset.id,
        assetTag: asset.assetTag || '',
        type: asset.type,
        category: asset.assetCategory?.name || '',
        brand: asset.brand || '',
        model: asset.model,
        serial: asset.serial || '',
        configuration: asset.configuration || '',
        purchaseDate: formatDate(asset.purchaseDate),
        warrantyExpiry: formatDate(asset.warrantyExpiry),
        supplier: asset.supplier || '',
        invoiceNumber: asset.invoiceNumber || '',
        price: asset.price ? Number(asset.price) : '',
        priceCurrency: asset.priceCurrency || '',
        priceQAR: asset.priceQAR ? Number(asset.priceQAR) : '',
        status: asset.status,
        assignedMemberId: asset.assignedMemberId || '',
        assignedMemberEmail: asset.assignedMember?.email || '',
        notes: asset.notes || '',
        createdAt: formatDate(asset.createdAt),
        updatedAt: formatDate(asset.updatedAt),
      });
    });

    // 3. Asset History Sheet
    const assetHistorySheet = workbook.addWorksheet('Asset History');
    assetHistorySheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Asset ID', key: 'assetId', width: 30 },
      { header: 'Asset Tag', key: 'assetTag', width: 20 },
      { header: 'Action', key: 'action', width: 20 },
      { header: 'From Member ID', key: 'fromMemberId', width: 30 },
      { header: 'From Member Email', key: 'fromMemberEmail', width: 30 },
      { header: 'To Member ID', key: 'toMemberId', width: 30 },
      { header: 'To Member Email', key: 'toMemberEmail', width: 30 },
      { header: 'From Status', key: 'fromStatus', width: 15 },
      { header: 'To Status', key: 'toStatus', width: 15 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Performed By ID', key: 'performedById', width: 30 },
      { header: 'Performer Email', key: 'performerEmail', width: 30 },
      { header: 'Assignment Date', key: 'assignmentDate', width: 20 },
      { header: 'Return Date', key: 'returnDate', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];
    assetHistory.forEach(history => {
      assetHistorySheet.addRow({
        id: history.id,
        assetId: history.assetId,
        assetTag: history.asset.assetTag || '',
        action: history.action,
        fromMemberId: history.fromMemberId || '',
        fromMemberEmail: history.fromMember?.email || '',
        toMemberId: history.toMemberId || '',
        toMemberEmail: history.toMember?.email || '',
        fromStatus: history.fromStatus || '',
        toStatus: history.toStatus || '',
        notes: history.notes || '',
        performedById: history.performedById || '',
        performerEmail: history.performedBy?.email || '',
        assignmentDate: formatDate(history.assignmentDate),
        returnDate: formatDate(history.returnDate),
        createdAt: formatDate(history.createdAt),
      });
    });

    // 4. Maintenance Records Sheet
    const maintenanceSheet = workbook.addWorksheet('Maintenance Records');
    maintenanceSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Asset ID', key: 'assetId', width: 30 },
      { header: 'Asset Tag', key: 'assetTag', width: 20 },
      { header: 'Maintenance Date', key: 'maintenanceDate', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Performed By', key: 'performedBy', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    maintenanceRecords.forEach(record => {
      maintenanceSheet.addRow({
        id: record.id,
        assetId: record.assetId,
        assetTag: record.asset.assetTag || '',
        maintenanceDate: formatDate(record.maintenanceDate),
        notes: record.notes || '',
        performedBy: record.performedBy?.name || '',
        createdAt: formatDate(record.createdAt),
        updatedAt: formatDate(record.updatedAt),
      });
    });

    // 5. Subscriptions Sheet
    const subscriptionsSheet = workbook.addWorksheet('Subscriptions');
    subscriptionsSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Service Name', key: 'serviceName', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Account ID', key: 'accountId', width: 25 },
      { header: 'Purchase Date', key: 'purchaseDate', width: 20 },
      { header: 'Renewal Date', key: 'renewalDate', width: 20 },
      { header: 'Billing Cycle', key: 'billingCycle', width: 15 },
      { header: 'Cost Per Cycle', key: 'costPerCycle', width: 15 },
      { header: 'Cost Currency', key: 'costCurrency', width: 15 },
      { header: 'Cost USD', key: 'costQAR', width: 15 },
      { header: 'Vendor', key: 'vendor', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Assigned Member ID', key: 'assignedMemberId', width: 30 },
      { header: 'Assigned Member Email', key: 'assignedMemberEmail', width: 30 },
      { header: 'Auto Renew', key: 'autoRenew', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 25 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Last Active Renewal Date', key: 'lastActiveRenewalDate', width: 25 },
      { header: 'Cancelled At', key: 'cancelledAt', width: 20 },
      { header: 'Reactivated At', key: 'reactivatedAt', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    subscriptions.forEach(subscription => {
      subscriptionsSheet.addRow({
        id: subscription.id,
        serviceName: subscription.serviceName,
        category: subscription.category || '',
        accountId: subscription.accountId || '',
        purchaseDate: formatDate(subscription.purchaseDate),
        renewalDate: formatDate(subscription.renewalDate),
        billingCycle: subscription.billingCycle,
        costPerCycle: subscription.costPerCycle ? Number(subscription.costPerCycle) : '',
        costCurrency: subscription.costCurrency || '',
        costQAR: subscription.costQAR ? Number(subscription.costQAR) : '',
        vendor: subscription.vendor || '',
        status: subscription.status,
        assignedMemberId: subscription.assignedMemberId || '',
        assignedMemberEmail: subscription.assignedMember?.email || '',
        autoRenew: subscription.autoRenew ? 'Yes' : 'No',
        paymentMethod: subscription.paymentMethod || '',
        notes: subscription.notes || '',
        lastActiveRenewalDate: formatDate(subscription.lastActiveRenewalDate),
        cancelledAt: formatDate(subscription.cancelledAt),
        reactivatedAt: formatDate(subscription.reactivatedAt),
        createdAt: formatDate(subscription.createdAt),
        updatedAt: formatDate(subscription.updatedAt),
      });
    });

    // 6. Subscription History Sheet
    const subscriptionHistorySheet = workbook.addWorksheet('Subscription History');
    subscriptionHistorySheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Subscription ID', key: 'subscriptionId', width: 30 },
      { header: 'Service Name', key: 'serviceName', width: 30 },
      { header: 'Action', key: 'action', width: 20 },
      { header: 'Old Status', key: 'oldStatus', width: 15 },
      { header: 'New Status', key: 'newStatus', width: 15 },
      { header: 'Old Renewal Date', key: 'oldRenewalDate', width: 20 },
      { header: 'New Renewal Date', key: 'newRenewalDate', width: 20 },
      { header: 'Assignment Date', key: 'assignmentDate', width: 20 },
      { header: 'Reactivation Date', key: 'reactivationDate', width: 20 },
      { header: 'Old Member ID', key: 'oldMemberId', width: 30 },
      { header: 'Old Member Email', key: 'oldMemberEmail', width: 30 },
      { header: 'New Member ID', key: 'newMemberId', width: 30 },
      { header: 'New Member Email', key: 'newMemberEmail', width: 30 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Performed By ID', key: 'performedById', width: 30 },
      { header: 'Performer Email', key: 'performerEmail', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];
    subscriptionHistory.forEach(history => {
      subscriptionHistorySheet.addRow({
        id: history.id,
        subscriptionId: history.subscriptionId,
        serviceName: history.subscription.serviceName,
        action: history.action,
        oldStatus: history.oldStatus || '',
        newStatus: history.newStatus || '',
        oldRenewalDate: formatDate(history.oldRenewalDate),
        newRenewalDate: formatDate(history.newRenewalDate),
        assignmentDate: formatDate(history.assignmentDate),
        reactivationDate: formatDate(history.reactivationDate),
        oldMemberId: history.oldMemberId || '',
        oldMemberEmail: history.oldMember?.email || '',
        newMemberId: history.newMemberId || '',
        newMemberEmail: history.newMember?.email || '',
        notes: history.notes || '',
        performedById: history.performedById || '',
        performerEmail: history.performedBy?.email || '',
        createdAt: formatDate(history.createdAt),
      });
    });

    // 7. Activity Logs Sheet
    const activityLogsSheet = workbook.addWorksheet('Activity Logs');
    activityLogsSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Actor ID', key: 'actorId', width: 30 },
      { header: 'Actor Email', key: 'actorEmail', width: 30 },
      { header: 'Action', key: 'action', width: 30 },
      { header: 'Entity Type', key: 'entityType', width: 20 },
      { header: 'Entity ID', key: 'entityId', width: 30 },
      { header: 'Payload', key: 'payload', width: 50 },
      { header: 'At', key: 'at', width: 20 },
    ];
    activityLogs.forEach(log => {
      activityLogsSheet.addRow({
        id: log.id,
        actorId: log.actorMemberId || '',
        actorEmail: log.actorMember?.email || '',
        action: log.action,
        entityType: log.entityType || '',
        entityId: log.entityId || '',
        payload: log.payload ? JSON.stringify(log.payload) : '',
        at: formatDate(log.at),
      });
    });

    // 8. Suppliers Sheet
    const suppliersSheet = workbook.addWorksheet('Suppliers');
    suppliersSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Supplier Code', key: 'suppCode', width: 20 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Country', key: 'country', width: 20 },
      { header: 'Website', key: 'website', width: 30 },
      { header: 'Primary Contact Name', key: 'primaryContactName', width: 25 },
      { header: 'Primary Contact Email', key: 'primaryContactEmail', width: 30 },
      { header: 'Primary Contact Mobile', key: 'primaryContactMobile', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Approved At', key: 'approvedAt', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    suppliers.forEach(supplier => {
      suppliersSheet.addRow({
        id: supplier.id,
        suppCode: supplier.suppCode || '',
        name: supplier.name,
        category: supplier.category || '',
        address: supplier.address || '',
        city: supplier.city || '',
        country: supplier.country || '',
        website: supplier.website || '',
        primaryContactName: supplier.primaryContactName || '',
        primaryContactEmail: supplier.primaryContactEmail || '',
        primaryContactMobile: supplier.primaryContactMobile || '',
        status: supplier.status,
        approvedAt: formatDate(supplier.approvedAt),
        createdAt: formatDate(supplier.createdAt),
        updatedAt: formatDate(supplier.updatedAt),
      });
    });

    // 9. Supplier Engagements Sheet
    const supplierEngagementsSheet = workbook.addWorksheet('Supplier Engagements');
    supplierEngagementsSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Supplier ID', key: 'supplierId', width: 30 },
      { header: 'Supplier Name', key: 'supplierName', width: 30 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Notes', key: 'notes', width: 50 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Created By ID', key: 'createdById', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];
    supplierEngagements.forEach(engagement => {
      supplierEngagementsSheet.addRow({
        id: engagement.id,
        supplierId: engagement.supplierId,
        supplierName: engagement.supplier?.name || '',
        date: formatDate(engagement.date),
        notes: engagement.notes || '',
        rating: engagement.rating || '',
        createdById: engagement.createdById,
        createdAt: formatDate(engagement.createdAt),
      });
    });

    // 10. Profile Change Requests Sheet
    const changeRequestsSheet = workbook.addWorksheet('Profile Change Requests');
    changeRequestsSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Member ID', key: 'memberId', width: 30 },
      { header: 'Member Email', key: 'memberEmail', width: 30 },
      { header: 'Member Name', key: 'memberName', width: 25 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Resolved By ID', key: 'resolvedById', width: 30 },
      { header: 'Resolver Notes', key: 'resolverNotes', width: 40 },
      { header: 'Resolved At', key: 'resolvedAt', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    profileChangeRequests.forEach(request => {
      changeRequestsSheet.addRow({
        id: request.id,
        memberId: request.memberId,
        memberEmail: request.member?.email || '',
        memberName: request.member?.name || '',
        description: request.description || '',
        status: request.status,
        resolvedById: request.resolvedById || '',
        resolverNotes: request.resolverNotes || '',
        resolvedAt: formatDate(request.resolvedAt),
        createdAt: formatDate(request.createdAt),
        updatedAt: formatDate(request.updatedAt),
      });
    });

    // 12. Purchase Requests Sheet
    const purchaseRequestsSheet = workbook.addWorksheet('Purchase Requests');
    purchaseRequestsSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Reference Number', key: 'referenceNumber', width: 20 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Requester ID', key: 'requesterId', width: 30 },
      { header: 'Requester Email', key: 'requesterEmail', width: 30 },
      { header: 'Request Date', key: 'requestDate', width: 20 },
      { header: 'Purchase Type', key: 'purchaseType', width: 20 },
      { header: 'Cost Type', key: 'costType', width: 20 },
      { header: 'Project Name', key: 'projectName', width: 25 },
      { header: 'Priority', key: 'priority', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Vendor Name', key: 'vendorName', width: 25 },
      { header: 'Payment Mode', key: 'paymentMode', width: 20 },
      { header: 'Needed By Date', key: 'neededByDate', width: 20 },
      { header: 'Justification', key: 'justification', width: 40 },
      { header: 'Reviewed By ID', key: 'reviewedById', width: 30 },
      { header: 'Reviewed At', key: 'reviewedAt', width: 20 },
      { header: 'Review Notes', key: 'reviewNotes', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    purchaseRequests.forEach(pr => {
      purchaseRequestsSheet.addRow({
        id: pr.id,
        referenceNumber: pr.referenceNumber,
        title: pr.title,
        description: pr.description || '',
        requesterId: pr.requesterId,
        requesterEmail: pr.requester?.email || '',
        requestDate: formatDate(pr.requestDate),
        purchaseType: pr.purchaseType || '',
        costType: pr.costType || '',
        projectName: pr.projectName || '',
        priority: pr.priority,
        status: pr.status,
        currency: pr.currency,
        totalAmount: pr.totalAmount ? Number(pr.totalAmount) : '',
        vendorName: pr.vendorName || '',
        paymentMode: pr.paymentMode || '',
        neededByDate: formatDate(pr.neededByDate),
        justification: pr.justification || '',
        reviewedById: pr.reviewedById || '',
        reviewedAt: formatDate(pr.reviewedAt),
        reviewNotes: pr.reviewNotes || '',
        createdAt: formatDate(pr.createdAt),
        updatedAt: formatDate(pr.updatedAt),
      });
    });

    // 13. Purchase Request Items Sheet
    const purchaseRequestItemsSheet = workbook.addWorksheet('Purchase Request Items');
    purchaseRequestItemsSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Purchase Request ID', key: 'purchaseRequestId', width: 30 },
      { header: 'Reference Number', key: 'referenceNumber', width: 20 },
      { header: 'Item Number', key: 'itemNumber', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Unit Price', key: 'unitPrice', width: 15 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Total Price', key: 'totalPrice', width: 15 },
      { header: 'Billing Cycle', key: 'billingCycle', width: 15 },
      { header: 'Duration Months', key: 'durationMonths', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Supplier', key: 'supplier', width: 25 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    purchaseRequestItems.forEach(item => {
      purchaseRequestItemsSheet.addRow({
        id: item.id,
        purchaseRequestId: item.purchaseRequestId,
        referenceNumber: item.purchaseRequest?.referenceNumber || '',
        itemNumber: item.itemNumber,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : '',
        currency: item.currency || '',
        totalPrice: item.totalPrice ? Number(item.totalPrice) : '',
        billingCycle: item.billingCycle || '',
        durationMonths: item.durationMonths || '',
        category: item.category || '',
        supplier: item.supplier || '',
        notes: item.notes || '',
        createdAt: formatDate(item.createdAt),
        updatedAt: formatDate(item.updatedAt),
      });
    });

    // Style header rows
    [
      membersSheet,
      assetsSheet,
      assetHistorySheet,
      maintenanceSheet,
      subscriptionsSheet,
      subscriptionHistorySheet,
      activityLogsSheet,
      suppliersSheet,
      supplierEngagementsSheet,
      changeRequestsSheet,
      purchaseRequestsSheet,
      purchaseRequestItemsSheet,
    ].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return file
    const filename = `full_backup_${new Date().toISOString().split('T')[0]}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}, { requireAuth: true, requireAdmin: true });
