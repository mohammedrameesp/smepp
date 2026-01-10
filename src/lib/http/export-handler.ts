/**
 * @file export-handler.ts
 * @description Factory for creating standardized export route handlers
 * @module http
 *
 * PURPOSE:
 * Eliminates duplicate boilerplate code across export routes by providing
 * a configurable factory function. Each export route (assets, subscriptions,
 * suppliers, employees) was previously 80-150 lines of nearly identical code.
 *
 * USAGE:
 * ```typescript
 * export const GET = createExportHandler({
 *   moduleName: 'assets',
 *   columns: ASSET_EXPORT_COLUMNS,
 *   fetchData: (db) => db.asset.findMany({ include: { assignedMember: true } }),
 *   transformRow: (asset) => ({
 *     assetTag: asset.assetTag || '',
 *     name: asset.name,
 *     status: asset.status,
 *   }),
 * }, { requireAdmin: true });
 * ```
 *
 * FEATURES:
 * - Tenant-scoped data fetching
 * - Configurable columns and transformation
 * - Multi-sheet Excel support via additionalSheets option
 * - Custom filename generation
 * - Proper Excel MIME type and headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext, HandlerOptions } from './handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { arrayToCSV } from '@/lib/core/csv-utils';
import { ExportHeader, EXCEL_MIME_TYPE } from '@/lib/core/export-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for additional Excel sheets (multi-sheet exports)
 */
export interface AdditionalSheet<T = Record<string, unknown>> {
  /** Sheet name displayed in Excel */
  name: string;
  /** Data rows for this sheet */
  data: T[];
  /** Column headers for this sheet */
  headers: ExportHeader<T>[];
}

/**
 * Configuration for creating an export handler
 *
 * @template TEntity - The database entity type being exported
 * @template TTransformed - The transformed/flattened type for export rows
 */
export interface ExportHandlerConfig<TEntity, TTransformed extends Record<string, unknown> = Record<string, string>> {
  /**
   * Module name used for filename generation.
   * Example: 'assets' produces 'assets_export_2024-01-15.xlsx'
   */
  moduleName: string;

  /**
   * Column definitions for the primary export sheet.
   * Each column maps a key in TTransformed to a display header.
   */
  columns: ExportHeader<TTransformed>[];

  /**
   * Fetches all entities for export from the tenant-scoped database.
   * Include related data as needed for transformation.
   *
   * @param db - Tenant-scoped Prisma client
   * @returns Promise resolving to array of entities
   *
   * @example
   * fetchData: (db) => db.asset.findMany({
   *   include: { assignedMember: { select: { name: true } } },
   *   orderBy: { createdAt: 'desc' },
   * })
   */
  fetchData: (db: TenantPrismaClient) => Promise<TEntity[]>;

  /**
   * Transforms a single entity to an export row.
   * Handle null values, format dates/currency, flatten relations.
   *
   * @param entity - Database entity to transform
   * @returns Flattened object matching column keys
   *
   * @example
   * transformRow: (asset) => ({
   *   assetTag: asset.assetTag || '',
   *   assignedTo: asset.assignedMember?.name || '',
   *   purchaseDate: formatDateForCSV(asset.purchaseDate),
   * })
   */
  transformRow: (entity: TEntity) => TTransformed;

  /**
   * Optional: Generate additional sheets for multi-sheet Excel exports.
   * Useful for including related data like history, audit logs, etc.
   *
   * @param entities - All fetched entities
   * @returns Array of additional sheet configurations
   *
   * @example
   * additionalSheets: (subscriptions) => [{
   *   name: 'History',
   *   data: subscriptions.flatMap(s => s.history),
   *   headers: historyHeaders,
   * }]
   */
  additionalSheets?: (entities: TEntity[]) => AdditionalSheet[];

