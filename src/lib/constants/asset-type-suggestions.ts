/**
 * Asset type suggestions with category mappings
 * Used for auto-suggesting types and auto-assigning categories
 */

export interface AssetTypeSuggestion {
  type: string;
  categoryCode: string;
  categoryName: string;
}

/**
 * Asset type suggestions organized by category
 * When user types, we match against these and auto-assign the category
 */
export const ASSET_TYPE_SUGGESTIONS: AssetTypeSuggestion[] = [
  // CP - Computing
  { type: 'Laptop', categoryCode: 'CP', categoryName: 'Computing' },
  { type: 'Desktop', categoryCode: 'CP', categoryName: 'Computing' },
  { type: 'Server', categoryCode: 'CP', categoryName: 'Computing' },
  { type: 'Workstation', categoryCode: 'CP', categoryName: 'Computing' },
  { type: 'Mini PC', categoryCode: 'CP', categoryName: 'Computing' },
  { type: 'Thin Client', categoryCode: 'CP', categoryName: 'Computing' },
  { type: 'All-in-One PC', categoryCode: 'CP', categoryName: 'Computing' },
  { type: 'MacBook', categoryCode: 'CP', categoryName: 'Computing' },
  { type: 'iMac', categoryCode: 'CP', categoryName: 'Computing' },
  { type: 'Mac Mini', categoryCode: 'CP', categoryName: 'Computing' },

  // MO - Mobile Devices
  { type: 'Tablet', categoryCode: 'MO', categoryName: 'Mobile Devices' },
  { type: 'iPad', categoryCode: 'MO', categoryName: 'Mobile Devices' },
  { type: 'Smartphone', categoryCode: 'MO', categoryName: 'Mobile Devices' },
  { type: 'iPhone', categoryCode: 'MO', categoryName: 'Mobile Devices' },
  { type: 'Android Phone', categoryCode: 'MO', categoryName: 'Mobile Devices' },
  { type: 'E-Reader', categoryCode: 'MO', categoryName: 'Mobile Devices' },
  { type: 'Kindle', categoryCode: 'MO', categoryName: 'Mobile Devices' },
  { type: 'Smartwatch', categoryCode: 'MO', categoryName: 'Mobile Devices' },
  { type: 'Apple Watch', categoryCode: 'MO', categoryName: 'Mobile Devices' },
  { type: 'PDA', categoryCode: 'MO', categoryName: 'Mobile Devices' },

  // DP - Display
  { type: 'Monitor', categoryCode: 'DP', categoryName: 'Display' },
  { type: 'Television', categoryCode: 'DP', categoryName: 'Display' },
  { type: 'TV', categoryCode: 'DP', categoryName: 'Display' },
  { type: 'Smart TV', categoryCode: 'DP', categoryName: 'Display' },
  { type: 'Projector', categoryCode: 'DP', categoryName: 'Display' },
  { type: 'Digital Signage', categoryCode: 'DP', categoryName: 'Display' },
  { type: 'Video Wall', categoryCode: 'DP', categoryName: 'Display' },
  { type: 'LED Display', categoryCode: 'DP', categoryName: 'Display' },
  { type: 'Curved Monitor', categoryCode: 'DP', categoryName: 'Display' },
  { type: 'Ultrawide Monitor', categoryCode: 'DP', categoryName: 'Display' },

  // AV - Audio Visual
  { type: 'Speaker', categoryCode: 'AV', categoryName: 'Audio Visual' },
  { type: 'Speakers', categoryCode: 'AV', categoryName: 'Audio Visual' },
  { type: 'Microphone', categoryCode: 'AV', categoryName: 'Audio Visual' },
  { type: 'Headset', categoryCode: 'AV', categoryName: 'Audio Visual' },
  { type: 'Headphones', categoryCode: 'AV', categoryName: 'Audio Visual' },
  { type: 'Camera', categoryCode: 'AV', categoryName: 'Audio Visual' },
  { type: 'Webcam', categoryCode: 'AV', categoryName: 'Audio Visual' },
  { type: 'Video Camera', categoryCode: 'AV', categoryName: 'Audio Visual' },
  { type: 'DSLR Camera', categoryCode: 'AV', categoryName: 'Audio Visual' },
  { type: 'Amplifier', categoryCode: 'AV', categoryName: 'Audio Visual' },
  { type: 'Soundbar', categoryCode: 'AV', categoryName: 'Audio Visual' },
  { type: 'Conference Speaker', categoryCode: 'AV', categoryName: 'Audio Visual' },
  { type: 'Wireless Mic', categoryCode: 'AV', categoryName: 'Audio Visual' },

  // NW - Networking
  { type: 'Router', categoryCode: 'NW', categoryName: 'Networking' },
  { type: 'Switch', categoryCode: 'NW', categoryName: 'Networking' },
  { type: 'Network Switch', categoryCode: 'NW', categoryName: 'Networking' },
  { type: 'Access Point', categoryCode: 'NW', categoryName: 'Networking' },
  { type: 'WiFi Access Point', categoryCode: 'NW', categoryName: 'Networking' },
  { type: 'Firewall', categoryCode: 'NW', categoryName: 'Networking' },
  { type: 'Modem', categoryCode: 'NW', categoryName: 'Networking' },
  { type: 'Network Rack', categoryCode: 'NW', categoryName: 'Networking' },
  { type: 'Patch Panel', categoryCode: 'NW', categoryName: 'Networking' },
  { type: 'UPS', categoryCode: 'NW', categoryName: 'Networking' },
  { type: 'PoE Injector', categoryCode: 'NW', categoryName: 'Networking' },

  // PR - Peripherals
  { type: 'Mouse', categoryCode: 'PR', categoryName: 'Peripherals' },
  { type: 'Keyboard', categoryCode: 'PR', categoryName: 'Peripherals' },
  { type: 'Docking Station', categoryCode: 'PR', categoryName: 'Peripherals' },
  { type: 'USB Hub', categoryCode: 'PR', categoryName: 'Peripherals' },
  { type: 'Graphics Tablet', categoryCode: 'PR', categoryName: 'Peripherals' },
  { type: 'Drawing Tablet', categoryCode: 'PR', categoryName: 'Peripherals' },
  { type: 'Barcode Scanner', categoryCode: 'PR', categoryName: 'Peripherals' },
  { type: 'Card Reader', categoryCode: 'PR', categoryName: 'Peripherals' },
  { type: 'Fingerprint Scanner', categoryCode: 'PR', categoryName: 'Peripherals' },
  { type: 'Numeric Keypad', categoryCode: 'PR', categoryName: 'Peripherals' },
  { type: 'Trackpad', categoryCode: 'PR', categoryName: 'Peripherals' },
  { type: 'Presentation Clicker', categoryCode: 'PR', categoryName: 'Peripherals' },

  // CB - Cables & Connectors
  { type: 'HDMI Cable', categoryCode: 'CB', categoryName: 'Cables & Connectors' },
  { type: 'USB Cable', categoryCode: 'CB', categoryName: 'Cables & Connectors' },
  { type: 'LAN Cable', categoryCode: 'CB', categoryName: 'Cables & Connectors' },
  { type: 'Ethernet Cable', categoryCode: 'CB', categoryName: 'Cables & Connectors' },
  { type: 'DisplayPort Cable', categoryCode: 'CB', categoryName: 'Cables & Connectors' },
  { type: 'Power Cable', categoryCode: 'CB', categoryName: 'Cables & Connectors' },
  { type: 'Extension Cord', categoryCode: 'CB', categoryName: 'Cables & Connectors' },
  { type: 'Adapter', categoryCode: 'CB', categoryName: 'Cables & Connectors' },
  { type: 'USB-C Adapter', categoryCode: 'CB', categoryName: 'Cables & Connectors' },
  { type: 'HDMI Adapter', categoryCode: 'CB', categoryName: 'Cables & Connectors' },
  { type: 'Power Strip', categoryCode: 'CB', categoryName: 'Cables & Connectors' },
  { type: 'Surge Protector', categoryCode: 'CB', categoryName: 'Cables & Connectors' },

  // ST - Storage Devices
  { type: 'External Hard Drive', categoryCode: 'ST', categoryName: 'Storage Devices' },
  { type: 'External SSD', categoryCode: 'ST', categoryName: 'Storage Devices' },
  { type: 'NAS', categoryCode: 'ST', categoryName: 'Storage Devices' },
  { type: 'Network Storage', categoryCode: 'ST', categoryName: 'Storage Devices' },
  { type: 'USB Flash Drive', categoryCode: 'ST', categoryName: 'Storage Devices' },
  { type: 'USB Drive', categoryCode: 'ST', categoryName: 'Storage Devices' },
  { type: 'SD Card', categoryCode: 'ST', categoryName: 'Storage Devices' },
  { type: 'Memory Card', categoryCode: 'ST', categoryName: 'Storage Devices' },
  { type: 'Tape Drive', categoryCode: 'ST', categoryName: 'Storage Devices' },
  { type: 'Backup Drive', categoryCode: 'ST', categoryName: 'Storage Devices' },

  // PT - Printing
  { type: 'Printer', categoryCode: 'PT', categoryName: 'Printing' },
  { type: 'Laser Printer', categoryCode: 'PT', categoryName: 'Printing' },
  { type: 'Inkjet Printer', categoryCode: 'PT', categoryName: 'Printing' },
  { type: 'Scanner', categoryCode: 'PT', categoryName: 'Printing' },
  { type: 'Copier', categoryCode: 'PT', categoryName: 'Printing' },
  { type: 'Multifunction Printer', categoryCode: 'PT', categoryName: 'Printing' },
  { type: 'MFP', categoryCode: 'PT', categoryName: 'Printing' },
  { type: 'Label Printer', categoryCode: 'PT', categoryName: 'Printing' },
  { type: 'Plotter', categoryCode: 'PT', categoryName: 'Printing' },
  { type: 'Fax Machine', categoryCode: 'PT', categoryName: 'Printing' },
  { type: '3D Printer', categoryCode: 'PT', categoryName: 'Printing' },

  // OF - Office Furniture
  { type: 'Desk', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Office Desk', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Standing Desk', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Chair', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Office Chair', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Ergonomic Chair', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Table', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Conference Table', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Shelving', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Cabinet', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Filing Cabinet', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Bookcase', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Reception Counter', categoryCode: 'OF', categoryName: 'Office Furniture' },
  { type: 'Locker', categoryCode: 'OF', categoryName: 'Office Furniture' },

  // OE - Office Equipment
  { type: 'Binding Machine', categoryCode: 'OE', categoryName: 'Office Equipment' },
  { type: 'Laminator', categoryCode: 'OE', categoryName: 'Office Equipment' },
  { type: 'Shredder', categoryCode: 'OE', categoryName: 'Office Equipment' },
  { type: 'Paper Shredder', categoryCode: 'OE', categoryName: 'Office Equipment' },
  { type: 'Whiteboard', categoryCode: 'OE', categoryName: 'Office Equipment' },
  { type: 'Smart Board', categoryCode: 'OE', categoryName: 'Office Equipment' },
  { type: 'Projector Screen', categoryCode: 'OE', categoryName: 'Office Equipment' },
  { type: 'Clock', categoryCode: 'OE', categoryName: 'Office Equipment' },
  { type: 'Wall Clock', categoryCode: 'OE', categoryName: 'Office Equipment' },
  { type: 'Paper Cutter', categoryCode: 'OE', categoryName: 'Office Equipment' },
  { type: 'Stapler', categoryCode: 'OE', categoryName: 'Office Equipment' },
  { type: 'Hole Punch', categoryCode: 'OE', categoryName: 'Office Equipment' },

  // AP - Appliances
  { type: 'Refrigerator', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'Fridge', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'Mini Fridge', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'Microwave', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'Coffee Machine', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'Coffee Maker', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'Water Dispenser', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'Water Cooler', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'Air Conditioner', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'AC Unit', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'Heater', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'Fan', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'Electric Kettle', categoryCode: 'AP', categoryName: 'Appliances' },
  { type: 'Toaster', categoryCode: 'AP', categoryName: 'Appliances' },

  // SF - Safety & Security
  { type: 'Fire Extinguisher', categoryCode: 'SF', categoryName: 'Safety & Security' },
  { type: 'First Aid Kit', categoryCode: 'SF', categoryName: 'Safety & Security' },
  { type: 'CCTV Camera', categoryCode: 'SF', categoryName: 'Safety & Security' },
  { type: 'Security Camera', categoryCode: 'SF', categoryName: 'Safety & Security' },
  { type: 'Alarm System', categoryCode: 'SF', categoryName: 'Safety & Security' },
  { type: 'Safe', categoryCode: 'SF', categoryName: 'Safety & Security' },
  { type: 'Vault', categoryCode: 'SF', categoryName: 'Safety & Security' },
  { type: 'Access Control', categoryCode: 'SF', categoryName: 'Safety & Security' },
  { type: 'Door Lock', categoryCode: 'SF', categoryName: 'Safety & Security' },
  { type: 'Smart Lock', categoryCode: 'SF', categoryName: 'Safety & Security' },
  { type: 'Smoke Detector', categoryCode: 'SF', categoryName: 'Safety & Security' },
  { type: 'Motion Sensor', categoryCode: 'SF', categoryName: 'Safety & Security' },

  // CL - Cleaning Equipment
  { type: 'Vacuum', categoryCode: 'CL', categoryName: 'Cleaning Equipment' },
  { type: 'Vacuum Cleaner', categoryCode: 'CL', categoryName: 'Cleaning Equipment' },
  { type: 'Air Purifier', categoryCode: 'CL', categoryName: 'Cleaning Equipment' },
  { type: 'Pressure Washer', categoryCode: 'CL', categoryName: 'Cleaning Equipment' },
  { type: 'Floor Scrubber', categoryCode: 'CL', categoryName: 'Cleaning Equipment' },
  { type: 'Steam Cleaner', categoryCode: 'CL', categoryName: 'Cleaning Equipment' },
  { type: 'Carpet Cleaner', categoryCode: 'CL', categoryName: 'Cleaning Equipment' },
  { type: 'Mop', categoryCode: 'CL', categoryName: 'Cleaning Equipment' },
  { type: 'Industrial Vacuum', categoryCode: 'CL', categoryName: 'Cleaning Equipment' },

  // VH - Vehicles
  { type: 'Car', categoryCode: 'VH', categoryName: 'Vehicles' },
  { type: 'Van', categoryCode: 'VH', categoryName: 'Vehicles' },
  { type: 'Truck', categoryCode: 'VH', categoryName: 'Vehicles' },
  { type: 'Pickup Truck', categoryCode: 'VH', categoryName: 'Vehicles' },
  { type: 'Motorcycle', categoryCode: 'VH', categoryName: 'Vehicles' },
  { type: 'Scooter', categoryCode: 'VH', categoryName: 'Vehicles' },
  { type: 'Bicycle', categoryCode: 'VH', categoryName: 'Vehicles' },
  { type: 'Electric Bike', categoryCode: 'VH', categoryName: 'Vehicles' },
  { type: 'Forklift', categoryCode: 'VH', categoryName: 'Vehicles' },
  { type: 'Golf Cart', categoryCode: 'VH', categoryName: 'Vehicles' },
  { type: 'Delivery Vehicle', categoryCode: 'VH', categoryName: 'Vehicles' },

  // ME - Measurement Tools
  { type: 'Laser Meter', categoryCode: 'ME', categoryName: 'Measurement Tools' },
  { type: 'Tape Measure', categoryCode: 'ME', categoryName: 'Measurement Tools' },
  { type: 'Scale', categoryCode: 'ME', categoryName: 'Measurement Tools' },
  { type: 'Weighing Scale', categoryCode: 'ME', categoryName: 'Measurement Tools' },
  { type: 'Thermometer', categoryCode: 'ME', categoryName: 'Measurement Tools' },
  { type: 'Multimeter', categoryCode: 'ME', categoryName: 'Measurement Tools' },
  { type: 'Level', categoryCode: 'ME', categoryName: 'Measurement Tools' },
  { type: 'Caliper', categoryCode: 'ME', categoryName: 'Measurement Tools' },
  { type: 'Voltmeter', categoryCode: 'ME', categoryName: 'Measurement Tools' },
  { type: 'Oscilloscope', categoryCode: 'ME', categoryName: 'Measurement Tools' },
];

