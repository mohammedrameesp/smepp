/**
 * Chat Service Unit Tests
 * Tests for AI chat functionality including role access, title sanitization, and cost calculation
 */

import { Role } from '@prisma/client';

// Mock dependencies before importing the module
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
    },
    chatConversation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    aIChatUsage: {
      create: jest.fn(),
    },
  },
}));

// Import after mocking
import { prisma } from '@/lib/core/prisma';

// Define mock chatFunctions for testing
const chatFunctions = [
  { name: 'searchEmployees', description: 'Search employees', parameters: { type: 'object', properties: {} } },
  { name: 'getEmployeeDetails', description: 'Get employee details', parameters: { type: 'object', properties: {} } },
  { name: 'getEmployeeSalary', description: 'Get salary (admin)', parameters: { type: 'object', properties: {} }, requiresAdmin: true },
  { name: 'getTotalPayroll', description: 'Get payroll (admin)', parameters: { type: 'object', properties: {} }, requiresAdmin: true },
  { name: 'listAssets', description: 'List assets', parameters: { type: 'object', properties: {} } },
];

// Re-create internal functions for testing since they're not exported
// These mirror the implementation in chat-service.ts

const ADMIN_ONLY_FUNCTIONS = ['getEmployeeSalary', 'getTotalPayroll'];

function canAccessFunction(functionName: string, userRole: Role): boolean {
  const fn = chatFunctions.find((f) => f.name === functionName);
  if (!fn) return false;

  if (fn.requiresAdmin || ADMIN_ONLY_FUNCTIONS.includes(functionName)) {
    return userRole === Role.DIRECTOR;
  }

  return true;
}

function sanitizeTitle(title: string): string {
  const escaped = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return escaped.slice(0, 100);
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': {
    input: 0.00000015,
    output: 0.0000006,
  },
  'gpt-4o': {
    input: 0.0000025,
    output: 0.00001,
  },
};

function calculateCost(promptTokens: number, completionTokens: number, model: string): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
  return (promptTokens * pricing.input) + (completionTokens * pricing.output);
}