  /**
   * Optional: Custom filename generator.
   * Default: `${moduleName}_export_${date}.xlsx`
   *
   * @param date - Current date for filename
   * @returns Filename string (should include .xlsx extension)
   */
  getFilename?: (date: Date) => string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a standardized export handler for Excel/CSV downloads.
 *
 * Reduces boilerplate by handling:
 * - Tenant context validation
 * - Data fetching with tenant-scoped Prisma
 * - Data transformation
 * - Excel file generation
 * - Response headers for file download
 *
 * @template TEntity - Database entity type
 * @template TTransformed - Export row type after transformation
 *
 * @param config - Export configuration
 * @param handlerOptions - Handler options (auth, rate limiting, module requirements)
 * @returns Next.js route handler
 *
 * @example
 * // Simple single-sheet export
 * export const GET = createExportHandler({
 *   moduleName: 'assets',
 *   columns: [
 *     { key: 'assetTag', header: 'Asset Tag' },
 *     { key: 'name', header: 'Name' },
 *     { key: 'status', header: 'Status' },
 *   ],
 *   fetchData: (db) => db.asset.findMany({ include: { assignedMember: true } }),
 *   transformRow: (asset) => ({
 *     assetTag: asset.assetTag || '',
 *     name: asset.name,
 *     status: asset.status,
 *   }),
 * }, { requireAdmin: true, requireModule: 'assets' });
 *
 * @example
 * // Multi-sheet export with history
 * export const GET = createExportHandler({
 *   moduleName: 'subscriptions',
 *   columns: subscriptionColumns,
 *   fetchData: (db) => db.subscription.findMany({ include: { history: true } }),
 *   transformRow: transformSubscription,
 *   additionalSheets: (subs) => [{
 *     name: 'History',
 *     data: subs.flatMap(s => s.history.map(h => transformHistory(h, s))),
 *     headers: historyColumns,
 *   }],
 * }, { requireAdmin: true, rateLimit: true });
 */
export function createExportHandler<TEntity, TTransformed extends Record<string, unknown> = Record<string, string>>(
  config: ExportHandlerConfig<TEntity, TTransformed>,
  handlerOptions: HandlerOptions = { requireAuth: true }
) {
  return withErrorHandler(async (_request: NextRequest, context: APIContext) => {
    const { tenant, prisma: tenantPrisma } = context;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Validate tenant context
    // ─────────────────────────────────────────────────────────────────────────
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Fetch data using tenant-scoped client
    // ─────────────────────────────────────────────────────────────────────────
    const entities = await config.fetchData(db);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Transform entities to export format
    // ─────────────────────────────────────────────────────────────────────────
    const exportData = entities.map(config.transformRow);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Generate Excel buffer (single or multi-sheet)
    // ─────────────────────────────────────────────────────────────────────────
    let buffer: Buffer;

    if (config.additionalSheets) {
      // Multi-sheet export
      const additionalSheets = config.additionalSheets(entities);

      if (additionalSheets.length > 0) {
        // Build all sheets array for arrayToCSV
        const allSheets = [
          {
            name: config.moduleName.charAt(0).toUpperCase() + config.moduleName.slice(1),
            data: exportData,
            headers: config.columns as { key: string; header: string }[],
          },
          ...additionalSheets.map((sheet) => ({
            name: sheet.name,
            data: sheet.data,
            headers: sheet.headers as { key: string; header: string }[],
          })),
        ];

        buffer = await arrayToCSV(
          exportData,
          config.columns as { key: string; header: string }[],
          allSheets
        );
      } else {
        // No additional sheets, single sheet export
        buffer = await arrayToCSV(
          exportData,
          config.columns as { key: string; header: string }[]
        );
      }
    } else {
      // Single sheet export
      buffer = await arrayToCSV(
        exportData,
        config.columns as { key: string; header: string }[]
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Generate filename
    // ─────────────────────────────────────────────────────────────────────────
    const date = new Date();
    const filename =
      config.getFilename?.(date) ||
      `${config.moduleName}_export_${date.toISOString().split('T')[0]}.xlsx`;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: Return file response
    // ─────────────────────────────────────────────────────────────────────────
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': EXCEL_MIME_TYPE,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }, handlerOptions);
}
