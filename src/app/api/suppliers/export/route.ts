import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all suppliers with related data
    const suppliers = await prisma.supplier.findMany({
      include: {
        engagements: true,
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert to CSV
    const headers = [
      'ID',
      'Supplier Code',
      'Company Name',
      'Category',
      'Address',
      'City',
      'Country',
      'Website',
      'Establishment Year',
      'Primary Contact Name',
      'Primary Contact Title',
      'Primary Contact Email',
      'Primary Contact Mobile',
      'Secondary Contact Name',
      'Secondary Contact Title',
      'Secondary Contact Email',
      'Secondary Contact Mobile',
      'Payment Terms',
      'Status',
      'Total Engagements',
      'Approved By',
      'Approved At',
      'Created At',
    ];

    const rows = suppliers.map(supplier => [
      supplier.id,
      supplier.suppCode || '',
      supplier.name,
      supplier.category,
      supplier.address || '',
      supplier.city || '',
      supplier.country || '',
      supplier.website || '',
      supplier.establishmentYear || '',
      supplier.primaryContactName || '',
      supplier.primaryContactTitle || '',
      supplier.primaryContactEmail || '',
      supplier.primaryContactMobile || '',
      supplier.secondaryContactName || '',
      supplier.secondaryContactTitle || '',
      supplier.secondaryContactEmail || '',
      supplier.secondaryContactMobile || '',
      supplier.paymentTerms || '',
      supplier.status,
      supplier.engagements.length,
      supplier.approvedBy ? (supplier.approvedBy.name || supplier.approvedBy.email) : '',
      supplier.approvedAt ? new Date(supplier.approvedAt).toISOString() : '',
      new Date(supplier.createdAt).toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell);
        // Escape quotes and wrap in quotes if contains comma or quote
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="suppliers_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Suppliers export error:', error);
    return NextResponse.json(
      { error: 'Failed to export suppliers' },
      { status: 500 }
    );
  }
}
