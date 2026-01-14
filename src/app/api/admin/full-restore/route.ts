import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { AssetStatus, BillingCycle, SubscriptionStatus, Role, Prisma } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import ExcelJS from 'exceljs';
import logger from '@/lib/core/log';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Load workbook
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);

    const results = {
      users: { created: 0, updated: 0, errors: 0 },
      assets: { created: 0, updated: 0, errors: 0 },
      subscriptions: { created: 0, updated: 0, errors: 0 },
      assetHistory: { created: 0, errors: 0 },
      maintenanceRecords: { created: 0, errors: 0 },
      subscriptionHistory: { created: 0, errors: 0 },
      errors: [] as string[],
    };

    // Helper to parse dates in dd/mm/yyyy format
    const parseDate = (dateStr: string | undefined): Date | null => {
      if (!dateStr || dateStr === '') return null;
      try {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          return new Date(year, month, day);
        }
        return null;
      } catch {
        return null;
      }
    };

    // 1. Import Users (match by email)
    const usersSheet = workbook.getWorksheet('Users');
    if (usersSheet) {
      const userIdMap = new Map<string, string>(); // old ID -> new ID

      usersSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        try {
          const oldId = row.getCell(1).value?.toString() || '';
          const email = row.getCell(3).value?.toString() || '';

          if (!email) return;

          // Skip auth-related accounts to prevent conflicts
          if (email.includes('next-auth')) return;

          const userData = {
            name: row.getCell(2).value?.toString() || null,
            email: email,
            role: (row.getCell(6).value?.toString() || 'EMPLOYEE') as Role,
            isTemporaryStaff: row.getCell(7).value?.toString() === 'Yes',
            isSystemAccount: row.getCell(8).value?.toString() === 'Yes',
          };

          // Try to find existing user by email
          prisma.user.upsert({
            where: { email: userData.email },
            update: userData,
            create: userData,
          }).then(user => {
            userIdMap.set(oldId, user.id);
            results.users.updated++;
          }).catch(() => {
            results.users.errors++;
          });

        } catch (error) {
          results.users.errors++;
          results.errors.push(`User row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
    }

    // Wait for users to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Import Assets (match by assetTag if exists, otherwise create)
    const assetsSheet = workbook.getWorksheet('Assets');
    const assetIdMap = new Map<string, string>(); // old ID -> new ID

    if (assetsSheet) {
      for (let rowNumber = 2; rowNumber <= assetsSheet.rowCount; rowNumber++) {
        const row = assetsSheet.getRow(rowNumber);
        try {
          const oldId = row.getCell(1).value?.toString() || '';
          const assetTag = row.getCell(2).value?.toString() || null;
          const model = row.getCell(6).value?.toString() || '';

          if (!model) continue;

          // Map member ID by email - verify member belongs to same organization
          const userEmail = row.getCell(25).value?.toString() || '';
          let newUserId = null;
          if (userEmail) {
            const member = await prisma.teamMember.findFirst({
              where: {
                email: userEmail,
                tenantId,
                isDeleted: false,
              },
            });
            newUserId = member?.id || null;
          }

          // Dynamic asset data structure for both create and update operations
          const assetData: Record<string, unknown> = {
            type: row.getCell(3).value?.toString() || '',
            category: row.getCell(4).value?.toString() || null,
            brand: row.getCell(5).value?.toString() || null,
            model: model,
            serial: row.getCell(7).value?.toString() || null,
            configuration: row.getCell(8).value?.toString() || null,
            purchaseDate: parseDate(row.getCell(9).value?.toString()),
            warrantyExpiry: parseDate(row.getCell(10).value?.toString()),
            supplier: row.getCell(11).value?.toString() || null,
            invoiceNumber: row.getCell(12).value?.toString() || null,
            price: row.getCell(13).value ? parseFloat(row.getCell(13).value?.toString() || '0') : null,
            priceCurrency: row.getCell(14).value?.toString() || 'QAR',
            priceQAR: row.getCell(15).value ? parseFloat(row.getCell(15).value?.toString() || '0') : null,
            status: (row.getCell(16).value?.toString() || 'IN_USE') as AssetStatus,
            assignedMemberId: newUserId,
            notes: row.getCell(25).value?.toString() || null,
          };

          // Add assetTag if provided
          if (assetTag) {
            assetData.assetTag = assetTag;
          }

          let asset;
          if (assetTag) {
            // Try to find existing asset by tag within tenant
            const existing = await prisma.asset.findFirst({
              where: { assetTag: assetTag, tenantId },
            });

            if (existing) {
              asset = await prisma.asset.update({
                where: { id: existing.id },
                data: assetData as Prisma.AssetUpdateInput,
              });
            } else {
              asset = await prisma.asset.create({ data: { ...assetData, tenantId } as Prisma.AssetUncheckedCreateInput });
            }
            results.assets.updated++;
          } else {
            // Create new asset without tag
            asset = await prisma.asset.create({ data: { ...assetData, tenantId } as Prisma.AssetUncheckedCreateInput });
            results.assets.created++;
          }

          assetIdMap.set(oldId, asset.id);

        } catch (error) {
          results.assets.errors++;
          results.errors.push(`Asset row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // 4. Import Subscriptions (create all as new, update if duplicate serviceName)
    const subscriptionsSheet = workbook.getWorksheet('Subscriptions');
    const subscriptionIdMap = new Map<string, string>(); // old ID -> new ID

    if (subscriptionsSheet) {
      for (let rowNumber = 2; rowNumber <= subscriptionsSheet.rowCount; rowNumber++) {
        const row = subscriptionsSheet.getRow(rowNumber);
        try {
          const oldId = row.getCell(1).value?.toString() || '';
          const serviceName = row.getCell(2).value?.toString() || '';

          if (!serviceName) continue;

          // Map member ID by email - verify member belongs to same organization
          const userEmail = row.getCell(17).value?.toString() || '';
          let newUserId = null;
          if (userEmail) {
            const member = await prisma.teamMember.findFirst({
              where: {
                email: userEmail,
                tenantId,
                isDeleted: false,
              },
            });
            newUserId = member?.id || null;
          }

          // Dynamic subscription data structure for both create and update operations
          const subscriptionData: Record<string, unknown> = {
            serviceName: serviceName,
            category: row.getCell(3).value?.toString() || null,
            accountId: row.getCell(4).value?.toString() || null,
            purchaseDate: parseDate(row.getCell(5).value?.toString()),
            renewalDate: parseDate(row.getCell(6).value?.toString()),
            billingCycle: (row.getCell(7).value?.toString() || 'MONTHLY') as BillingCycle,
            costPerCycle: row.getCell(8).value ? parseFloat(row.getCell(8).value?.toString() || '0') : null,
            costCurrency: row.getCell(9).value?.toString() || 'QAR',
            costQAR: row.getCell(10).value ? parseFloat(row.getCell(10).value?.toString() || '0') : null,
            vendor: row.getCell(11).value?.toString() || null,
            status: (row.getCell(12).value?.toString() || 'ACTIVE') as SubscriptionStatus,
            assignedMemberId: newUserId,
            autoRenew: row.getCell(16).value?.toString() === 'Yes',
            paymentMethod: row.getCell(17).value?.toString() || null,
            notes: row.getCell(18).value?.toString() || null,
            lastActiveRenewalDate: parseDate(row.getCell(19).value?.toString()),
            cancelledAt: parseDate(row.getCell(20).value?.toString()),
            reactivatedAt: parseDate(row.getCell(21).value?.toString()),
          };

          // Try to find existing subscription by serviceName within tenant
          const existingSub = await prisma.subscription.findFirst({
            where: { serviceName: serviceName, tenantId },
          });

          let subscription;
          if (existingSub) {
            subscription = await prisma.subscription.update({
              where: { id: existingSub.id },
              data: subscriptionData as Prisma.SubscriptionUpdateInput,
            });
            results.subscriptions.updated++;
          } else {
            subscription = await prisma.subscription.create({ data: { ...subscriptionData, tenantId } as Prisma.SubscriptionUncheckedCreateInput });
            results.subscriptions.created++;
          }

          subscriptionIdMap.set(oldId, subscription.id);

        } catch (error) {
          results.subscriptions.errors++;
          results.errors.push(`Subscription row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database restore completed',
      results,
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Full restore error');
    return NextResponse.json(
      { error: 'Failed to restore database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
