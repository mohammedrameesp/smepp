import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { csvToArray } from '@/lib/csv-utils';
import { logAction, ActivityActions } from '@/lib/activity';
import { Role, SupplierStatus } from '@prisma/client';

interface ImportRow {
  [key: string]: string | undefined;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

        // Supplier data object
        const supplierData: any = {
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
          approvedById: status === SupplierStatus.APPROVED ? session.user.id : null,
          approvedAt: status === SupplierStatus.APPROVED ? new Date() : null,
        };

        // If ID is provided, use upsert to preserve relationships
        if (id) {
          // Check if supplier with this ID exists
          const existingById = await prisma.supplier.findUnique({
            where: { id },
          });

          // Use upsert with ID to preserve relationships
          const supplier = await prisma.supplier.upsert({
            where: { id },
            create: {
              id,
              ...supplierData,
            },
            update: supplierData,
          });

          // Log activity
          await logAction(
            session.user.id,
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

        // No ID provided - check for duplicate by suppCode or name
        let existingSupplier = null;
        if (suppCode) {
          existingSupplier = await prisma.supplier.findUnique({
            where: { suppCode },
          });
        }

        if (!existingSupplier) {
          // Check by name (case-insensitive)
          const suppliers = await prisma.supplier.findMany({
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
            // Update existing supplier
            await prisma.supplier.update({
              where: { id: existingSupplier.id },
              data: supplierData,
            });

            await logAction(
              session.user.id,
              ActivityActions.SUPPLIER_UPDATED,
              'Supplier',
              existingSupplier.id,
              { name, category, source: 'CSV Import' }
            );

            results.updated++;
            continue;
          }
        }

        // Create new supplier
        const supplier = await prisma.supplier.create({
          data: supplierData,
        });

        // Log activity
        await logAction(
          session.user.id,
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
  } catch (error) {
    console.error('Supplier import error:', error);
    return NextResponse.json(
      {
        error: 'Failed to import suppliers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
