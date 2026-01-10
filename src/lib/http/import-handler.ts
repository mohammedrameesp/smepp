/**
 * @file import-handler.ts
 * @description Factory for creating standardized import route handlers
 * @module http
 *
 * PURPOSE:
 * Eliminates duplicate boilerplate code across import routes by providing
 * a configurable factory function. Each import route (assets, subscriptions,
 * suppliers) was previously 150-250 lines of nearly identical code.
 *
 * USAGE:
 * ```typescript
 * export const POST = createImportHandler({
 *   moduleName: 'assets',
 *   activityEntityType: 'Asset',
 *   parseRow: (row) => {
 *     const result = parseAssetRow(row);
 *     if (!result.success) return { success: false, error: result.error };
 *     return { success: true, data: result.data };
 *   },
 *   findById: (db, id) => db.asset.findFirst({ where: { id } }),
 *   findExisting: (db, data) => db.asset.findFirst({ where: { assetTag: data.assetTag } }),
 *   createEntity: (db, data) => db.asset.create({ data }),
 *   updateEntity: (db, existing, data) => db.asset.update({ where: { id: existing.id }, data }),
 *   getEntityId: (entity) => entity.id,
 *   getParsedId: (data) => data.id,
 * }, { requireAdmin: true });
 * ```
 *
 * FEATURES:
 * - File parsing and validation
 * - Duplicate handling strategies (skip/update)
 * - ID-based upsert support
 * - Activity logging integration
 * - Comprehensive result tracking
 * - Row-level error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext, HandlerOptions } from './handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import {
  parseImportFile,
  parseImportRows,
  getExcelRowNumber,
  createImportResults,
  recordImportError,
  formatImportMessage,
  ImportRow,
  ImportResults,
  DuplicateStrategy,
} from '@/lib/core/import-utils';
import { logAction, ActivityActions } from '@/lib/core/activity';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of parsing a single row
 */
export type ParseResult<TParsed> =
  | { success: true; data: TParsed }
  | { success: false; error: string };

/**
 * Configuration for creating an import handler
 *
 * @template TParsed - The parsed/validated data type from a row
 * @template TEntity - The database entity type being imported
 * @template TCreated - The type stored in results.created array
 */
export interface ImportHandlerConfig<TParsed, TEntity, TCreated = Record<string, unknown>> {
  /**
   * Module name for logging and messages.
   * Example: 'assets', 'subscriptions', 'suppliers'
   */
  moduleName: string;

  /**
   * Entity type for activity logging.
   * Example: 'Asset', 'Subscription', 'Supplier'
   */
  activityEntityType: string;

  /**
   * Parse and validate a single row from the import file.
   * Should handle flexible column names and return validation errors.
   *
   * @param row - Raw row data from CSV/Excel
   * @returns Success with parsed data, or failure with error message
   *
   * @example
   * parseRow: (row) => {
   *   const name = row['Name'] || row['name'];
   *   if (!name) return { success: false, error: 'Name is required' };
   *   return { success: true, data: { name, status: row['Status'] || 'ACTIVE' } };
   * }
   */
  parseRow: (row: ImportRow) => ParseResult<TParsed>;

  /**
   * Optional: Find existing entity by ID for ID-based upserts.
   * Used when the import file contains IDs to preserve relationships.
   *
   * @param db - Tenant-scoped Prisma client
   * @param id - Entity ID from parsed data
   * @returns Entity if found, null otherwise
   */
  findById?: (db: TenantPrismaClient, id: string) => Promise<TEntity | null>;

  /**
   * Optional: Find existing entity by unique field for duplicate detection.
   * Used to implement skip/update duplicate strategies.
   *
   * @param db - Tenant-scoped Prisma client
   * @param data - Parsed row data
   * @returns Existing entity if found, null otherwise
   *
   * @example
   * findExisting: (db, data) => db.supplier.findFirst({
   *   where: { OR: [{ suppCode: data.suppCode }, { name: data.name }] }
   * })
   */
  findExisting?: (db: TenantPrismaClient, data: TParsed) => Promise<TEntity | null>;

  /**
   * Create a new entity from parsed data.
   * tenantId is auto-injected by tenant-scoped Prisma.
   *
   * @param db - Tenant-scoped Prisma client
   * @param data - Parsed and validated row data
   * @returns Created entity
   */
  createEntity: (db: TenantPrismaClient, data: TParsed) => Promise<TEntity>;

  /**
   * Update an existing entity with new data.
   *
   * @param db - Tenant-scoped Prisma client
   * @param existing - Existing entity to update
   * @param data - New data from import
   * @returns Updated entity
   */
  updateEntity: (db: TenantPrismaClient, existing: TEntity, data: TParsed) => Promise<TEntity>;

  /**
   * Extract entity ID for activity logging.
   *
   * @param entity - Created or updated entity
   * @returns Entity ID string
   */
  getEntityId: (entity: TEntity) => string;

