import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { csvToArray } from '@/lib/csv-utils';
import { generateAssetTag } from '@/lib/asset-utils';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordAssetHistory } from '@/lib/asset-history';
import { AssetStatus } from '@prisma/client';

interface ImportRow {
  [key: string]: string | undefined;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    const tenantId = session.user.organizationId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
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
      created: { assetTag: string | null; name: string; type: string }[];
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

        // Extract values with flexible column name matching
        const id = getRowValue(['ID', 'id', 'Asset ID']);
        const assetTag = getRowValue(['Asset Tag', 'asset_tag', 'assetTag', 'Tag']);
        const type = getRowValue(['Asset Type', 'Type', 'type', 'asset_type']);
        const category = getRowValue(['Category', 'category', 'Category / Department', 'Department']);
        const model = getRowValue(['Model', 'model', 'Model / Version']);
        const brand = getRowValue(['Brand', 'brand', 'Brand / Manufacturer']);
        const serial = getRowValue(['Serial', 'serial', 'Serial Number']);
        const configuration = getRowValue(['Configuration', 'configuration', 'Configuration / Specs', 'Specs']);
        const location = getRowValue(['Location', 'location', 'Physical Location']);
        const purchaseDateStr = getRowValue(['Purchase Date', 'purchase_date', 'purchaseDate']);
        const warrantyExpiryStr = getRowValue(['Warranty Expiry', 'warranty_expiry', 'warrantyExpiry', 'Warranty']);
        const supplier = getRowValue(['Supplier', 'supplier', 'Supplier / Vendor', 'Vendor']);
        const assignedUserId = getRowValue(['Assigned User ID', 'assignedUserId', 'assigned_user_id']);
        const assignedUser = getRowValue(['Assigned User', 'assigned_user', 'Assigned To', 'User']);
        const assignmentDate = getRowValue(['Assignment Date', 'assignmentDate', 'assignment_date']);
        const statusStr = getRowValue(['Status', 'status']);
        const priceStr = getRowValue(['Price', 'price', 'Cost', 'Cost / Value']);
        const currencyStr = getRowValue(['Currency', 'currency']);
        const acquisitionTypeStr = getRowValue(['Acquisition Type', 'acquisition_type', 'acquisitionType']);

