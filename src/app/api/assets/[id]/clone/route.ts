/**
 * @file route.ts
 * @description Asset cloning API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordAssetCreation } from '@/lib/domains/operations/assets/asset-history';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function cloneAssetHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Get the original asset within tenant
    const originalAsset = await prisma.asset.findFirst({
      where: { id, tenantId },
    });

    if (!originalAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Generate a new asset tag
    const latestAsset = await prisma.asset.findFirst({
      where: {
        assetTag: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        assetTag: true,
      },
    });

    let newAssetTag: string | null = null;
    if (latestAsset?.assetTag) {
      // Extract number from tag (e.g., AST-001 -> 001)
      const match = latestAsset.assetTag.match(/(\d+)$/);
      if (match) {
        const nextNumber = parseInt(match[1], 10) + 1;
        const paddedNumber = nextNumber.toString().padStart(match[1].length, '0');
        newAssetTag = latestAsset.assetTag.replace(/\d+$/, paddedNumber);
      } else {
        // If no number found, append -001
        newAssetTag = `${latestAsset.assetTag}-001`;
      }
    } else {
      // First asset, create default tag
      newAssetTag = 'AST-001';
    }

    // Create cloned asset with cleared serial and assignment
    const clonedAsset = await prisma.asset.create({
      data: {
        assetTag: newAssetTag,
        type: originalAsset.type,
        brand: originalAsset.brand,
        model: originalAsset.model,
        serial: null, // Clear serial number
        configuration: originalAsset.configuration,
        purchaseDate: originalAsset.purchaseDate,
        warrantyExpiry: originalAsset.warrantyExpiry,
        supplier: originalAsset.supplier,
        invoiceNumber: originalAsset.invoiceNumber,
        price: originalAsset.price,
        priceCurrency: originalAsset.priceCurrency,
        priceQAR: originalAsset.priceQAR,
        status: 'SPARE', // New cloned assets default to SPARE
        assignedMemberId: null, // Clear assignment
        notes: originalAsset.notes,
        location: originalAsset.location,
        tenantId: session.user.organizationId,
      },
      include: {
        assignedMember: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.ASSET_CREATED,
      'Asset',
      clonedAsset.id,
      {
        assetModel: clonedAsset.model,
        assetType: clonedAsset.type,
        assetTag: clonedAsset.assetTag,
        clonedFrom: originalAsset.id,
      }
    );

    // Record asset creation in history
    await recordAssetCreation(clonedAsset.id, session.user.id);

    return NextResponse.json(clonedAsset, { status: 201 });
}

export const POST = withErrorHandler(cloneAssetHandler, { requireAdmin: true, requireModule: 'assets' });
