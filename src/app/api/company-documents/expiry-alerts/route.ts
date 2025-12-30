import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { getDocumentExpiryInfo, DOCUMENT_EXPIRY_WARNING_DAYS } from '@/lib/domains/system/company-documents/document-utils';

// GET /api/company-documents/expiry-alerts - Get documents expiring soon or expired
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + DOCUMENT_EXPIRY_WARNING_DAYS);

  // Get documents expiring within warning period or already expired (within tenant)
  const documents = await prisma.companyDocument.findMany({
    where: {
      tenantId,
      expiryDate: { lte: warningDate },
    },
    orderBy: { expiryDate: 'asc' },
    include: {
      documentType: true,
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
      documentType: doc.documentType.name,
      documentTypeCategory: doc.documentType.category,
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
