/**
 * @file client.test.ts
 * @description Unit tests for QNAS (Qatar National Address System) API client
 * @module tests/unit/lib/qnas
 *
 * Tests cover:
 * - Configuration checking (isQNASConfigured)
 * - API error handling (missing credentials, failed requests)
 * - Input validation (empty zone, street, building)
 * - Response parsing (handles both wrapped and raw array formats)
 * - 404 handling for location lookups
 */

// Store original env
const originalEnv = process.env;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after setting up mocks
import {
  isQNASConfigured,
  fetchZones,
  fetchStreets,
  fetchBuildings,
  fetchLocation,
  QNASApiError,
} from '@/lib/qnas';

describe('QNAS Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env to configured state for most tests
    process.env = {
      ...originalEnv,
      QNAS_API_TOKEN: 'test-token',
      QNAS_API_DOMAIN: 'test-domain.com',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('isQNASConfigured', () => {
    it('should return true when both QNAS_API_TOKEN and QNAS_API_DOMAIN are set', () => {
      process.env.QNAS_API_TOKEN = 'test-token';
      process.env.QNAS_API_DOMAIN = 'test-domain.com';

      expect(isQNASConfigured()).toBe(true);
    });

    it('should return false when QNAS_API_TOKEN is missing', () => {
      delete process.env.QNAS_API_TOKEN;
      process.env.QNAS_API_DOMAIN = 'test-domain.com';

      expect(isQNASConfigured()).toBe(false);
    });

    it('should return false when QNAS_API_DOMAIN is missing', () => {
      process.env.QNAS_API_TOKEN = 'test-token';
      delete process.env.QNAS_API_DOMAIN;

      expect(isQNASConfigured()).toBe(false);
    });

    it('should return false when both env vars are missing', () => {
      delete process.env.QNAS_API_TOKEN;
      delete process.env.QNAS_API_DOMAIN;

      expect(isQNASConfigured()).toBe(false);
    });

    it('should return false when env vars are empty strings', () => {
      process.env.QNAS_API_TOKEN = '';
      process.env.QNAS_API_DOMAIN = '';

      expect(isQNASConfigured()).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FETCH ZONES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('fetchZones', () => {
    it('should throw QNASApiError when not configured', async () => {
      delete process.env.QNAS_API_TOKEN;
      delete process.env.QNAS_API_DOMAIN;

      await expect(fetchZones()).rejects.toThrow(QNASApiError);
      await expect(fetchZones()).rejects.toThrow('QNAS API not configured');
    });

    it('should fetch zones successfully with wrapped response', async () => {
      const mockZones = [
        { zone_number: 1, zone_name_en: 'Doha', zone_name_ar: 'الدوحة' },
        { zone_number: 2, zone_name_en: 'Al Wakra', zone_name_ar: 'الوكرة' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ zones: mockZones }),
      });

      const result = await fetchZones();

      expect(result).toEqual(mockZones);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://qnas.qa/get_zones',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Token': 'test-token',
            'X-Domain': 'test-domain.com',
          }),
        })
      );
    });

    it('should handle raw array response format', async () => {
      const mockZones = [
        { zone_number: 1, zone_name_en: 'Doha', zone_name_ar: 'الدوحة' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockZones, // Raw array, not wrapped
      });

      const result = await fetchZones();

      expect(result).toEqual(mockZones);
    });

    it('should return empty array when response has empty zones array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ zones: [] }),
      });

      const result = await fetchZones();

      expect(result).toEqual([]);
    });

    it('should throw QNASApiError on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error details',
      });

      await expect(fetchZones()).rejects.toThrow(QNASApiError);

      // Reset mock for second assertion
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error details',
      });

      await expect(fetchZones()).rejects.toThrow('Failed to fetch zones');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FETCH STREETS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('fetchStreets', () => {
    it('should throw QNASApiError when zone is empty', async () => {
      await expect(fetchStreets('')).rejects.toThrow(QNASApiError);
      await expect(fetchStreets('')).rejects.toThrow('Zone is required');
    });

    it('should fetch streets successfully with wrapped response', async () => {
      const mockStreets = [
        { street_number: 1, street_name_en: 'Main Street', street_name_ar: 'الشارع الرئيسي' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ streets: mockStreets }),
      });

      const result = await fetchStreets('24');

      expect(result).toEqual(mockStreets);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://qnas.qa/get_streets/24',
        expect.any(Object)
      );
    });

    it('should handle raw array response format', async () => {
      const mockStreets = [
        { street_number: 1, street_name_en: 'Main Street', street_name_ar: 'الشارع الرئيسي' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStreets,
      });

      const result = await fetchStreets('24');

      expect(result).toEqual(mockStreets);
    });

    it('should URL-encode zone parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      await fetchStreets('zone with spaces');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://qnas.qa/get_streets/zone%20with%20spaces',
        expect.any(Object)
      );
    });

    it('should throw QNASApiError on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid zone',
      });

      await expect(fetchStreets('invalid')).rejects.toThrow(QNASApiError);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FETCH BUILDINGS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('fetchBuildings', () => {
    it('should throw QNASApiError when zone is empty', async () => {
      await expect(fetchBuildings('', '123')).rejects.toThrow(QNASApiError);
      await expect(fetchBuildings('', '123')).rejects.toThrow('Zone and street are required');
    });

    it('should throw QNASApiError when street is empty', async () => {
      await expect(fetchBuildings('24', '')).rejects.toThrow(QNASApiError);
      await expect(fetchBuildings('24', '')).rejects.toThrow('Zone and street are required');
    });

    it('should throw QNASApiError when both are empty', async () => {
      await expect(fetchBuildings('', '')).rejects.toThrow(QNASApiError);
    });

    it('should fetch buildings successfully with wrapped response', async () => {
      const mockBuildings = [
        { building_number: 1, latitude: 25.2854, longitude: 51.5310 },
        { building_number: 2 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ buildings: mockBuildings }),
      });

      const result = await fetchBuildings('24', '123');

      expect(result).toEqual(mockBuildings);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://qnas.qa/get_buildings/24/123',
        expect.any(Object)
      );
    });

    it('should handle raw array response format', async () => {
      const mockBuildings = [{ building_number: 1 }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBuildings,
      });

      const result = await fetchBuildings('24', '123');

      expect(result).toEqual(mockBuildings);
    });

    it('should URL-encode both parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      await fetchBuildings('zone 1', 'street 2');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://qnas.qa/get_buildings/zone%201/street%202',
        expect.any(Object)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FETCH LOCATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('fetchLocation', () => {
    it('should throw QNASApiError when zone is empty', async () => {
      await expect(fetchLocation('', '123', '45')).rejects.toThrow(QNASApiError);
      await expect(fetchLocation('', '123', '45')).rejects.toThrow('Zone, street, and building are required');
    });

    it('should throw QNASApiError when street is empty', async () => {
      await expect(fetchLocation('24', '', '45')).rejects.toThrow(QNASApiError);
    });

    it('should throw QNASApiError when building is empty', async () => {
      await expect(fetchLocation('24', '123', '')).rejects.toThrow(QNASApiError);
    });

    it('should fetch location successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ latitude: '25.2854', longitude: '51.5310' }),
      });

      const result = await fetchLocation('24', '123', '45');

      expect(result).toEqual({
        latitude: 25.2854,
        longitude: 51.5310,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://qnas.qa/get_location/24/123/45',
        expect.any(Object)
      );
    });

    it('should parse string coordinates to numbers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ latitude: '25.12345', longitude: '51.67890' }),
      });

      const result = await fetchLocation('24', '123', '45');

      expect(result).toEqual({
        latitude: 25.12345,
        longitude: 51.6789,
      });
      expect(typeof result?.latitude).toBe('number');
      expect(typeof result?.longitude).toBe('number');
    });

    it('should return null for 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Address not found',
      });

      const result = await fetchLocation('99', '999', '999');

      expect(result).toBeNull();
    });

    it('should return null when coordinates are missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // No coordinates
      });

      const result = await fetchLocation('24', '123', '45');

      expect(result).toBeNull();
    });

    it('should return null when only latitude is present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ latitude: '25.2854' }), // Missing longitude
      });

      const result = await fetchLocation('24', '123', '45');

      expect(result).toBeNull();
    });

    it('should throw QNASApiError on non-404 errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      await expect(fetchLocation('24', '123', '45')).rejects.toThrow(QNASApiError);

      // Reset mock for second assertion
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      await expect(fetchLocation('24', '123', '45')).rejects.toThrow('Failed to fetch location');
    });

    it('should URL-encode all parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ latitude: '25', longitude: '51' }),
      });

      await fetchLocation('zone 1', 'street 2', 'building 3');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://qnas.qa/get_location/zone%201/street%202/building%203',
        expect.any(Object)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // QNAS API ERROR CLASS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('QNASApiError', () => {
    it('should create error with message only', () => {
      const error = new QNASApiError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('QNASApiError');
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('should create error with message and code', () => {
      const error = new QNASApiError('Test error', 404);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(404);
    });

    it('should create error with message, code, and details', () => {
      const error = new QNASApiError('Test error', 500, { reason: 'Server down' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(500);
      expect(error.details).toEqual({ reason: 'Server down' });
    });

    it('should be instanceof Error', () => {
      const error = new QNASApiError('Test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(QNASApiError);
    });
  });
});