/**
 * Search for matching asset type suggestions
 * @param query - Search query string
 * @param limit - Maximum number of results (default 10)
 */
export function searchAssetTypes(query: string, limit = 10): AssetTypeSuggestion[] {
  if (!query || query.length < 1) return [];

  const lowerQuery = query.toLowerCase().trim();

  // First, find exact matches (starts with query)
  const startsWithMatches = ASSET_TYPE_SUGGESTIONS.filter(
    s => s.type.toLowerCase().startsWith(lowerQuery)
  );

  // Then, find contains matches (but not starts with)
  const containsMatches = ASSET_TYPE_SUGGESTIONS.filter(
    s => !s.type.toLowerCase().startsWith(lowerQuery) &&
         s.type.toLowerCase().includes(lowerQuery)
  );

  // Combine and limit
  return [...startsWithMatches, ...containsMatches].slice(0, limit);
}

/**
 * Find the best matching category for a given type string
 * @param type - Asset type string to match
 */
export function findCategoryForType(type: string): AssetTypeSuggestion | null {
  if (!type) return null;

  const lowerType = type.toLowerCase().trim();

  // Exact match first
  const exactMatch = ASSET_TYPE_SUGGESTIONS.find(
    s => s.type.toLowerCase() === lowerType
  );
  if (exactMatch) return exactMatch;

  // Partial match - type contains one of our suggestions
  const partialMatch = ASSET_TYPE_SUGGESTIONS.find(
    s => lowerType.includes(s.type.toLowerCase()) ||
         s.type.toLowerCase().includes(lowerType)
  );

  return partialMatch || null;
}
