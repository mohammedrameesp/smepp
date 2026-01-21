/**
 * @file procurement-categories.ts
 * @description Unified procurement categories for suppliers and purchase requests
 * @module lib/constants
 *
 * Single source of truth for procurement-related categories across the application.
 * Used by:
 * - Supplier management (supplier categories)
 * - Purchase requests (item categories)
 */

/**
 * Unified procurement categories covering both supplier types and purchase request items.
 * Organized by sector for better UX in autocomplete/select components.
 */
export const PROCUREMENT_CATEGORIES = [
  // IT & Technology
  'IT Equipment',
  'Software & Licenses',
  'IT Services',
  'Telecommunications',

  // Office & Facilities
  'Office Supplies',
  'Furniture',
  'Cleaning & Janitorial',
  'Security Services',
  'Facilities Management',

  // Professional Services
  'Consulting',
  'Legal Services',
  'Accounting & Audit',
  'Marketing & Advertising',
  'HR & Recruitment',
  'Training & Development',

  // Operations
  'Logistics & Shipping',
  'Printing & Stationery',
  'Travel & Transportation',
  'Catering & Food Services',

  // Construction & Maintenance
  'Construction',
  'Electrical',
  'Plumbing',
  'HVAC',
  'General Maintenance',

  // Manufacturing & Industrial
  'Raw Materials',
  'Machinery & Equipment',
  'Packaging',
  'Industrial Supplies',

  // Other
  'Insurance',
  'Financial Services',
  'Healthcare',
  'Other',
] as const;

export type ProcurementCategory = (typeof PROCUREMENT_CATEGORIES)[number];

/**
 * Simplified categories for purchase request forms.
 * Subset of PROCUREMENT_CATEGORIES with the most common items.
 */
export const PURCHASE_REQUEST_CATEGORIES = [
  'IT Equipment',
  'Office Supplies',
  'Software & Licenses',
  'Furniture',
  'Marketing & Advertising',
  'Travel & Transportation',
  'Consulting',
  'Other',
] as const;

export type PurchaseRequestCategory = (typeof PURCHASE_REQUEST_CATEGORIES)[number];

/**
 * Get matching categories for autocomplete
 * @param query Search query
 * @param categories Category list to search (defaults to full list)
 * @param limit Max results to return
 */
export function getMatchingCategories(
  query: string,
  categories: readonly string[] = PROCUREMENT_CATEGORIES,
  limit = 10
): string[] {
  if (!query) {
    return categories.slice(0, limit) as string[];
  }

  const lowerQuery = query.toLowerCase();
  return categories
    .filter(cat => cat.toLowerCase().includes(lowerQuery))
    .slice(0, limit) as string[];
}

/**
 * Category groups for organized display in select/autocomplete
 */
export const CATEGORY_GROUPS = {
  'IT & Technology': ['IT Equipment', 'Software & Licenses', 'IT Services', 'Telecommunications'],
  'Office & Facilities': ['Office Supplies', 'Furniture', 'Cleaning & Janitorial', 'Security Services', 'Facilities Management'],
  'Professional Services': ['Consulting', 'Legal Services', 'Accounting & Audit', 'Marketing & Advertising', 'HR & Recruitment', 'Training & Development'],
  'Operations': ['Logistics & Shipping', 'Printing & Stationery', 'Travel & Transportation', 'Catering & Food Services'],
  'Construction & Maintenance': ['Construction', 'Electrical', 'Plumbing', 'HVAC', 'General Maintenance'],
  'Manufacturing & Industrial': ['Raw Materials', 'Machinery & Equipment', 'Packaging', 'Industrial Supplies'],
  'Other': ['Insurance', 'Financial Services', 'Healthcare', 'Other'],
} as const;
