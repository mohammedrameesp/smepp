/**
 * @file asset-categories.ts
 * @description Default asset category definitions for new organizations
 * @module constants
 *
 * FEATURES:
 * - 16 universal physical/hardware asset categories
 * - 2-letter codes for asset tag generation
 * - Category lookup utilities
 *
 * ASSET TAG FORMAT:
 * {ORG_PREFIX}-{CATEGORY_CODE}-{YY}{SEQUENCE}
 *
 * @example
 * ORG-CP-25001 = BeCreative, Computing, 2025, sequence 001
 * INN-VH-24003 = Innovation, Vehicles, 2024, sequence 003
 *
 * CATEGORY ORGANIZATION:
 * The 16 categories cover all typical physical business assets:
 * - IT Equipment: CP, MO, DP, AV, NW, PR, CB, ST, PT
 * - Furniture/Equipment: OF, OE, AP
 * - Safety/Maintenance: SF, CL
 * - Transportation: VH
 * - Tools: ME
 *
 * NOTE: Software (SW) and Digital Assets (DG) are tracked in the
 * Subscriptions module, not here.
 *
 * @see seed-asset-categories.ts for seeding logic
 * @see asset-type-suggestions.ts for type-to-category mappings
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default asset category definition.
 *
 * Used for seeding new organizations and as reference for category structure.
 */
export interface DefaultAssetCategory {
  /** 2-letter unique code for tag generation (e.g., CP, MO, VH) */
  code: string;
  /** Human-readable category name */
  name: string;
  /** Description with example assets */
  description: string;
  /** Optional icon identifier for UI */
  icon?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 16 Universal Asset Categories (Physical & Hardware Assets).
 *
 * These are seeded for every new organization by default.
 * Organizations can add custom categories but cannot delete defaults.
 *
 * CATEGORIES BY GROUP:
 *
 * **Computing & IT:**
 * - CP: Computing (laptops, desktops, servers)
 * - MO: Mobile Devices (tablets, phones)
 * - DP: Display (monitors, projectors)
 * - AV: Audio Visual (speakers, cameras)
 * - NW: Networking (routers, switches)
 * - PR: Peripherals (mice, keyboards)
 * - CB: Cables & Connectors
 * - ST: Storage Devices (external drives, NAS)
 * - PT: Printing (printers, scanners)
 *
 * **Office:**
 * - OF: Office Furniture (desks, chairs)
 * - OE: Office Equipment (shredders, whiteboards)
 * - AP: Appliances (fridges, coffee machines)
 *
 * **Safety & Facilities:**
 * - SF: Safety & Security (fire extinguishers, CCTV)
 * - CL: Cleaning Equipment (vacuums, purifiers)
 *
 * **Transportation:**
 * - VH: Vehicles (cars, bikes)
 *
 * **Tools:**
 * - ME: Measurement Tools (meters, scales)
 */
export const DEFAULT_ASSET_CATEGORIES: DefaultAssetCategory[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTING & IT
  // ─────────────────────────────────────────────────────────────────────────────
  { code: 'CP', name: 'Computing', description: 'Laptops, desktops, servers, workstations, mini PCs, thin clients' },
  { code: 'MO', name: 'Mobile Devices', description: 'Tablets, smartphones, e-readers, smartwatches, PDAs' },
  { code: 'DP', name: 'Display', description: 'Monitors, televisions, projectors, digital signage, video walls' },
  { code: 'AV', name: 'Audio Visual', description: 'Speakers, microphones, headsets, cameras, webcams, amplifiers' },
  { code: 'NW', name: 'Networking', description: 'Routers, switches, access points, firewalls, modems, network racks' },
  { code: 'PR', name: 'Peripherals', description: 'Mice, keyboards, webcams, docking stations, graphics tablets, barcode scanners' },
  { code: 'CB', name: 'Cables & Connectors', description: 'HDMI, LAN, USB, DisplayPort, power cables, adapters, hubs, extension cords' },
  { code: 'ST', name: 'Storage Devices', description: 'External hard drives, NAS, USB flash drives, SD cards, tape drives' },
  { code: 'PT', name: 'Printing', description: 'Printers, scanners, copiers, plotters, fax machines, label printers' },

  // ─────────────────────────────────────────────────────────────────────────────
  // OFFICE
  // ─────────────────────────────────────────────────────────────────────────────
  { code: 'OF', name: 'Office Furniture', description: 'Desks, chairs, tables, shelving, cabinets, bookcases, reception counters' },
  { code: 'OE', name: 'Office Equipment', description: 'Binding machines, laminators, shredders, whiteboards, projector screens, clocks' },
  { code: 'AP', name: 'Appliances', description: 'Refrigerators, microwaves, coffee machines, water dispensers, air conditioners' },

  // ─────────────────────────────────────────────────────────────────────────────
  // SAFETY & FACILITIES
  // ─────────────────────────────────────────────────────────────────────────────
  { code: 'SF', name: 'Safety & Security', description: 'Fire extinguishers, first aid kits, CCTV cameras, alarms, safes, access control' },
  { code: 'CL', name: 'Cleaning Equipment', description: 'Vacuums, air purifiers, floor scrubbers, pressure washers, steam cleaners' },

  // ─────────────────────────────────────────────────────────────────────────────
  // TRANSPORTATION
  // ─────────────────────────────────────────────────────────────────────────────
  { code: 'VH', name: 'Vehicles', description: 'Cars, vans, trucks, motorcycles, scooters, bicycles, forklifts' },

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOLS
  // ─────────────────────────────────────────────────────────────────────────────
  { code: 'ME', name: 'Measurement Tools', description: 'Laser meters, tape measures, scales, thermometers, multimeters, levels' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a default category by its code.
 *
 * Case-insensitive lookup.
 *
 * @param code - 2-letter category code (e.g., "CP", "VH")
 * @returns Category definition or undefined if not found
 *
 * @example
 * const cat = getDefaultCategoryByCode('CP');
 * // Returns: { code: 'CP', name: 'Computing', description: '...' }
 */
export function getDefaultCategoryByCode(code: string): DefaultAssetCategory | undefined {
  return DEFAULT_ASSET_CATEGORIES.find(cat => cat.code === code.toUpperCase());
}

/**
 * Check if a code is a valid default category code.
 *
 * @param code - Code to validate
 * @returns true if code matches a default category
 *
 * @example
 * isValidCategoryCode('CP'); // true
 * isValidCategoryCode('XX'); // false
 */
export function isValidCategoryCode(code: string): boolean {
  return DEFAULT_ASSET_CATEGORIES.some(cat => cat.code === code.toUpperCase());
}
