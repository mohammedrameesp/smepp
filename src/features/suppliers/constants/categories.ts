/**
 * @file categories.ts
 * @description Default supplier categories for new organizations
 * @module features/suppliers/constants
 */

/**
 * Default supplier categories to help first-time users.
 * These are shown as suggestions when no existing categories match the query.
 */
export const DEFAULT_SUPPLIER_CATEGORIES = [
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

export type SupplierCategory = typeof DEFAULT_SUPPLIER_CATEGORIES[number];

/**
 * Get matching default categories for autocomplete
 */
export function getMatchingDefaultCategories(query: string, limit = 10): string[] {
  if (!query) {
    return DEFAULT_SUPPLIER_CATEGORIES.slice(0, limit);
  }

  const lowerQuery = query.toLowerCase();
  return DEFAULT_SUPPLIER_CATEGORIES
    .filter(cat => cat.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
}
