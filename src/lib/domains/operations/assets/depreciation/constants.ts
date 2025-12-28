/**
 * Qatar Tax Depreciation Categories
 * Based on Qatar Tax Authority guidelines and IFRS compliance
 */

export const QATAR_TAX_CATEGORIES = [
  {
    code: 'BUILDINGS',
    name: 'Buildings',
    annualRate: 4,
    usefulLifeYears: 25,
    description: 'Commercial and industrial buildings, structures',
  },
  {
    code: 'MACHINERY',
    name: 'Machinery & Equipment',
    annualRate: 20,
    usefulLifeYears: 5,
    description: 'Industrial machinery, manufacturing equipment',
  },
  {
    code: 'VEHICLES',
    name: 'Vehicles',
    annualRate: 20,
    usefulLifeYears: 5,
    description: 'Cars, trucks, delivery vehicles, company fleet',
  },
  {
    code: 'FURNITURE',
    name: 'Furniture & Office Equipment',
    annualRate: 20,
    usefulLifeYears: 5,
    description: 'Desks, chairs, filing cabinets, office furnishings',
  },
  {
    code: 'IT_EQUIPMENT',
    name: 'Computers & IT Equipment',
    annualRate: 20,
    usefulLifeYears: 5,
    description: 'Laptops, desktops, servers, networking equipment',
  },
  {
    code: 'INTANGIBLE',
    name: 'Intangible Assets',
    annualRate: 0, // Custom - based on useful life
    usefulLifeYears: 0, // Custom - must be set per asset
    description: 'Software licenses, patents, trademarks (requires custom useful life)',
  },
] as const;

export type DepreciationCategoryCode = (typeof QATAR_TAX_CATEGORIES)[number]['code'];

export const DEPRECIATION_CATEGORY_CODES = QATAR_TAX_CATEGORIES.map((c) => c.code);

/**
 * Get category by code
 */
export function getCategoryByCode(code: string) {
  return QATAR_TAX_CATEGORIES.find((c) => c.code === code);
}

/**
 * Calculate annual depreciation rate from useful life
 * Rate = 100 / Useful Life Years
 */
export function calculateAnnualRate(usefulLifeYears: number): number {
  if (usefulLifeYears <= 0) return 0;
  return Math.round((100 / usefulLifeYears) * 100) / 100;
}

/**
 * Calculate useful life years from annual rate
 * Years = 100 / Rate
 */
export function calculateUsefulLife(annualRate: number): number {
  if (annualRate <= 0) return 0;
  return Math.round(100 / annualRate);
}
