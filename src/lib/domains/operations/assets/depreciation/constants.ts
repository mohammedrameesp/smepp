/**
 * @file constants.ts
 * @description Qatar Tax depreciation categories and rate calculation utilities
 * @module domains/operations/assets/depreciation
 */

/**
 * Qatar Tax Depreciation Categories
 * Based on Qatar Tax Authority guidelines and IFRS compliance
 */

/**
 * Qatar Tax Authority Depreciation Rates
 * Per Income Tax Law No. 24 of 2018 and Executive Regulations
 * Source: https://taxsummaries.pwc.com/qatar/corporate/deductions
 */
export const QATAR_TAX_CATEGORIES = [
  {
    code: 'BUILDINGS',
    name: 'Buildings',
    annualRate: 5,
    usefulLifeYears: 20,
    description: 'Offices, warehouses, hospitals, commercial structures',
  },
  {
    code: 'MACHINERY',
    name: 'Machinery & Equipment',
    annualRate: 15,
    usefulLifeYears: 7,
    description: 'Plants, machinery, mechanical devices',
  },
  {
    code: 'VEHICLES',
    name: 'Vehicles',
    annualRate: 20,
    usefulLifeYears: 5,
    description: 'Cars, motorcycles, lorries, company fleet',
  },
  {
    code: 'FURNITURE',
    name: 'Furniture & Office Equipment',
    annualRate: 15,
    usefulLifeYears: 7,
    description: 'Desks, chairs, filing cabinets, office furnishings',
  },
  {
    code: 'IT_EQUIPMENT',
    name: 'Computers & IT Equipment',
    annualRate: 33.33,
    usefulLifeYears: 3,
    description: 'Laptops, desktops, servers, networking equipment',
  },
  {
    code: 'ELECTRICAL',
    name: 'Electrical Equipment',
    annualRate: 20,
    usefulLifeYears: 5,
    description: 'Air conditioners, electrical devices',
  },
  {
    code: 'INTANGIBLE',
    name: 'Intangible Assets',
    annualRate: 15, // Maximum allowed per Qatar Tax Law
    usefulLifeYears: 7,
    description: 'Software licenses, patents, trademarks (max 15% per year)',
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
