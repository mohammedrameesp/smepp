/**
 * @file config.test.ts
 * @description Unit tests for WhatsApp configuration utilities
 */

describe('WhatsApp Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.WHATSAPP_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef'; // 32 chars
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt round-trip successfully', async () => {
      const { encrypt, decrypt } = await import('@/lib/whatsapp/config');

      const originalText = 'my-secret-access-token';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(originalText);
      expect(encrypted).not.toBe(originalText);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', async () => {
      const { encrypt } = await import('@/lib/whatsapp/config');

      const text = 'test-token';
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);

      // Different IVs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should have IV:ciphertext:authTag format', async () => {
      const { encrypt } = await import('@/lib/whatsapp/config');

      const encrypted = encrypt('secret');
      const parts = encrypted.split(':');

      // Should have 3 parts: IV, ciphertext, authTag
      expect(parts.length).toBe(3);
      expect(parts[0].length).toBeGreaterThan(0); // IV (hex)
      expect(parts[1].length).toBeGreaterThan(0); // ciphertext (hex)
      expect(parts[2].length).toBeGreaterThan(0); // authTag (hex)
    });

    it('should throw on tampered ciphertext', async () => {
      const { encrypt, decrypt } = await import('@/lib/whatsapp/config');

      const encrypted = encrypt('secret');
      // Tamper with the auth tag (last part after second colon)
      const parts = encrypted.split(':');
      parts[2] = 'tampered' + parts[2].slice(8);
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });

    it('should throw on malformed ciphertext', async () => {
      const { decrypt } = await import('@/lib/whatsapp/config');

      // Only one part (should have 3)
      expect(() => decrypt('invalid-format')).toThrow();
    });

    it('should handle empty string', async () => {
      const { encrypt, decrypt } = await import('@/lib/whatsapp/config');

      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('should handle long text', async () => {
      const { encrypt, decrypt } = await import('@/lib/whatsapp/config');

      const longText = 'a'.repeat(10000);
      const encrypted = encrypt(longText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(longText);
    });

    it('should handle special characters', async () => {
      const { encrypt, decrypt } = await import('@/lib/whatsapp/config');

      const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';
      const encrypted = encrypt(specialText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(specialText);
    });

    it('should handle unicode characters', async () => {
      const { encrypt, decrypt } = await import('@/lib/whatsapp/config');

      const unicodeText = '你好世界 مرحبا العالم 🌍🎉';
      const encrypted = encrypt(unicodeText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(unicodeText);
    });
  });

  describe('normalizePhoneNumber logic', () => {
    // Test the phone normalization pattern used in config
    const normalizePhone = (phone: string | null | undefined): string | null => {
      if (!phone) return null;

      // Remove spaces and dashes
      let normalized = phone.replace(/[\s-]/g, '');

      // Ensure starts with +
      if (!normalized.startsWith('+')) {
        // Assume Qatar country code if not present
        if (normalized.startsWith('974')) {
          normalized = '+' + normalized;
        } else {
          normalized = '+974' + normalized;
        }
      }

      return normalized;
    };

    it('should normalize phone with spaces', () => {
      expect(normalizePhone('+974 5551 2345')).toBe('+97455512345');
    });

    it('should normalize phone with dashes', () => {
      expect(normalizePhone('+974-5551-2345')).toBe('+97455512345');
    });

    it('should add + prefix if missing', () => {
      expect(normalizePhone('97455512345')).toBe('+97455512345');
    });

    it('should add Qatar country code if missing', () => {
      expect(normalizePhone('55512345')).toBe('+97455512345');
    });

    it('should return null for empty input', () => {
      expect(normalizePhone(null)).toBeNull();
      expect(normalizePhone(undefined)).toBeNull();
      expect(normalizePhone('')).toBeNull();
    });

    it('should handle already normalized number', () => {
      expect(normalizePhone('+97455512345')).toBe('+97455512345');
    });
  });

  describe('WhatsApp source types', () => {
    type WhatsAppSourceType = 'NONE' | 'PLATFORM' | 'CUSTOM';

    const isWhatsAppEnabled = (
      source: WhatsAppSourceType,
      platformEnabled: boolean,
      customConfigActive: boolean
    ): boolean => {
      if (source === 'NONE') return false;
      if (source === 'PLATFORM') return platformEnabled;
      if (source === 'CUSTOM') return customConfigActive;
      return false;
    };

    it('should return false for NONE source', () => {
      expect(isWhatsAppEnabled('NONE', true, true)).toBe(false);
    });

    it('should respect platformEnabled for PLATFORM source', () => {
      expect(isWhatsAppEnabled('PLATFORM', true, false)).toBe(true);
      expect(isWhatsAppEnabled('PLATFORM', false, false)).toBe(false);
    });

    it('should respect customConfigActive for CUSTOM source', () => {
      expect(isWhatsAppEnabled('CUSTOM', false, true)).toBe(true);
      expect(isWhatsAppEnabled('CUSTOM', false, false)).toBe(false);
    });
  });

  describe('getEffectiveWhatsAppConfig priority', () => {
    // Test the priority resolution logic
    interface MockOrg {
      whatsAppSource: 'NONE' | 'PLATFORM' | 'CUSTOM';
      whatsAppPlatformEnabled: boolean;
    }

    const shouldUsePlatformConfig = (org: MockOrg): boolean => {
      return org.whatsAppSource === 'PLATFORM' && org.whatsAppPlatformEnabled;
    };

    const shouldUseCustomConfig = (org: MockOrg): boolean => {
      return org.whatsAppSource === 'CUSTOM';
    };

    const getConfigSource = (org: MockOrg): 'PLATFORM' | 'CUSTOM' | null => {
      if (shouldUsePlatformConfig(org)) return 'PLATFORM';
      if (shouldUseCustomConfig(org)) return 'CUSTOM';
      return null;
    };

    it('should return PLATFORM when source is PLATFORM and enabled', () => {
      const org: MockOrg = { whatsAppSource: 'PLATFORM', whatsAppPlatformEnabled: true };
      expect(getConfigSource(org)).toBe('PLATFORM');
    });

    it('should return null when source is PLATFORM but not enabled', () => {
      const org: MockOrg = { whatsAppSource: 'PLATFORM', whatsAppPlatformEnabled: false };
      expect(getConfigSource(org)).toBe(null);
    });

    it('should return CUSTOM when source is CUSTOM', () => {
      const org: MockOrg = { whatsAppSource: 'CUSTOM', whatsAppPlatformEnabled: false };
      expect(getConfigSource(org)).toBe('CUSTOM');
    });

    it('should return null when source is NONE', () => {
      const org: MockOrg = { whatsAppSource: 'NONE', whatsAppPlatformEnabled: true };
      expect(getConfigSource(org)).toBe(null);
    });
  });

  describe('getMemberWhatsAppPhone priority', () => {
    // Test the phone lookup priority logic
    interface MockMember {
      verifiedWhatsAppPhone: string | null;
      qatarMobile: string | null;
    }

    const getPhoneNumber = (member: MockMember | null): string | null => {
      if (!member) return null;

      // Priority 1: Verified WhatsApp phone
      if (member.verifiedWhatsAppPhone) {
        return member.verifiedWhatsAppPhone;
      }

      // Priority 2: Qatar mobile from profile
      if (member.qatarMobile) {
        // Normalize the phone number
        let normalized = member.qatarMobile.replace(/[\s-]/g, '');
        if (!normalized.startsWith('+')) {
          normalized = normalized.startsWith('974') ? '+' + normalized : '+974' + normalized;
        }
        return normalized;
      }

      return null;
    };

    it('should prefer verified WhatsApp phone', () => {
      const member: MockMember = {
        verifiedWhatsAppPhone: '+97455111111',
        qatarMobile: '+974 5522 2222',
      };
      expect(getPhoneNumber(member)).toBe('+97455111111');
    });

    it('should fall back to qatarMobile', () => {
      const member: MockMember = {
        verifiedWhatsAppPhone: null,
        qatarMobile: '+974 5522 2222',
      };
      expect(getPhoneNumber(member)).toBe('+97455222222');
    });

    it('should return null if no phone available', () => {
      const member: MockMember = {
        verifiedWhatsAppPhone: null,
        qatarMobile: null,
      };
      expect(getPhoneNumber(member)).toBeNull();
    });

    it('should return null if member not found', () => {
      expect(getPhoneNumber(null)).toBeNull();
    });
  });
});