  /**
   * Optional: Extract ID from parsed data for ID-based upserts.
   * If provided and returns a value, enables ID-based lookup.
   *
   * @param data - Parsed row data
   * @returns ID if present in data, undefined otherwise
   */
  getParsedId?: (data: TParsed) => string | undefined;

  /**
   * Optional: Transform entity to created record for results.
   * Default returns { id: entity.id }.
   *
   * @param entity - Created entity
   * @param data - Original parsed data
   * @returns Object to store in results.created array
   */
  toCreatedRecord?: (entity: TEntity, data: TParsed) => TCreated;

  /**
   * Optional: Custom post-create hook for additional processing.
   * Useful for creating related records like history entries.
   *
   * @param db - Tenant-scoped Prisma client
   * @param entity - Created entity
   * @param data - Parsed data
   * @param context - Import context (tenantId, userId)
   */
  onCreated?: (
    db: TenantPrismaClient,
    entity: TEntity,
    data: TParsed,
    context: { tenantId: string; userId: string }
  ) => Promise<void>;

  /**
   * Optional: Custom action name for create activity log.
   * Default: `${ENTITY_TYPE}_CREATED` from ActivityActions
   */
  createAction?: string;

  /**
   * Optional: Custom action name for update activity log.
   * Default: `${ENTITY_TYPE}_UPDATED` from ActivityActions
   */
  updateAction?: string;

