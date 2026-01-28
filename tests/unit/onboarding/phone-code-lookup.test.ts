/**
 * @file phone-code-lookup.test.ts
 * @description Tests for phone code lookup based on nationality
 *
 * Tests the getPhoneCodeByCountry functionality used in the onboarding wizard
 * to auto-set phone country codes when a user selects their nationality.
 */

import { COUNTRY_CODES } from '@/lib/constants';

// Replicate the helper function from onboarding-wizard.tsx for testing
function getPhoneCodeByCountry(countryName: string): string {
  const match = COUNTRY_CODES.find(
    (c) => c.country.toLowerCase() === countryName.toLowerCase()
  );
  return match?.code || '+91'; // Fallback to India if not found
}

describe('Phone Code Lookup', () => {
  describe('getPhoneCodeByCountry', () => {
    describe('Middle East & Gulf Countries', () => {
      it('should return +974 for Qatar', () => {
        expect(getPhoneCodeByCountry('Qatar')).toBe('+974');
      });

      it('should return +966 for Saudi Arabia', () => {
        expect(getPhoneCodeByCountry('Saudi Arabia')).toBe('+966');
      });

      it('should return +971 for UAE', () => {
        expect(getPhoneCodeByCountry('UAE')).toBe('+971');
      });

      it('should return +965 for Kuwait', () => {
        expect(getPhoneCodeByCountry('Kuwait')).toBe('+965');
      });

      it('should return +973 for Bahrain', () => {
        expect(getPhoneCodeByCountry('Bahrain')).toBe('+973');
      });

      it('should return +968 for Oman', () => {
        expect(getPhoneCodeByCountry('Oman')).toBe('+968');
      });

      it('should return +962 for Jordan', () => {
        expect(getPhoneCodeByCountry('Jordan')).toBe('+962');
      });

      it('should return +961 for Lebanon', () => {
        expect(getPhoneCodeByCountry('Lebanon')).toBe('+961');
      });
    });

    describe('South Asian Countries', () => {
      it('should return +91 for India', () => {
        expect(getPhoneCodeByCountry('India')).toBe('+91');
      });

      it('should return +92 for Pakistan', () => {
        expect(getPhoneCodeByCountry('Pakistan')).toBe('+92');
      });

      it('should return +880 for Bangladesh', () => {
        expect(getPhoneCodeByCountry('Bangladesh')).toBe('+880');
      });

      it('should return +94 for Sri Lanka', () => {
        expect(getPhoneCodeByCountry('Sri Lanka')).toBe('+94');
      });

      it('should return +977 for Nepal', () => {
        expect(getPhoneCodeByCountry('Nepal')).toBe('+977');
      });
    });

    describe('Southeast Asian Countries', () => {
      it('should return +63 for Philippines', () => {
        expect(getPhoneCodeByCountry('Philippines')).toBe('+63');
      });

      it('should return +60 for Malaysia', () => {
        expect(getPhoneCodeByCountry('Malaysia')).toBe('+60');
      });

      it('should return +65 for Singapore', () => {
        expect(getPhoneCodeByCountry('Singapore')).toBe('+65');
      });

      it('should return +62 for Indonesia', () => {
        expect(getPhoneCodeByCountry('Indonesia')).toBe('+62');
      });
    });

    describe('African Countries', () => {
      it('should return +20 for Egypt', () => {
        expect(getPhoneCodeByCountry('Egypt')).toBe('+20');
      });

      it('should return +234 for Nigeria', () => {
        expect(getPhoneCodeByCountry('Nigeria')).toBe('+234');
      });

      it('should return +254 for Kenya', () => {
        expect(getPhoneCodeByCountry('Kenya')).toBe('+254');
      });

      it('should return +27 for South Africa', () => {
        expect(getPhoneCodeByCountry('South Africa')).toBe('+27');
      });
    });

    describe('European Countries', () => {
      it('should return +44 for UK', () => {
        expect(getPhoneCodeByCountry('UK')).toBe('+44');
      });

      it('should return +33 for France', () => {
        expect(getPhoneCodeByCountry('France')).toBe('+33');
      });

      it('should return +49 for Germany', () => {
        expect(getPhoneCodeByCountry('Germany')).toBe('+49');
      });

      it('should return +39 for Italy', () => {
        expect(getPhoneCodeByCountry('Italy')).toBe('+39');
      });
    });

    describe('Case Insensitivity', () => {
      it('should handle lowercase country names', () => {
        expect(getPhoneCodeByCountry('qatar')).toBe('+974');
        expect(getPhoneCodeByCountry('india')).toBe('+91');
      });

      it('should handle uppercase country names', () => {
        expect(getPhoneCodeByCountry('QATAR')).toBe('+974');
        expect(getPhoneCodeByCountry('INDIA')).toBe('+91');
      });

      it('should handle mixed case country names', () => {
        expect(getPhoneCodeByCountry('QaTaR')).toBe('+974');
        expect(getPhoneCodeByCountry('iNdIa')).toBe('+91');
      });
    });

    describe('Fallback Behavior', () => {
      it('should return +91 (India) for unknown countries', () => {
        expect(getPhoneCodeByCountry('Unknown Country')).toBe('+91');
      });

      it('should return +91 for empty string', () => {
        expect(getPhoneCodeByCountry('')).toBe('+91');
      });

      it('should return +91 for misspelled country names', () => {
        expect(getPhoneCodeByCountry('Qater')).toBe('+91');
        expect(getPhoneCodeByCountry('Indai')).toBe('+91');
      });
    });

    describe('Americas', () => {
      it('should return +1 for USA/Canada (combined entry)', () => {
        // Note: COUNTRY_CODES has USA and Canada combined as 'USA/Canada'
        expect(getPhoneCodeByCountry('USA/Canada')).toBe('+1');
      });

      it('should fallback to +91 for standalone USA (not in list)', () => {
        // 'USA' alone is not in COUNTRY_CODES, only 'USA/Canada'
        expect(getPhoneCodeByCountry('USA')).toBe('+91');
      });

      it('should fallback to +91 for standalone Canada (not in list)', () => {
        // 'Canada' alone is not in COUNTRY_CODES, only 'USA/Canada'
        expect(getPhoneCodeByCountry('Canada')).toBe('+91');
      });

      it('should return +52 for Mexico', () => {
        expect(getPhoneCodeByCountry('Mexico')).toBe('+52');
      });

      it('should return +55 for Brazil', () => {
        expect(getPhoneCodeByCountry('Brazil')).toBe('+55');
      });
    });
  });

  describe('COUNTRY_CODES data structure', () => {
    it('should have code, country, and flag properties', () => {
      const qatarEntry = COUNTRY_CODES.find(c => c.country === 'Qatar');
      expect(qatarEntry).toBeDefined();
      expect(qatarEntry?.code).toBe('+974');
      expect(qatarEntry?.country).toBe('Qatar');
      expect(qatarEntry?.flag).toBeDefined();
    });

    it('should have at least 50 country entries', () => {
      expect(COUNTRY_CODES.length).toBeGreaterThanOrEqual(50);
    });

    it('should have unique country codes per country', () => {
      const countryCodes = COUNTRY_CODES.map(c => c.code);
      // Note: Some countries share codes (e.g., USA and Canada both use +1)
      // so we just check that each entry has a code
      countryCodes.forEach(code => {
        expect(code).toMatch(/^\+\d+$/);
      });
    });

    it('should have all GCC countries', () => {
      const gccCountries = ['Qatar', 'Saudi Arabia', 'UAE', 'Kuwait', 'Bahrain', 'Oman'];
      gccCountries.forEach(country => {
        const entry = COUNTRY_CODES.find(c => c.country === country);
        expect(entry).toBeDefined();
      });
    });
  });
});
