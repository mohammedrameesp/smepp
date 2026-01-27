import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { getDocumentExpiryInfo, DOCUMENT_EXPIRY_WARNING_DAYS } from '@/features/company-documents';
import { getQatarStartOfDay } from '@/lib/core/datetime';

// GET /api/company-documents/expiry-alerts - Get documents expiring soon or expired
export const GET = withErrorHandler(async (_request: NextRequest, context: APIContext) => {
  const { tenant, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;

  const tenantId = tenant.tenantId;
  const today = getQatarStartOfDay();
  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + DOCUMENT_EXPIRY_WARNING_DAYS);

  // Get documents expiring within warning period or already expired (within tenant)
  const documents = await db.companyDocument.findMany({
    where: {
      tenantId,
      expiryDate: { lte: warningDate },
    },
    orderBy: { expiryDate: 'asc' },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          model: true,
          brand: true,
        },
      },
    },
  });

  // Add expiry info to each document
  const alerts = documents.map(doc => {
    const expiryInfo = getDocumentExpiryInfo(doc.expiryDate);
    return {
      id: doc.id,
      documentType: doc.documentTypeName,
      referenceNumber: doc.referenceNumber,
      expiryDate: doc.expiryDate.toISOString(),
      status: expiryInfo.status,
      daysRemaining: expiryInfo.daysRemaining,
      asset: doc.asset,
      issuedBy: doc.issuedBy,
    };
  });

  // Separate expired and expiring
  const expired = alerts.filter(a => a.status === 'expired');
  const expiring = alerts.filter(a => a.status === 'expiring');

  return NextResponse.json({
    alerts,
    summary: {
      total: alerts.length,
      expired: expired.length,
      expiring: expiring.length,
    },
  });
}, { requireAuth: true, requireModule: 'documents' });
