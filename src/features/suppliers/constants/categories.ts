/**
 * @file categories.ts
 * @description Default supplier categories for new organizations
 * @module features/suppliers/constants
 *
 * Re-exports from unified procurement categories for backwards compatibility.
 */

import {
  PROCUREMENT_CATEGORIES,
  getMatchingCategories,
  type ProcurementCategory,
} from '@/lib/constants/procurement-categories';

/**
 * Default supplier categories to help first-time users.
 * These are shown as suggestions when no existing categories match the query.
 */
export const DEFAULT_SUPPLIER_CATEGORIES = PROCUREMENT_CATEGORIES;

export type SupplierCategory = ProcurementCategory;

/**
 * Get matching default categories for autocomplete
 */
export function getMatchingDefaultCategories(query: string, limit = 10): string[] {
  return getMatchingCategories(query, PROCUREMENT_CATEGORIES, limit);
}
