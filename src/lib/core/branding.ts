import { prisma } from '@/lib/core/prisma';

export interface BrandingSettings {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null; // Optional - if null, use solid primary color (no gradient)
  companyName: string;
}

const DEFAULT_BRANDING: BrandingSettings = {
  logoUrl: null,
  primaryColor: '#1E40AF', // Deep Blue - brand primary
  secondaryColor: null, // No secondary color by default - solid color instead of gradient
  companyName: 'Durj',
};

let cachedBranding: BrandingSettings | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getBrandingSettings(): Promise<BrandingSettings> {
  // Return cached version if still valid
  if (cachedBranding && Date.now() < cacheExpiry) {
    return cachedBranding;
  }

  try {
    const settings = await prisma.appSetting.findMany({
      where: {
        key: {
          in: ['branding.logoUrl', 'branding.primaryColor', 'branding.secondaryColor', 'branding.companyName']
        }
      }
    });

    const branding = settings.reduce((acc, setting) => {
      const key = setting.key.replace('branding.', '') as keyof BrandingSettings;
      (acc as any)[key] = setting.value;
      return acc;
    }, {} as Partial<BrandingSettings>);

    cachedBranding = {
      logoUrl: branding.logoUrl || DEFAULT_BRANDING.logoUrl,
      primaryColor: branding.primaryColor || DEFAULT_BRANDING.primaryColor,
      secondaryColor: branding.secondaryColor || DEFAULT_BRANDING.secondaryColor,
      companyName: branding.companyName || DEFAULT_BRANDING.companyName,
    };

    cacheExpiry = Date.now() + CACHE_TTL;
    return cachedBranding;

  } catch (error) {
    console.error('Failed to fetch branding settings:', error);
    return DEFAULT_BRANDING;
  }
}

export function clearBrandingCache(): void {
  cachedBranding = null;
  cacheExpiry = 0;
}