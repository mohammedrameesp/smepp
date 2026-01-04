/**
 * @file route.ts
 * @description Asset type suggestions API - merges default suggestions with custom tenant mappings
 * @module operations/assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { ASSET_TYPE_SUGGESTIONS } from '@/lib/constants/asset-type-suggestions';

export interface AssetTypeSuggestionResponse {
  type: string;
  categoryCode: string;
  categoryName: string;
  isCustom: boolean;
}

/**
 * GET /api/asset-types/suggestions?q=laptop
 * Get merged asset type suggestions (defaults + custom tenant mappings)
 */
async function getAssetTypeSuggestionsHandler(request: NextRequest, context: APIContext) {
  const { tenant } = context;
  const tenantId = tenant!.tenantId;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase().trim() || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

  // If no query, return empty array (user must type at least 1 char)
  if (!query || query.length < 1) {
    return NextResponse.json({ suggestions: [] });
  }

  // Get custom tenant mappings
  const customMappings = await prisma.assetTypeMapping.findMany({
    where: { tenantId },
    include: {
      category: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  });

  // Convert custom mappings to suggestion format
  const customSuggestions: AssetTypeSuggestionResponse[] = customMappings.map((m) => ({
    type: m.typeName,
    categoryCode: m.category.code,
    categoryName: m.category.name,
    isCustom: true,
  }));

  // Convert default suggestions to response format
  const defaultSuggestions: AssetTypeSuggestionResponse[] = ASSET_TYPE_SUGGESTIONS.map((s) => ({
    type: s.type,
    categoryCode: s.categoryCode,
    categoryName: s.categoryName,
    isCustom: false,
  }));

  // Combine all suggestions (custom first, then defaults)
  const allSuggestions = [...customSuggestions, ...defaultSuggestions];

  // Filter and deduplicate by type name (case-insensitive), keeping custom over default
  const seen = new Set<string>();
  const filteredSuggestions: AssetTypeSuggestionResponse[] = [];

  for (const suggestion of allSuggestions) {
    const lowerType = suggestion.type.toLowerCase();

    // Check if matches query (starts with or contains)
    if (!lowerType.includes(query)) {
      continue;
    }

    // Skip if we've already seen this type (case-insensitive)
    if (seen.has(lowerType)) {
      continue;
    }

    seen.add(lowerType);
    filteredSuggestions.push(suggestion);
  }

  // Sort: starts-with matches first, then alphabetically
  const sortedSuggestions = filteredSuggestions.sort((a, b) => {
    const aStartsWith = a.type.toLowerCase().startsWith(query);
    const bStartsWith = b.type.toLowerCase().startsWith(query);

    // Prioritize starts-with matches
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;

    // Prioritize custom over default
    if (a.isCustom && !b.isCustom) return -1;
    if (!a.isCustom && b.isCustom) return 1;

    // Alphabetically
    return a.type.localeCompare(b.type);
  });

  return NextResponse.json({
    suggestions: sortedSuggestions.slice(0, limit),
  });
}

export const GET = withErrorHandler(getAssetTypeSuggestionsHandler, {
  requireAuth: true,
  requireModule: 'assets',
});
