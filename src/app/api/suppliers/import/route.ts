/**
 * @file route.ts
 * @description Import suppliers from CSV file
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { csvToArray } from '@/lib/core/import-export';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { SupplierStatus, Prisma } from '@prisma/client';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

interface ImportRow {
  [key: string]: string | undefined;
}

async function importSuppliersHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId || !tenant?.userId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;
    const { tenantId, userId } = tenant;

    // Get file from request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const duplicateStrategy = (formData.get('duplicateStrategy') as string) || 'skip';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse CSV
    const rows = await csvToArray<ImportRow>(buffer);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 });
    }

    const results: {
      success: number;
      updated: number;
      skipped: number;
      failed: number;
      errors: { row: number; error: string; data: unknown }[];
      created: { name: string; category: string; suppCode: string | null }[];
    } = {
      success: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      created: [],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because Excel starts at 1 and we have headers

      try {
        // Helper function to get value from row with flexible column names
        const getRowValue = (possibleNames: string[]): string | undefined => {
          for (const name of possibleNames) {
            const value = row[name];
            if (value && value.trim()) return value.trim();
          }
          return undefined;
        };

        // Extract values
        const id = getRowValue(['ID', 'id']);
        const suppCode = getRowValue(['Supplier Code', 'suppCode', 'SUPP Code', 'Code']);
        const name = getRowValue(['Name', 'name', 'Supplier Name', 'Company Name']);
        const category = getRowValue(['Category', 'category', 'Material Category']);
        const address = getRowValue(['Address', 'address']);
        const city = getRowValue(['City', 'city']);
        const country = getRowValue(['Country', 'country']);
        const website = getRowValue(['Website', 'website', 'Website URL']);
        const establishmentYearStr = getRowValue(['Establishment Year', 'establishmentYear', 'Year']);
        const primaryContactName = getRowValue(['Primary Contact Name', 'primaryContactName', 'Contact Name']);
        const primaryContactTitle = getRowValue(['Primary Contact Title', 'primaryContactTitle', 'Contact Title']);
        const primaryContactEmail = getRowValue(['Primary Contact Email', 'primaryContactEmail', 'Contact Email']);
        const primaryContactMobile = getRowValue(['Primary Contact Mobile', 'primaryContactMobile', 'Contact Mobile', 'Contact Phone']);
        const secondaryContactName = getRowValue(['Secondary Contact Name', 'secondaryContactName']);
        const secondaryContactTitle = getRowValue(['Secondary Contact Title', 'secondaryContactTitle']);
        const secondaryContactEmail = getRowValue(['Secondary Contact Email', 'secondaryContactEmail']);
        const secondaryContactMobile = getRowValue(['Secondary Contact Mobile', 'secondaryContactMobile']);
        const paymentTerms = getRowValue(['Payment Terms', 'paymentTerms', 'Terms']);
        const additionalInfo = getRowValue(['Additional Info', 'additionalInfo', 'Additional Information', 'Notes']);
        const statusStr = getRowValue(['Status', 'status']);

        // Validate required fields
        if (!name || !category) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required fields: Name and Category are required',
            data: row,
          });
          results.failed++;
          continue;
        }

        // Parse establishment year
        let establishmentYear: number | null = null;
        if (establishmentYearStr) {
          const year = parseInt(establishmentYearStr);
          if (!isNaN(year) && year >= 1800 && year <= new Date().getFullYear()) {
            establishmentYear = year;
          }
        }

        // Parse status
        let status: SupplierStatus = SupplierStatus.PENDING;
        if (statusStr) {
          const statusUpper = statusStr.toUpperCase();
          if (Object.values(SupplierStatus).includes(statusUpper as SupplierStatus)) {
            status = statusUpper as SupplierStatus;
          }
        }

        // Supplier data object for both create and update operations
        const supplierData: Record<string, unknown> = {
          suppCode: suppCode || null,
          name,
          category,
          address: address || null,
          city: city || null,
          country: country || null,
          website: website || null,
          establishmentYear,
          primaryContactName: primaryContactName || null,
          primaryContactTitle: primaryContactTitle || null,
          primaryContactEmail: primaryContactEmail || null,
          primaryContactMobile: primaryContactMobile || null,
          secondaryContactName: secondaryContactName || null,
          secondaryContactTitle: secondaryContactTitle || null,
          secondaryContactEmail: secondaryContactEmail || null,
          secondaryContactMobile: secondaryContactMobile || null,
          paymentTerms: paymentTerms || null,
          additionalInfo: additionalInfo || null,
          status,
          approvedById: status === SupplierStatus.APPROVED ? userId : null,
          approvedAt: status === SupplierStatus.APPROVED ? new Date() : null,
        };

        // If ID is provided, use upsert to preserve relationships
        if (id) {
          // Check if supplier with this ID exists - tenant filtering handled automatically
          const existingById = await db.supplier.findFirst({
            where: { id },
          });

          // Use upsert with ID to preserve relationships - tenant filtering handled automatically
          const supplier = await db.supplier.upsert({
            where: { id },
            create: {
              id,
              ...supplierData,
            } as Prisma.SupplierUncheckedCreateInput,
            update: supplierData as Prisma.SupplierUncheckedUpdateInput,
          });

          // Log activity
          await logAction(
            tenantId,
            userId,
            existingById ? ActivityActions.SUPPLIER_UPDATED : ActivityActions.SUPPLIER_CREATED,
            'Supplier',
            supplier.id,
            { name: supplier.name, category: supplier.category, source: 'CSV Import' }
          );

          if (existingById) {
            results.updated++;
          } else {
            results.created.push({
              name: supplier.name,
              category: supplier.category,
              suppCode: supplier.suppCode,
            });
            results.success++;
          }
          continue;
        }

        // No ID provided - check for duplicate by suppCode or name - tenant filtering handled automatically
        let existingSupplier = null;
        if (suppCode) {
          existingSupplier = await db.supplier.findFirst({
            where: { suppCode },
          });
        }

        if (!existingSupplier) {
          // Check by name (case-insensitive) - tenant filtering handled automatically
          const suppliers = await db.supplier.findMany({
            where: {
              name: {
                equals: name,
                mode: 'insensitive',
              },
            },
          });
          existingSupplier = suppliers[0] || null;
        }

        if (existingSupplier) {
          if (duplicateStrategy === 'skip') {
            results.skipped++;
            continue;
          } else if (duplicateStrategy === 'update') {
            // Update existing supplier - tenant filtering handled automatically
            await db.supplier.update({
              where: { id: existingSupplier.id },
              data: supplierData,
            });

            await logAction(
              tenantId,
              userId,
              ActivityActions.SUPPLIER_UPDATED,
              'Supplier',
              existingSupplier.id,
              { name, category, source: 'CSV Import' }
            );

            results.updated++;
            continue;
          }
        }

        // Create new supplier - tenantId auto-injected by tenant-scoped prisma
        const supplier = await db.supplier.create({
          data: supplierData as Prisma.SupplierUncheckedCreateInput,
        });

        // Log activity
        await logAction(
          tenantId,
          userId,
          'SUPPLIER_CREATED',
          'Supplier',
          supplier.id,
          { name: supplier.name, category: supplier.category, source: 'CSV Import' }
        );

        results.created.push({
          name: supplier.name,
          category: supplier.category,
          suppCode: supplier.suppCode,
        });
        results.success++;
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row,
        });
        results.failed++;
      }
    }

    return NextResponse.json(
      {
        message: `Import completed: ${results.success} created, ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`,
        results,
      },
      { status: 200 }
    );
}

export const POST = withErrorHandler(importSuppliersHandler, { requireAdmin: true, requireModule: 'suppliers' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