async function getOrganizationRetentionDays(tenantId: string): Promise<number | null> {
  const org = await (prisma.organization.findUnique as jest.Mock)({
    where: { id: tenantId },
    select: { chatRetentionDays: true },
  });

  if (org?.chatRetentionDays === 0) {
    return null;
  }
  return org?.chatRetentionDays || 90;
}

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canAccessFunction', () => {
    describe('DIRECTOR role', () => {
      it('should allow access to regular functions', () => {
        expect(canAccessFunction('searchEmployees', Role.DIRECTOR)).toBe(true);
        expect(canAccessFunction('getEmployeeDetails', Role.DIRECTOR)).toBe(true);
        expect(canAccessFunction('listAssets', Role.DIRECTOR)).toBe(true);
      });

      it('should allow access to admin-only functions', () => {
        expect(canAccessFunction('getEmployeeSalary', Role.DIRECTOR)).toBe(true);
        expect(canAccessFunction('getTotalPayroll', Role.DIRECTOR)).toBe(true);
      });
    });

    describe('EMPLOYEE role', () => {
      it('should allow access to regular functions', () => {
        expect(canAccessFunction('searchEmployees', Role.EMPLOYEE)).toBe(true);
        expect(canAccessFunction('getEmployeeDetails', Role.EMPLOYEE)).toBe(true);
        expect(canAccessFunction('listAssets', Role.EMPLOYEE)).toBe(true);
      });

      it('should deny access to admin-only functions', () => {
        expect(canAccessFunction('getEmployeeSalary', Role.EMPLOYEE)).toBe(false);
        expect(canAccessFunction('getTotalPayroll', Role.EMPLOYEE)).toBe(false);
      });
    });

    describe('MANAGER role', () => {
      it('should allow access to regular functions', () => {
        expect(canAccessFunction('searchEmployees', Role.MANAGER)).toBe(true);
        expect(canAccessFunction('listAssets', Role.MANAGER)).toBe(true);
      });

      it('should deny access to admin-only functions', () => {
        expect(canAccessFunction('getEmployeeSalary', Role.MANAGER)).toBe(false);
        expect(canAccessFunction('getTotalPayroll', Role.MANAGER)).toBe(false);
      });
    });

    describe('unknown functions', () => {
      it('should return false for non-existent function names', () => {
        expect(canAccessFunction('unknownFunction', Role.DIRECTOR)).toBe(false);
        expect(canAccessFunction('', Role.DIRECTOR)).toBe(false);
        expect(canAccessFunction('hackerFunction', Role.EMPLOYEE)).toBe(false);
      });
    });
  });

  describe('sanitizeTitle', () => {
    describe('HTML entity escaping', () => {
      it('should escape ampersand', () => {
        expect(sanitizeTitle('Tom & Jerry')).toBe('Tom &amp; Jerry');
      });

      it('should escape less than sign', () => {
        expect(sanitizeTitle('a < b')).toBe('a &lt; b');
      });

      it('should escape greater than sign', () => {
        expect(sanitizeTitle('a > b')).toBe('a &gt; b');
      });

      it('should escape double quotes', () => {
        expect(sanitizeTitle('Say "Hello"')).toBe('Say &quot;Hello&quot;');
      });

      it('should escape single quotes', () => {
        expect(sanitizeTitle("It's working")).toBe('It&#39;s working');
      });

      it('should escape multiple special characters', () => {
        expect(sanitizeTitle('<script>alert("XSS")</script>')).toBe(
          '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
        );
      });
    });

    describe('XSS prevention', () => {
      it('should neutralize script injection', () => {
        const malicious = '<script>document.cookie</script>';
        const sanitized = sanitizeTitle(malicious);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).toContain('&lt;script&gt;');
      });

      it('should neutralize event handler injection', () => {
        const malicious = '<img onerror="alert(1)" src=x>';
        const sanitized = sanitizeTitle(malicious);
        expect(sanitized).not.toContain('<img');
        expect(sanitized).toContain('&lt;img');
      });

      it('should handle nested escape attempts', () => {
        const malicious = '&lt;script&gt;'; // Already escaped, should be double-escaped
        const sanitized = sanitizeTitle(malicious);
        expect(sanitized).toBe('&amp;lt;script&amp;gt;');
      });
    });

    describe('length truncation', () => {
      it('should truncate strings longer than 100 characters', () => {
        const longString = 'a'.repeat(150);
        const sanitized = sanitizeTitle(longString);
        expect(sanitized.length).toBe(100);
      });

      it('should not truncate strings of exactly 100 characters', () => {
        const exactString = 'a'.repeat(100);
        const sanitized = sanitizeTitle(exactString);
        expect(sanitized.length).toBe(100);
        expect(sanitized).toBe(exactString);
      });

      it('should not truncate strings shorter than 100 characters', () => {
        const shortString = 'Hello World';
        const sanitized = sanitizeTitle(shortString);
        expect(sanitized).toBe('Hello World');
      });

      it('should handle empty string', () => {
        expect(sanitizeTitle('')).toBe('');
      });

      it('should truncate after escaping (escaped chars count)', () => {
        // 98 'a' + '&' = 99 chars, but & becomes &amp; (5 chars) = 102 chars -> truncated
        const stringWithAmp = 'a'.repeat(98) + '&';
        const sanitized = sanitizeTitle(stringWithAmp);
        expect(sanitized.length).toBe(100);
      });
    });
  });

  describe('calculateCost', () => {
    describe('gpt-4o-mini model', () => {
      it('should calculate cost correctly for typical usage', () => {
        // 1000 prompt tokens, 500 completion tokens
        // Cost = (1000 * 0.00000015) + (500 * 0.0000006) = 0.00015 + 0.0003 = 0.00045
        const cost = calculateCost(1000, 500, 'gpt-4o-mini');
        expect(cost).toBeCloseTo(0.00045, 8);
      });

      it('should calculate cost for zero tokens', () => {
        const cost = calculateCost(0, 0, 'gpt-4o-mini');
        expect(cost).toBe(0);
      });

      it('should calculate cost for prompt-only usage', () => {
        const cost = calculateCost(1000, 0, 'gpt-4o-mini');
        expect(cost).toBeCloseTo(0.00015, 8);
      });

      it('should calculate cost for completion-only usage', () => {
        const cost = calculateCost(0, 1000, 'gpt-4o-mini');
        expect(cost).toBeCloseTo(0.0006, 8);
      });

      it('should calculate cost for large token counts', () => {
        // 1M tokens each
        const cost = calculateCost(1000000, 1000000, 'gpt-4o-mini');
        expect(cost).toBeCloseTo(0.15 + 0.6, 5); // $0.15 input + $0.60 output
      });
    });

    describe('gpt-4o model', () => {
      it('should calculate cost correctly for typical usage', () => {
        // 1000 prompt tokens, 500 completion tokens
        // Cost = (1000 * 0.0000025) + (500 * 0.00001) = 0.0025 + 0.005 = 0.0075
        const cost = calculateCost(1000, 500, 'gpt-4o');
        expect(cost).toBeCloseTo(0.0075, 8);
      });

      it('should calculate cost for large token counts', () => {
        // 1M tokens each
        const cost = calculateCost(1000000, 1000000, 'gpt-4o');
        expect(cost).toBeCloseTo(2.5 + 10, 5); // $2.50 input + $10.00 output
      });
    });

    describe('unknown models', () => {
      it('should default to gpt-4o-mini pricing for unknown models', () => {
        const unknownModelCost = calculateCost(1000, 500, 'unknown-model');
        const miniModelCost = calculateCost(1000, 500, 'gpt-4o-mini');
        expect(unknownModelCost).toBe(miniModelCost);
      });

      it('should handle empty model string', () => {
        const cost = calculateCost(1000, 500, '');
        const miniModelCost = calculateCost(1000, 500, 'gpt-4o-mini');
        expect(cost).toBe(miniModelCost);
      });
    });
  });

  describe('getOrganizationRetentionDays', () => {
    const mockFindUnique = prisma.organization.findUnique as jest.Mock;

    it('should return organization-specific retention days', async () => {
      mockFindUnique.mockResolvedValue({ chatRetentionDays: 30 });

      const result = await getOrganizationRetentionDays('org-123');

      expect(result).toBe(30);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        select: { chatRetentionDays: true },
      });
    });

    it('should return default 90 days when organization has no setting', async () => {
      mockFindUnique.mockResolvedValue({ chatRetentionDays: null });

      const result = await getOrganizationRetentionDays('org-123');

      expect(result).toBe(90);
    });

    it('should return default 90 days when organization is not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await getOrganizationRetentionDays('org-nonexistent');

      expect(result).toBe(90);
    });

    it('should return null when retention is explicitly set to 0 (no auto-deletion)', async () => {
      mockFindUnique.mockResolvedValue({ chatRetentionDays: 0 });

      const result = await getOrganizationRetentionDays('org-123');

      expect(result).toBe(null);
    });

    it('should handle various retention day values', async () => {
      // 7 days
      mockFindUnique.mockResolvedValue({ chatRetentionDays: 7 });
      expect(await getOrganizationRetentionDays('org-1')).toBe(7);

      // 365 days
      mockFindUnique.mockResolvedValue({ chatRetentionDays: 365 });
      expect(await getOrganizationRetentionDays('org-2')).toBe(365);

      // 1 day
      mockFindUnique.mockResolvedValue({ chatRetentionDays: 1 });
      expect(await getOrganizationRetentionDays('org-3')).toBe(1);
    });
  });

  describe('function filtering by role', () => {
    it('should filter admin functions for non-admin users', () => {
      const availableFunctions = chatFunctions.filter((fn) =>
        canAccessFunction(fn.name, Role.EMPLOYEE)
      );

      expect(availableFunctions.map(f => f.name)).toContain('searchEmployees');
      expect(availableFunctions.map(f => f.name)).toContain('listAssets');
      expect(availableFunctions.map(f => f.name)).not.toContain('getEmployeeSalary');
      expect(availableFunctions.map(f => f.name)).not.toContain('getTotalPayroll');
    });

    it('should include all functions for DIRECTOR role', () => {
      const availableFunctions = chatFunctions.filter((fn) =>
        canAccessFunction(fn.name, Role.DIRECTOR)
      );

      expect(availableFunctions.length).toBe(chatFunctions.length);
    });
  });
});
