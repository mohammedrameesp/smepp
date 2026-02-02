/**
 * @file route.ts
 * @description Subscription bulk import from CSV/Excel endpoint
 * @module operations/subscriptions
 *
 * FEATURES:
 * - CSV and Excel file support
 * - Flexible column name matching
 * - Duplicate handling strategies (skip or update)
 * - Subscription history import from second sheet
 * - User assignment by ID or email
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { ActivityActions } from '@/lib/core/activity';
import { SubscriptionHistoryAction } from '@prisma/client';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import {
  parseImportFile,
  parseImportRows,
  createImportResults,
  recordImportError,
  formatImportMessage,
  getExcelRowNumber,
} from '@/lib/core/import-export';
import {
  type SubscriptionImportRow,
  parseSubscriptionRow,
  buildSubscriptionDbData,
  parseHistoryRow,
  parseHistorySheetFromExcel,
  type SubscriptionCreatedInfo,
} from '@/features/subscriptions';

async function importSubscriptionsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  // Defensive check for tenant context
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const currentUserId = tenant.userId;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Parse and validate the uploaded file
  // ─────────────────────────────────────────────────────────────────────────
  const formData = await request.formData();
  const fileResult = await parseImportFile(formData);
  if ('error' in fileResult) return fileResult.error;
  const { buffer, duplicateStrategy } = fileResult;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Parse CSV rows (subscriptions from first sheet)
  // ─────────────────────────────────────────────────────────────────────────
  const rowsResult = await parseImportRows<SubscriptionImportRow>(buffer);
  if ('error' in rowsResult) return rowsResult.error;
  const { rows } = rowsResult;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Parse history from second sheet (if Excel file with history)
  // ─────────────────────────────────────────────────────────────────────────
  const historyRows = await parseHistorySheetFromExcel(buffer);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Process each subscription row
  // ─────────────────────────────────────────────────────────────────────────
  const results = createImportResults<SubscriptionCreatedInfo>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = getExcelRowNumber(i);

    try {
      // Parse row using helper function
      const parseResult = parseSubscriptionRow(row);
      if (!parseResult.success) {
        recordImportError(results, row, rowNumber, parseResult.error);
        continue;
      }

      const { data: parsedData } = parseResult;
      const { id, assignedMemberEmail } = parsedData;

      // Resolve assigned member - by ID first, then by email
      let assignedMemberId = parsedData.assignedMemberId;
      if (assignedMemberId) {
        // Verify the member belongs to this organization
        const member = await db.teamMember.findFirst({
          where: {
            id: assignedMemberId,
          },
        });
        assignedMemberId = member?.id || null;
      } else if (assignedMemberEmail) {
        const member = await db.teamMember.findFirst({
          where: {
            email: assignedMemberEmail,
          },
        });
        assignedMemberId = member?.id || null;
      }

      // Build database-ready subscription data
      const subscriptionData = {
        ...buildSubscriptionDbData(parsedData),
        assignedMemberId,
      };

      // ─────────────────────────────────────────────────────────────────────
      // ID-BASED UPSERT (preserves relationships when ID provided)
      // ─────────────────────────────────────────────────────────────────────
      if (id) {
        const existingById = await db.subscription.findFirst({
          where: { id },
        });

        const subscription = await db.$transaction(async (tx) => {
          const sub = await tx.subscription.upsert({
            where: { id },
            create: { id, ...subscriptionData, tenantId },
            update: subscriptionData,
          });

          await tx.activityLog.create({
            data: {
              actorMemberId: currentUserId,
              action: existingById ? ActivityActions.SUBSCRIPTION_UPDATED : ActivityActions.SUBSCRIPTION_CREATED,
              entityType: 'Subscription',
              entityId: sub.id,
              payload: {
                serviceName: sub.serviceName,
                billingCycle: sub.billingCycle,
                source: 'CSV Import',
              },
              tenantId,
            },
          });

          return sub;
        });

        if (existingById) {
          results.updated++;
        } else {
          results.created.push({
            serviceName: subscription.serviceName,
            billingCycle: subscription.billingCycle,
            costPerCycle: subscription.costPerCycle ? Number(subscription.costPerCycle) : null,
          });
          results.success++;
        }
        continue;
      }

      // ─────────────────────────────────────────────────────────────────────
      // NAME-BASED DUPLICATE CHECK (when no ID provided)
      // ─────────────────────────────────────────────────────────────────────
      const existingByName = await db.subscription.findFirst({
        where: {
          serviceName: row['Service Name'],
          accountId: row['Account ID/Email'] || null,
        },
      });

      if (existingByName) {
        if (duplicateStrategy === 'skip') {
          results.skipped++;
          continue;
        }

        // Update existing subscription
        await db.$transaction(async (tx) => {
          const sub = await tx.subscription.update({
            where: { id: existingByName.id },
            data: subscriptionData,
          });

          await tx.activityLog.create({
            data: {
              actorMemberId: currentUserId,
              action: ActivityActions.SUBSCRIPTION_UPDATED,
              entityType: 'Subscription',
              entityId: sub.id,
              payload: {
                serviceName: sub.serviceName,
                billingCycle: sub.billingCycle,
                source: 'CSV Import',
              },
              tenantId,
            },
          });

          return sub;
        });

        results.updated++;
        continue;
      }

      // ─────────────────────────────────────────────────────────────────────
      // CREATE NEW SUBSCRIPTION
      // ─────────────────────────────────────────────────────────────────────
      const subscription = await db.$transaction(async (tx) => {
        const sub = await tx.subscription.create({
          data: { ...subscriptionData, tenantId },
        });

        await tx.activityLog.create({
          data: {
            actorMemberId: currentUserId,
            action: ActivityActions.SUBSCRIPTION_CREATED,
            entityType: 'Subscription',
            entityId: sub.id,
            payload: {
              serviceName: sub.serviceName,
              billingCycle: sub.billingCycle,
              source: 'CSV Import',
            },
            tenantId,
          },
        });

        return sub;
      });

      results.created.push({
        serviceName: subscription.serviceName,
        billingCycle: subscription.billingCycle,
        costPerCycle: subscription.costPerCycle ? Number(subscription.costPerCycle) : null,
      });
      results.success++;
    } catch (error) {
      recordImportError(results, row, rowNumber, error instanceof Error ? error : 'Unknown error');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: Import subscription history (if available)
  // ─────────────────────────────────────────────────────────────────────────
  let historyImported = 0;
  let historyFailed = 0;

  if (historyRows.length > 0) {
    for (const historyRow of historyRows) {
      try {
        const parsedHistory = parseHistoryRow(historyRow);
        const subscriptionId = parsedHistory.subscriptionId;

        // Check if subscription exists within tenant
        const subscription = await db.subscription.findFirst({
          where: { id: subscriptionId },
        });

        if (!subscription) {
          historyFailed++;
          continue;
        }

        // Find performer by name or email
        let performerId = currentUserId;
        if (parsedHistory.performedByName && parsedHistory.performedByName !== 'System') {
          const performer = await db.teamMember.findFirst({
            where: {
              OR: [
                { name: parsedHistory.performedByName },
                { email: parsedHistory.performedByName },
              ],
            },
          });
          if (performer) {
            performerId = performer.id;
          }
        }

        // Create history entry (SubscriptionHistory is not tenant-scoped)
        await prisma.subscriptionHistory.create({
          data: {
            subscriptionId,
            action: parsedHistory.action as SubscriptionHistoryAction,
            oldStatus: parsedHistory.oldStatus,
            newStatus: parsedHistory.newStatus,
            oldRenewalDate: parsedHistory.oldRenewalDate,
            newRenewalDate: parsedHistory.newRenewalDate,
            assignmentDate: parsedHistory.assignmentDate,
            reactivationDate: parsedHistory.reactivationDate,
            notes: parsedHistory.notes,
            performedById: performerId,
            createdAt: parsedHistory.createdAt,
          },
        });

        historyImported++;
      } catch {
        historyFailed++;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 6: Return results
  // ─────────────────────────────────────────────────────────────────────────
  return NextResponse.json(
    {
      message: formatImportMessage(results, historyImported > 0 ? { 'history entries imported': historyImported } : undefined),
      results,
      historyImported,
      historyFailed,
    },
    { status: 200 }
  );
}

export const POST = withErrorHandler(importSubscriptionsHandler, { requireAdmin: true, requireModule: 'subscriptions' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
