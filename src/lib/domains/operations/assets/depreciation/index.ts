/**
 * @file index.ts
 * @description Asset depreciation module entry point
 * @module domains/operations/assets/depreciation
 *
 * This module provides IFRS-compliant depreciation functionality:
 *
 * - **constants.ts**: Qatar Tax depreciation categories and rates
 * - **calculator.ts**: Straight-line depreciation calculations
 * - **service.ts**: Database operations for depreciation records
 * - **disposal.ts**: Asset disposal with gain/loss calculation
 *
 * DEPRECIATION METHOD:
 * Straight-line depreciation per Qatar Tax Authority guidelines
 * Formula: (Cost - Salvage Value) / Useful Life
 *
 * CATEGORIES (Qatar Tax Rates):
 * - Buildings: 5% (20 years)
 * - Machinery: 15% (7 years)
 * - Vehicles: 20% (5 years)
 * - Furniture: 15% (7 years)
 * - IT Equipment: 33.33% (3 years)
 * - Electrical: 20% (5 years)
 * - Intangible: 15% max (7 years)
 *
 * @see https://taxsummaries.pwc.com/qatar/corporate/deductions
 */

export * from './constants';
export * from './calculator';
export * from './service';
export * from './disposal';
