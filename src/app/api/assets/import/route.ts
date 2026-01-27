/**
 * @file route.ts
 * @description Asset CSV import API endpoint
 * @module operations/assets
 *
 * FEATURES:
 * - Flexible column name matching (accepts various naming conventions)
 * - Duplicate handling strategies (skip or update)
 * - ID-based upsert to preserve relationships
 * - Asset tag auto-generation
 * - Currency conversion (QAR/USD)
 * - Activity logging and asset history tracking
 */
import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import {
  parseImportFile,
  parseImportRows,
  getExcelRowNumber,
  createImportResults,
  recordImportError,
  formatImportMessage,
  type ImportRow,
} from '@/lib/core/import-export';
import { parseAssetRow, buildAssetDbData } from '@/features/assets';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function importAssetsHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Parse and validate the uploaded file
    // ─────────────────────────────────────────────────────────────────────────
    const formData = await request.formData();
    const fileResult = await parseImportFile(formData);
    if ('error' in fileResult) return fileResult.error;
    const { buffer, duplicateStrategy } = fileResult;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Parse CSV rows
    // ─────────────────────────────────────────────────────────────────────────
    const rowsResult = await parseImportRows<ImportRow>(buffer);
    if ('error' in rowsResult) return rowsResult.error;
    const { rows } = rowsResult;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Process each row
    // ─────────────────────────────────────────────────────────────────────────
    const results = createImportResults<{ assetTag: string | null; name: string; type: string }>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = getExcelRowNumber(i);

      try {
        // Parse row using helper function
        const parseResult = parseAssetRow(row);
        if (!parseResult.success) {
          recordImportError(results, row, rowNumber, parseResult.error);
          continue;
        }

        const { data: parsedData } = parseResult;
        const { id, assetTag } = parsedData;

        // Build database-ready asset data
        const assetData = buildAssetDbData(parsedData);

        // If ID is provided, use upsert to preserve relationships
        if (id) {
          // Check if asset with this ID exists IN THIS TENANT
          const existingAssetById = await db.asset.findFirst({
            where: { id, tenantId },
          });

          // Check if asset tag is provided and conflicts IN THIS TENANT
          if (assetTag) {
            const existingByTag = await db.asset.findFirst({
              where: { assetTag, tenantId },
            });

            if (existingByTag && existingByTag.id !== id) {
              if (duplicateStrategy === 'skip') {
                results.skipped++;
                continue;
              }
            }
            assetData.assetTag = assetTag;
          }
          // If no assetTag provided and asset is new, leave it undefined (can be set later via UI)

          // Use upsert with ID to preserve relationships
          // Type assertion needed: AssetDbData is compatible with Prisma input but tenantId is auto-injected by tenant extension
          const asset = await db.asset.upsert({
            where: { id },
            create: {
              id,
              ...assetData,
            } as Parameters<typeof db.asset.upsert>[0]['create'],
            update: assetData as Parameters<typeof db.asset.upsert>[0]['update'],
          });

          // Log activity
          await logAction(
            tenantId,
            tenant.userId,
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
            const { recordAssetCreation } = await import('@/features/assets');
            await recordAssetCreation(
              asset.id,
              tenant.userId,
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

        // No ID provided - use tag-based logic (assetTag from CSV or null)
        const finalAssetTag = assetTag || null;

        // Check if asset tag already exists IN THIS TENANT
        if (finalAssetTag) {
          const existingAsset = await db.asset.findFirst({
            where: { assetTag: finalAssetTag, tenantId },
          });

          if (existingAsset) {
            if (duplicateStrategy === 'skip') {
              results.skipped++;
              continue;
            } else if (duplicateStrategy === 'update') {
              // Update existing asset
              const asset = await db.asset.update({
                where: { id: existingAsset.id },
                data: assetData,
              });

              await logAction(
                tenantId,
                tenant.userId,
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

        assetData.assetTag = finalAssetTag || undefined;

        // Create new asset
        // Type assertion needed: AssetDbData is compatible with Prisma input but tenantId is auto-injected by tenant extension
        const asset = await db.asset.create({
          data: assetData as Parameters<typeof db.asset.create>[0]['data'],
        });

        // Log activity
        await logAction(
          tenantId,
          tenant.userId,
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
        const { recordAssetCreation } = await import('@/features/assets');
        await recordAssetCreation(
          asset.id,
          tenant.userId,
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
        recordImportError(results, row, rowNumber, error instanceof Error ? error : 'Unknown error');
      }
    }

    return NextResponse.json(
      {
        message: formatImportMessage(results),
        results,
      },
      { status: 200 }
    );
}

export const POST = withErrorHandler(importAssetsHandler, { requireAdmin: true, requireModule: 'assets' });
