/**
 * @file disposal.ts
 * @description Asset disposal processing with IFRS-compliant depreciation and gain/loss calculation
 * @module domains/operations/assets/depreciation
 *
 * Implements proper asset disposal handling per IFRS/IAS 16:
 * 1. Pro-rata depreciation to disposal date
 * 2. Gain/loss calculation = Proceeds - Net Book Value
 * 3. Final depreciation record creation
 */

import { prisma } from '@/lib/core/prisma';
import { Prisma, DisposalMethod } from '@prisma/client';
import {
  calculateProRataDepreciation,
  calculateDisposalGainLoss,
  DepreciationInput,
} from './calculator';
import { formatNumber } from '@/lib/utils/math-utils';

export interface DisposalInput {
  assetId: string;
  tenantId: string;
  disposalDate: Date;
  disposalMethod: DisposalMethod;
  disposalProceeds: number; // 0 for scrapped/donated
  disposalNotes?: string;
  performedById: string;
}

export interface DisposalResult {
  success: boolean;
  asset?: {
    id: string;
    assetTag: string | null;
    model: string;
    finalDepreciationAmount: number;
    finalAccumulatedDepreciation: number;
    netBookValueAtDisposal: number;
    disposalProceeds: number;
    gainLoss: number; // Positive = gain, Negative = loss
    isGain: boolean;
  };
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Process asset disposal with IFRS-compliant depreciation
 *
 * Steps:
 * 1. Validate asset exists and is not already disposed
 * 2. Calculate pro-rata depreciation from last run to disposal date
 * 3. Create final depreciation record with type "DISPOSAL"
 * 4. Update asset with disposal details and final values
 * 5. Calculate and store gain/loss
 * 6. Auto-unassign if currently assigned
 */
export async function processAssetDisposal(input: DisposalInput): Promise<DisposalResult> {
  const { assetId, tenantId, disposalDate, disposalMethod, disposalProceeds, disposalNotes, performedById } = input;

  try {
    // Fetch asset with depreciation category
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, tenantId },
      include: { depreciationCategory: true },
    });

    if (!asset) {
      return { success: false, error: 'Asset not found' };
    }

    if (asset.status === 'DISPOSED') {
      return {
        success: false,
        error: 'Asset is already disposed',
        skipped: true,
        skipReason: 'Asset was previously disposed',
      };
    }

    // Validate disposal date
    const disposal = new Date(disposalDate);
    disposal.setHours(0, 0, 0, 0);

    if (asset.purchaseDate && disposal < asset.purchaseDate) {
      return { success: false, error: 'Disposal date cannot be before purchase date' };
    }

    if (asset.lastDepreciationDate && disposal < asset.lastDepreciationDate) {
      return { success: false, error: 'Disposal date cannot be before last depreciation date' };
    }

    // Get acquisition cost
    const acquisitionCost = Number(asset.priceQAR || asset.price || 0);

    // Initialize final values
    let finalDepreciationAmount = 0;
    let finalAccumulatedDepreciation = Number(asset.accumulatedDepreciation || 0);
    let netBookValueAtDisposal = acquisitionCost - finalAccumulatedDepreciation;

    // Calculate pro-rata depreciation if asset has depreciation category
    if (asset.depreciationCategory && !asset.isFullyDepreciated && acquisitionCost > 0) {
      const usefulLifeMonths =
        asset.customUsefulLifeMonths || asset.depreciationCategory.usefulLifeYears * 12;

      // Determine start date for pro-rata calculation
      let fromDate: Date;
      if (asset.lastDepreciationDate) {
        // Day after last depreciation
        fromDate = new Date(asset.lastDepreciationDate);
        fromDate.setDate(fromDate.getDate() + 1);
      } else {
        // Start from depreciation start date or purchase date
        fromDate = asset.depreciationStartDate || asset.purchaseDate || new Date();
      }

      const depreciationInput: DepreciationInput = {
        acquisitionCost,
        salvageValue: Number(asset.salvageValue || 0),
        usefulLifeMonths,
        depreciationStartDate: asset.depreciationStartDate || asset.purchaseDate || new Date(),
        accumulatedDepreciation: finalAccumulatedDepreciation,
      };

      const proRataResult = calculateProRataDepreciation(depreciationInput, fromDate, disposal);

      if (proRataResult) {
        finalDepreciationAmount = proRataResult.amount;
        finalAccumulatedDepreciation = proRataResult.newAccumulatedAmount;
        netBookValueAtDisposal = proRataResult.newNetBookValue;
      }
    }

    // Calculate gain/loss
    const gainLoss = calculateDisposalGainLoss(disposalProceeds, netBookValueAtDisposal);

    // Process disposal in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create final depreciation record if there was depreciation
      if (finalDepreciationAmount > 0 && asset.depreciationCategory) {
        await tx.depreciationRecord.create({
          data: {
            tenantId,
            assetId,
            periodStart: asset.lastDepreciationDate
              ? new Date(new Date(asset.lastDepreciationDate).setDate(asset.lastDepreciationDate.getDate() + 1))
              : (asset.depreciationStartDate || asset.purchaseDate || new Date()),
            periodEnd: disposal,
            depreciationAmount: new Prisma.Decimal(finalDepreciationAmount),
            accumulatedAmount: new Prisma.Decimal(finalAccumulatedDepreciation),
            netBookValue: new Prisma.Decimal(netBookValueAtDisposal),
            calculationType: 'DISPOSAL',
            calculatedById: performedById,
            notes: `Final depreciation at disposal (${disposalMethod})`,
          },
        });
      }

      // Update asset with disposal information
      const updatedAsset = await tx.asset.update({
        where: { id: assetId },
        data: {
          status: 'DISPOSED',
          // Clear assignment
          assignedMemberId: null,
          assignmentDate: null,
          // Disposal tracking
          disposalDate: disposal,
          disposalMethod,
          disposalProceeds: new Prisma.Decimal(disposalProceeds),
          disposalNotes: disposalNotes || null,
          disposalNetBookValue: new Prisma.Decimal(netBookValueAtDisposal),
          disposalGainLoss: new Prisma.Decimal(gainLoss),
          disposedById: performedById,
          // Update depreciation values
          accumulatedDepreciation: new Prisma.Decimal(finalAccumulatedDepreciation),
          netBookValue: new Prisma.Decimal(netBookValueAtDisposal),
          lastDepreciationDate: finalDepreciationAmount > 0 ? disposal : asset.lastDepreciationDate,
          isFullyDepreciated: true, // Mark as fully depreciated after disposal
        },
      });

      // Record in asset history
      await tx.assetHistory.create({
        data: {
          tenantId,
          assetId,
          action: 'STATUS_CHANGED',
          fromStatus: asset.status,
          toStatus: 'DISPOSED',
          fromMemberId: asset.assignedMemberId,
          toMemberId: null,
          performedById,
          notes: `Disposed via ${disposalMethod.toLowerCase().replace('_', ' ')}. ` +
            `NBV: ${formatNumber(netBookValueAtDisposal)} QAR, ` +
            `Proceeds: ${formatNumber(disposalProceeds)} QAR, ` +
            `${gainLoss >= 0 ? 'Gain' : 'Loss'}: ${formatNumber(Math.abs(gainLoss))} QAR` +
            (disposalNotes ? `. Notes: ${disposalNotes}` : ''),
        },
      });

      return updatedAsset;
    });

    return {
      success: true,
      asset: {
        id: result.id,
        assetTag: result.assetTag,
        model: result.model,
        finalDepreciationAmount,
        finalAccumulatedDepreciation,
        netBookValueAtDisposal,
        disposalProceeds,
        gainLoss,
        isGain: gainLoss >= 0,
      },
    };
  } catch (error) {
    console.error(`[Disposal] Error processing asset ${assetId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during disposal',
    };
  }
}

/**
 * Preview disposal calculation without committing changes
 *
 * Useful for showing expected gain/loss before user confirms disposal
 */
export async function previewAssetDisposal(
  assetId: string,
  tenantId: string,
  disposalDate: Date,
  disposalProceeds: number
): Promise<{
  canDispose: boolean;
  error?: string;
  preview?: {
    currentNetBookValue: number;
    finalDepreciationAmount: number;
    netBookValueAtDisposal: number;
    expectedGainLoss: number;
    isGain: boolean;
    daysOfDepreciation: number;
  };
}> {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
    include: { depreciationCategory: true },
  });

  if (!asset) {
    return { canDispose: false, error: 'Asset not found' };
  }

  if (asset.status === 'DISPOSED') {
    return { canDispose: false, error: 'Asset is already disposed' };
  }

  const disposal = new Date(disposalDate);
  disposal.setHours(0, 0, 0, 0);

  if (asset.purchaseDate && disposal < asset.purchaseDate) {
    return { canDispose: false, error: 'Disposal date cannot be before purchase date' };
  }

  const acquisitionCost = Number(asset.priceQAR || asset.price || 0);
  const currentAccumulated = Number(asset.accumulatedDepreciation || 0);
  const currentNetBookValue = acquisitionCost - currentAccumulated;

  let finalDepreciationAmount = 0;
  let netBookValueAtDisposal = currentNetBookValue;
  let daysOfDepreciation = 0;

  // Calculate pro-rata if applicable
  if (asset.depreciationCategory && !asset.isFullyDepreciated && acquisitionCost > 0) {
    const usefulLifeMonths =
      asset.customUsefulLifeMonths || asset.depreciationCategory.usefulLifeYears * 12;

    let fromDate: Date;
    if (asset.lastDepreciationDate) {
      fromDate = new Date(asset.lastDepreciationDate);
      fromDate.setDate(fromDate.getDate() + 1);
    } else {
      fromDate = asset.depreciationStartDate || asset.purchaseDate || new Date();
    }

    const depreciationInput: DepreciationInput = {
      acquisitionCost,
      salvageValue: Number(asset.salvageValue || 0),
      usefulLifeMonths,
      depreciationStartDate: asset.depreciationStartDate || asset.purchaseDate || new Date(),
      accumulatedDepreciation: currentAccumulated,
    };

    const proRataResult = calculateProRataDepreciation(depreciationInput, fromDate, disposal);

    if (proRataResult) {
      finalDepreciationAmount = proRataResult.amount;
      netBookValueAtDisposal = proRataResult.newNetBookValue;
      daysOfDepreciation = proRataResult.days;
    }
  }

  const expectedGainLoss = calculateDisposalGainLoss(disposalProceeds, netBookValueAtDisposal);

  return {
    canDispose: true,
    preview: {
      currentNetBookValue,
      finalDepreciationAmount,
      netBookValueAtDisposal,
      expectedGainLoss,
      isGain: expectedGainLoss >= 0,
      daysOfDepreciation,
    },
  };
}
