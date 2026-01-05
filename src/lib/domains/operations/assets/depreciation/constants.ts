/**
 * @file constants.ts
 * @description Qatar Tax depreciation categories and rate calculation utilities
 * @module domains/operations/assets/depreciation
 *
 * QATAR TAX AUTHORITY RATES:
 * Based on Income Tax Law No. 24 of 2018 and Executive Regulations
 *
 * DEFAULT CATEGORIES (seeded per-organization):
 * - Machinery & Equipment: 15% annual (7 years)
 * - Vehicles: 20% annual (5 years)
 * - Furniture & Office Equipment: 15% annual (7 years)
 * - Computers & IT Equipment: 33.33% annual (3 years)
 * - Electrical Equipment: 20% annual (5 years)
 *
 * Note: Buildings and Intangible Assets removed as not commonly needed.
 * Organizations can add custom categories via settings.
 *
 * @see https://taxsummaries.pwc.com/qatar/corporate/deductions
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT DEPRECIATION CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default Depreciation Categories (Qatar Tax Rates).
 * These are seeded per-organization and can be customized.
 *
 * Each category defines:
 * - code: Unique identifier within organization
 * - name: Human-readable category name
 * - annualRate: Depreciation rate per year (percentage)
 * - usefulLifeYears: Expected useful life in years
 * - description: Examples of assets in this category
 * - assetCategoryCode: Default mapping to asset category (optional)
 */
export const DEFAULT_DEPRECIATION_CATEGORIES = [
  {
    code: 'MACHINERY',
    name: 'Machinery & Equipment',
    annualRate: 15,
    usefulLifeYears: 7,
    description: 'Plants, machinery, mechanical devices',
    assetCategoryCode: null, // No default mapping
  },
  {
    code: 'VEHICLES',
    name: 'Vehicles',
    annualRate: 20,
    usefulLifeYears: 5,
    description: 'Cars, motorcycles, lorries, company fleet',
    assetCategoryCode: 'VH', // Vehicles category
  },
  {
    code: 'FURNITURE',
    name: 'Furniture & Office Equipment',
    annualRate: 15,
    usefulLifeYears: 7,
    description: 'Desks, chairs, filing cabinets, office furnishings',
    assetCategoryCode: 'FR', // Furniture category
  },
  {
    code: 'IT_EQUIPMENT',
    name: 'Computers & IT Equipment',
    annualRate: 33.33,
    usefulLifeYears: 3,
    description: 'Laptops, desktops, servers, networking equipment',
    assetCategoryCode: 'CP', // Computing category
  },
  {
    code: 'ELECTRICAL',
    name: 'Electrical Equipment',
    annualRate: 20,
    usefulLifeYears: 5,
    description: 'Air conditioners, electrical devices',
    assetCategoryCode: 'EL', // Electrical category (if exists)
  },
] as const;

// Keep old name for backward compatibility
export const QATAR_TAX_CATEGORIES = DEFAULT_DEPRECIATION_CATEGORIES;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Valid depreciation category codes */
export type DepreciationCategoryCode = (typeof QATAR_TAX_CATEGORIES)[number]['code'];

/** Array of all valid category codes */
export const DEPRECIATION_CATEGORY_CODES = QATAR_TAX_CATEGORIES.map((c) => c.code);

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a depreciation category by its code.
 *
 * @param code - Category code (e.g., 'IT_EQUIPMENT', 'VEHICLES')
 * @returns Category details or undefined if not found
 *
 * @example
 * const category = getCategoryByCode('IT_EQUIPMENT');
 * // Returns: { code: 'IT_EQUIPMENT', name: 'Computers & IT Equipment', annualRate: 33.33, ... }
 */
export function getCategoryByCode(code: string) {
  return QATAR_TAX_CATEGORIES.find((c) => c.code === code);
}

/**
 * Calculate annual depreciation rate from useful life.
 *
 * Formula: Rate = 100 / Useful Life Years
 *
 * @param usefulLifeYears - Expected useful life in years
 * @returns Annual depreciation rate (percentage)
 *
 * @example
 * calculateAnnualRate(5); // Returns: 20 (20% per year)
 * calculateAnnualRate(3); // Returns: 33.33 (33.33% per year)
 */
export function calculateAnnualRate(usefulLifeYears: number): number {
  if (usefulLifeYears <= 0) return 0;
  return Math.round((100 / usefulLifeYears) * 100) / 100;
}

/**
 * Calculate useful life years from annual rate.
 *
 * Formula: Years = 100 / Rate
 *
 * @param annualRate - Annual depreciation rate (percentage)
 * @returns Useful life in years
 *
 * @example
 * calculateUsefulLife(20); // Returns: 5 (5 years)
 * calculateUsefulLife(33.33); // Returns: 3 (3 years)
 */
export function calculateUsefulLife(annualRate: number): number {
  if (annualRate <= 0) return 0;
  return Math.round(100 / annualRate);
}