        // Validate required fields
        if (!type || !model) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required fields: Need at least Type and Model columns',
            data: row,
          });
          results.failed++;
          continue;
        }

        // Parse status
        let status: AssetStatus = AssetStatus.IN_USE;
        if (statusStr) {
          const statusInput = statusStr.toUpperCase().replace(/\s+/g, '_');
          if (['IN_USE', 'SPARE', 'REPAIR', 'DISPOSED'].includes(statusInput)) {
            status = statusInput as AssetStatus;
          }
        }

        // Parse currency
        let priceCurrency = 'QAR';
        if (currencyStr) {
          const currencyInput = currencyStr.toUpperCase();
          if (['QAR', 'USD'].includes(currencyInput)) {
            priceCurrency = currencyInput;
          }
        }

        // Parse acquisition type
        let acquisitionType: 'NEW_PURCHASE' | 'TRANSFERRED' = 'NEW_PURCHASE';
        if (acquisitionTypeStr) {
          const acqInput = acquisitionTypeStr.toUpperCase().replace(/\s+/g, '_');
          if (['NEW_PURCHASE', 'TRANSFERRED'].includes(acqInput)) {
            acquisitionType = acqInput as 'NEW_PURCHASE' | 'TRANSFERRED';
          }
        }

        // Parse price
        let price = null;
        let priceQAR = null;
        if (priceStr) {
          const priceValue = parseFloat(priceStr);
          if (!isNaN(priceValue)) {
            if (priceCurrency === 'QAR') {
              price = priceValue;
              priceQAR = priceValue / 3.64;
            } else {
              priceQAR = priceValue;
              price = priceValue * 3.64;
            }
          }
        }

        // Parse dates
        const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;
        const warrantyExpiry = warrantyExpiryStr ? new Date(warrantyExpiryStr) : null;

        // Asset data
        const assetData: any = {
          type,
          category: category || null,
          brand: brand || null,
          model,
          serial: serial || null,
          configuration: configuration || null,
          location: location || null,
          supplier: supplier || null,
          purchaseDate,
          warrantyExpiry,
          price,
          priceCurrency,
          priceQAR,
          status,
          acquisitionType,
          assignedUserId: assignedUserId || null,
          assignmentDate: assignmentDate || null,
        };

        // If ID is provided, use upsert to preserve relationships
        if (id) {
          // Check if asset with this ID exists
          const existingAssetById = await prisma.asset.findUnique({
            where: { id },
          });

          // Check if asset tag is provided and conflicts
          if (assetTag) {
            const existingByTag = await prisma.asset.findFirst({
              where: { assetTag },
            });

            if (existingByTag && existingByTag.id !== id) {
              if (duplicateStrategy === 'skip') {
                results.skipped++;
                continue;
              }
            }
            assetData.assetTag = assetTag;
          } else if (!existingAssetById) {
            // New asset needs a tag
            assetData.assetTag = await generateAssetTag(type, tenantId);
          }

          // Use upsert with ID to preserve relationships
          const asset = await prisma.asset.upsert({
            where: { id },
            create: {
              id,
              ...assetData,
            },
            update: assetData,
          });

          // Log activity
          await logAction(
            session.user.id,
            existingAssetById ? ActivityActions.ASSET_UPDATED : ActivityActions.ASSET_CREATED,
            'Asset',
            asset.id,
            {
              model: asset.model,
              type: asset.type,
              assetTag: asset.assetTag,
              source: 'CSV Import',
            }
          );

          if (existingAssetById) {
            results.updated++;
          } else {
            // Record asset creation history
            const { recordAssetCreation } = await import('@/lib/asset-history');
            await recordAssetCreation(
              asset.id,
              session.user.id,
              null,
              null
            );

            results.created.push({
              assetTag: asset.assetTag,
              name: asset.model,
              type: asset.type,
            });
            results.success++;
          }
          continue;
        }

        // No ID provided - use tag-based logic
        const finalAssetTag = assetTag || (await generateAssetTag(type, tenantId));

        // Check if asset tag already exists
        if (finalAssetTag) {
          const existingAsset = await prisma.asset.findFirst({
            where: { assetTag: finalAssetTag },
          });

          if (existingAsset) {
            if (duplicateStrategy === 'skip') {
              results.skipped++;
              continue;
            } else if (duplicateStrategy === 'update') {
              // Update existing asset
              const asset = await prisma.asset.update({
                where: { id: existingAsset.id },
                data: assetData,
              });

              await logAction(
                session.user.id,
                ActivityActions.ASSET_UPDATED,
                'Asset',
                asset.id,
                {
                  model: asset.model,
                  type: asset.type,
                  assetTag: asset.assetTag,
                  source: 'CSV Import',
                }
              );

              results.updated++;
              continue;
            }
          }
        }

        assetData.assetTag = finalAssetTag;

        // Create new asset
        const asset = await prisma.asset.create({
          data: assetData,
        });

        // Log activity
        await logAction(
          session.user.id,
          ActivityActions.ASSET_CREATED,
          'Asset',
          asset.id,
          {
            model: asset.model,
            type: asset.type,
            assetTag: asset.assetTag,
            source: 'CSV Import',
          }
        );

        // Record asset creation history
        const { recordAssetCreation } = await import('@/lib/asset-history');
        await recordAssetCreation(
          asset.id,
          session.user.id,
          null,
          null
        );

        results.created.push({
          assetTag: asset.assetTag,
          name: asset.model,
          type: asset.type,
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
    console.error('Asset import error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Failed to import assets',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