  /**
   * Optional: Build activity log payload from entity and data.
   * Default includes source: 'CSV Import'
   *
   * @param entity - Created/updated entity
   * @param data - Parsed data
   * @param isUpdate - Whether this was an update operation
   * @returns Payload object for activity log
   */
  buildActivityPayload?: (entity: TEntity, data: TParsed, isUpdate: boolean) => Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets the appropriate activity action for create operations
 */
function getCreateAction(entityType: string, customAction?: string): string {
  if (customAction) return customAction;

  // Try to find matching action in ActivityActions
  const actionKey = `${entityType.toUpperCase()}_CREATED` as keyof typeof ActivityActions;
  if (actionKey in ActivityActions) {
    return ActivityActions[actionKey];
  }

  // Fallback to CREATED suffix
  return `${entityType.toUpperCase()}_CREATED`;
}

/**
 * Gets the appropriate activity action for update operations
 */
function getUpdateAction(entityType: string, customAction?: string): string {
  if (customAction) return customAction;

  // Try to find matching action in ActivityActions
  const actionKey = `${entityType.toUpperCase()}_UPDATED` as keyof typeof ActivityActions;
  if (actionKey in ActivityActions) {
    return ActivityActions[actionKey];
  }

  // Fallback to UPDATED suffix
  return `${entityType.toUpperCase()}_UPDATED`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a standardized import handler for CSV/Excel uploads.
 *
 * Reduces boilerplate by handling:
 * - File upload parsing and validation
 * - Duplicate detection and handling strategies
 * - ID-based upserts for relationship preservation
 * - Activity logging for audit trails
 * - Comprehensive result tracking
 * - Row-level error handling
 *
 * @template TParsed - Parsed row data type
 * @template TEntity - Database entity type
 * @template TCreated - Type for results.created entries
 *
 * @param config - Import configuration
 * @param handlerOptions - Handler options (auth, module requirements)
 * @returns Next.js route handler
 *
 * @example
 * // Basic import handler
 * export const POST = createImportHandler({
 *   moduleName: 'suppliers',
 *   activityEntityType: 'Supplier',
 *   parseRow: (row) => {
 *     const name = row['Name'] || row['name'];
 *     if (!name) return { success: false, error: 'Name required' };
 *     return { success: true, data: { name, category: row['Category'] || '' } };
 *   },
 *   findExisting: (db, data) => db.supplier.findFirst({ where: { name: data.name } }),
 *   createEntity: (db, data) => db.supplier.create({ data }),
 *   updateEntity: (db, existing, data) =>
 *     db.supplier.update({ where: { id: existing.id }, data }),
 *   getEntityId: (entity) => entity.id,
 * }, { requireAdmin: true, requireModule: 'suppliers' });
 *
 * @example
 * // Import with ID-based upsert and post-create hook
 * export const POST = createImportHandler({
 *   moduleName: 'assets',
 *   activityEntityType: 'Asset',
 *   parseRow: parseAssetRow,
 *   findById: (db, id) => db.asset.findFirst({ where: { id } }),
 *   findExisting: (db, data) => db.asset.findFirst({ where: { assetTag: data.assetTag } }),
 *   createEntity: (db, data) => db.asset.create({ data: buildAssetData(data) }),
 *   updateEntity: (db, existing, data) =>
 *     db.asset.update({ where: { id: existing.id }, data: buildAssetData(data) }),
 *   getEntityId: (entity) => entity.id,
 *   getParsedId: (data) => data.id,
 *   onCreated: async (db, entity, data, ctx) => {
 *     await recordAssetCreation(entity.id, ctx.userId, null, null);
 *   },
 *   toCreatedRecord: (entity) => ({
 *     assetTag: entity.assetTag,
 *     name: entity.model,
 *     type: entity.type,
 *   }),
 * }, { requireAdmin: true, requireModule: 'assets' });
 */
export function createImportHandler<
  TParsed,
  TEntity,
  TCreated = Record<string, unknown>
>(
  config: ImportHandlerConfig<TParsed, TEntity, TCreated>,
  handlerOptions: HandlerOptions = { requireAdmin: true }
) {
  return withErrorHandler(async (request: NextRequest, context: APIContext) => {
    const { tenant, prisma: tenantPrisma } = context;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Validate tenant context
    // ─────────────────────────────────────────────────────────────────────────
    if (!tenant?.tenantId || !tenant?.userId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;
    const { tenantId, userId } = tenant;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Parse uploaded file
    // ─────────────────────────────────────────────────────────────────────────
    const formData = await request.formData();
    const fileResult = await parseImportFile(formData);

    if ('error' in fileResult) {
      return fileResult.error;
    }

    const { buffer, duplicateStrategy } = fileResult;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Parse rows from file
    // ─────────────────────────────────────────────────────────────────────────
    const rowsResult = await parseImportRows<ImportRow>(buffer);

    if ('error' in rowsResult) {
      return rowsResult.error;
    }

    const { rows } = rowsResult;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data rows found in file' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Process each row
    // ─────────────────────────────────────────────────────────────────────────
    const results = createImportResults<TCreated>();
    const createAction = getCreateAction(config.activityEntityType, config.createAction);
    const updateAction = getUpdateAction(config.activityEntityType, config.updateAction);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = getExcelRowNumber(i);

      try {
        // Parse and validate row
        const parseResult = config.parseRow(row);

        if (!parseResult.success) {
          recordImportError(results, row, rowNumber, parseResult.error);
          continue;
        }

        const data = parseResult.data;
        const parsedId = config.getParsedId?.(data);

        // Build activity payload
        const buildPayload = (entity: TEntity, isUpdate: boolean) =>
          config.buildActivityPayload?.(entity, data, isUpdate) || {
            source: 'CSV Import',
          };

        // ─────────────────────────────────────────────────────────────────────
        // ID-based upsert path
        // ─────────────────────────────────────────────────────────────────────
        if (parsedId && config.findById) {
          const existing = await config.findById(db, parsedId);

          let entity: TEntity;
          let isUpdate = false;

          if (existing) {
            entity = await config.updateEntity(db, existing, data);
            isUpdate = true;
            results.updated++;
          } else {
            entity = await config.createEntity(db, data);

            // Call post-create hook if provided
            if (config.onCreated) {
              await config.onCreated(db, entity, data, { tenantId, userId });
            }

            const createdRecord = config.toCreatedRecord
              ? config.toCreatedRecord(entity, data)
              : ({ id: config.getEntityId(entity) } as TCreated);

            results.created.push(createdRecord);
            results.success++;
          }

          // Log activity
          await logAction(
            tenantId,
            userId,
            isUpdate ? updateAction : createAction,
            config.activityEntityType,
            config.getEntityId(entity),
            buildPayload(entity, isUpdate)
          );

          continue;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Duplicate detection path
        // ─────────────────────────────────────────────────────────────────────
        if (config.findExisting) {
          const existing = await config.findExisting(db, data);

          if (existing) {
            if (duplicateStrategy === 'skip') {
              results.skipped++;
              continue;
            }

            // Update existing (duplicateStrategy === 'update')
            const entity = await config.updateEntity(db, existing, data);

            await logAction(
              tenantId,
              userId,
              updateAction,
              config.activityEntityType,
              config.getEntityId(entity),
              buildPayload(entity, true)
            );

            results.updated++;
            continue;
          }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Create new entity
        // ─────────────────────────────────────────────────────────────────────
        const entity = await config.createEntity(db, data);

        // Call post-create hook if provided
        if (config.onCreated) {
          await config.onCreated(db, entity, data, { tenantId, userId });
        }

        // Log activity
        await logAction(
          tenantId,
          userId,
          createAction,
          config.activityEntityType,
          config.getEntityId(entity),
          buildPayload(entity, false)
        );

        const createdRecord = config.toCreatedRecord
          ? config.toCreatedRecord(entity, data)
          : ({ id: config.getEntityId(entity) } as TCreated);

        results.created.push(createdRecord);
        results.success++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        recordImportError(results, row, rowNumber, message);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Return results
    // ─────────────────────────────────────────────────────────────────────────
    return NextResponse.json({
      message: formatImportMessage(results),
      results,
    });
  }, handlerOptions);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS FOR CONVENIENCE
// ═══════════════════════════════════════════════════════════════════════════════

export type { ImportRow, ImportResults, DuplicateStrategy };
export {
  createRowValueGetter,
  parseEnumValue,
  parseBooleanValue,
  parseNumericValue,
  parseFlexibleDate,
  parseDDMMYYYY,
} from '@/lib/core/import-utils';
