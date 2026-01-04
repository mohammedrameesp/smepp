/**
 * Default asset category definitions for new organizations
 * These categories follow a universal standard for asset classification
 *
 * Tag Format: [ORG]-[CAT]-[YY][SEQ]
 * Example: BCE-CP-25001 (BeCreative, Computing, 2025, sequence 001)
 */

export interface DefaultAssetCategory {
  code: string;
  name: string;
  description: string;
  icon?: string;
}

/**
 * 18 Universal Asset Categories
 * These are seeded for every new organization by default
 */
export const DEFAULT_ASSET_CATEGORIES: DefaultAssetCategory[] = [
  { code: 'CP', name: 'Computing', description: 'Laptops, desktops, servers, workstations, mini PCs, thin clients' },
  { code: 'MO', name: 'Mobile Devices', description: 'Tablets, smartphones, e-readers, smartwatches, PDAs' },
  { code: 'DP', name: 'Display', description: 'Monitors, televisions, projectors, digital signage, video walls' },
  { code: 'AV', name: 'Audio Visual', description: 'Speakers, microphones, headsets, cameras, webcams, amplifiers' },
  { code: 'NW', name: 'Networking', description: 'Routers, switches, access points, firewalls, modems, network racks' },
  { code: 'PR', name: 'Peripherals', description: 'Mice, keyboards, webcams, docking stations, graphics tablets, barcode scanners' },
  { code: 'CB', name: 'Cables & Connectors', description: 'HDMI, LAN, USB, DisplayPort, power cables, adapters, hubs, extension cords' },
  { code: 'ST', name: 'Storage Devices', description: 'External hard drives, NAS, USB flash drives, SD cards, tape drives' },
  { code: 'PT', name: 'Printing', description: 'Printers, scanners, copiers, plotters, fax machines, label printers' },
  { code: 'OF', name: 'Office Furniture', description: 'Desks, chairs, tables, shelving, cabinets, bookcases, reception counters' },
  { code: 'OE', name: 'Office Equipment', description: 'Binding machines, laminators, shredders, whiteboards, projector screens, clocks' },
  { code: 'AP', name: 'Appliances', description: 'Refrigerators, microwaves, coffee machines, water dispensers, air conditioners' },
  { code: 'SF', name: 'Safety & Security', description: 'Fire extinguishers, first aid kits, CCTV cameras, alarms, safes, access control' },
  { code: 'CL', name: 'Cleaning Equipment', description: 'Vacuums, air purifiers, floor scrubbers, pressure washers, steam cleaners' },
  { code: 'VH', name: 'Vehicles', description: 'Cars, vans, trucks, motorcycles, scooters, bicycles, forklifts' },
  { code: 'ME', name: 'Measurement Tools', description: 'Laser meters, tape measures, scales, thermometers, multimeters, levels' },
  { code: 'SW', name: 'Software & SaaS', description: 'Operating systems, productivity suites, CRM, accounting, design, cloud subscriptions' },
  { code: 'DG', name: 'Digital Assets', description: 'Domains, SSL certificates, trademarks, patents, copyrights, digital licenses' },
];

/**
 * Get category by code
 */
export function getDefaultCategoryByCode(code: string): DefaultAssetCategory | undefined {
  return DEFAULT_ASSET_CATEGORIES.find(cat => cat.code === code.toUpperCase());
}

/**
 * Validate if a code is a valid default category code
 */
export function isValidCategoryCode(code: string): boolean {
  return DEFAULT_ASSET_CATEGORIES.some(cat => cat.code === code.toUpperCase());
}
