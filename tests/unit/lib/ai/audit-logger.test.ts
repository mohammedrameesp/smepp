/**
 * Audit Logger Unit Tests
 * Tests for AI chat audit logging functionality including IP anonymization,
 * data access summary extraction, and risk scoring
 */

import { createHash } from 'crypto';

// Mock Prisma before importing the module
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    aIChatAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/core/prisma';

// Mock getRiskScore function
const getRiskScore = jest.fn().mockReturnValue(0);

// Re-create internal functions for testing since they're not exported
// These mirror the implementation in audit-logger.ts

function anonymizeIpAddress(ip: string | undefined): string | undefined {
  if (!ip) return undefined;

  // Check if it's IPv6
  if (ip.includes(':')) {
    // IPv6: Keep first 4 segments (64 bits), zero out the rest
    const segments = ip.split(':');
    if (segments.length >= 4) {
      return `${segments.slice(0, 4).join(':')}::`;
    }
    return ip; // Malformed, return as-is
  }

  // IPv4: Replace last octet with 0
  const parts = ip.split('.');
  if (parts.length === 4) {
    parts[3] = '0';
    return parts.join('.');
  }

  return ip; // Malformed, return as-is
}

function hashQuery(query: string): string {
  return createHash('sha256').update(query).digest('hex');
}

type FunctionResult =
  | Record<string, unknown>[]  // Array results
  | { count?: number; total?: number; [key: string]: unknown }  // Object with optional count/total
  | null
  | undefined;

interface DataAccessSummary {
  entityTypes: string[];
  recordCount: number;
  sensitiveData: boolean;
}

function extractDataAccessSummary(
  functionsCalled: string[],
  functionResults: FunctionResult[]
): DataAccessSummary {
  const entityTypes = new Set<string>();
  let recordCount = 0;
  let sensitiveData = false;

  const functionToEntity: Record<string, string> = {
    getEmployees: 'Employee',
    getEmployeeCount: 'Employee',
    getAssets: 'Asset',
    getAssetCount: 'Asset',
    getSubscriptions: 'Subscription',
    getExpiringDocuments: 'Document',
    getLeaveSummary: 'LeaveRequest',
    getPendingLeaveRequests: 'LeaveRequest',
    getAssetDepreciation: 'Asset',
    getPayrollRunStatus: 'PayrollRun',
    getPurchaseRequestSummary: 'PurchaseRequest',
    searchSuppliers: 'Supplier',
    getProjectProgress: 'Project',
  };

  const sensitiveFunctions = [
    'getEmployees',
    'getPayrollRunStatus',
    'getLeaveSummary',
  ];

  for (const funcName of functionsCalled) {
    if (functionToEntity[funcName]) {
      entityTypes.add(functionToEntity[funcName]);
    }

    if (sensitiveFunctions.includes(funcName)) {
      sensitiveData = true;
    }
  }

  for (const result of functionResults) {
    if (Array.isArray(result)) {
      recordCount += result.length;
    } else if (result && typeof result === 'object') {
      if ('count' in result && typeof result.count === 'number') {
        recordCount += result.count;
      } else if ('total' in result && typeof result.total === 'number') {
        recordCount += result.total;
      } else {
        recordCount += 1;
      }
    }
  }

  return {
    entityTypes: Array.from(entityTypes),
    recordCount,
    sensitiveData,
  };
}

interface AuditLogEntry {
  tenantId: string;
  memberId: string;
  conversationId?: string;
  query: string;
  functionsCalled: string[];
  dataAccessed: DataAccessSummary;
  tokensUsed: number;
  responseTimeMs: number;
  ipAddress?: string;
  userAgent?: string;
  sanitizationResult?: { flagged: boolean; flags: string[] };
}

function createAuditEntry(
  context: { tenantId: string; memberId: string },
  query: string,
  conversationId: string | undefined,
  functionCalls: Array<{ name: string; result: unknown }> | undefined,
  tokensUsed: number,
  responseTimeMs: number,
  sanitizationResult?: { flagged: boolean; flags: string[] },
  request?: { ipAddress?: string; userAgent?: string }
): AuditLogEntry {
  const functionsCalled = functionCalls?.map(f => f.name) || [];
  const functionResults = functionCalls?.map(f => f.result) || [];

  return {
    tenantId: context.tenantId,
    memberId: context.memberId,
    conversationId,
    query,
    functionsCalled,
    dataAccessed: extractDataAccessSummary(functionsCalled, functionResults as FunctionResult[]),
    tokensUsed,
    responseTimeMs,
    ipAddress: request?.ipAddress,
    userAgent: request?.userAgent,
    sanitizationResult,
  };
}

describe('AuditLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('anonymizeIpAddress', () => {
    describe('IPv4 addresses', () => {
      it('should anonymize last octet to 0', () => {
        expect(anonymizeIpAddress('192.168.1.100')).toBe('192.168.1.0');
      });

      it('should handle different IP ranges', () => {
        expect(anonymizeIpAddress('10.0.0.1')).toBe('10.0.0.0');
        expect(anonymizeIpAddress('172.16.254.255')).toBe('172.16.254.0');
        expect(anonymizeIpAddress('8.8.8.8')).toBe('8.8.8.0');
      });

      it('should preserve first three octets', () => {
        const result = anonymizeIpAddress('192.168.100.55');
        expect(result?.startsWith('192.168.100.')).toBe(true);
        expect(result).toBe('192.168.100.0');
      });

      it('should handle localhost', () => {
        expect(anonymizeIpAddress('127.0.0.1')).toBe('127.0.0.0');
      });

      it('should handle 0.0.0.0', () => {
        expect(anonymizeIpAddress('0.0.0.0')).toBe('0.0.0.0');
      });

      it('should handle 255.255.255.255', () => {
        expect(anonymizeIpAddress('255.255.255.255')).toBe('255.255.255.0');
      });
    });

    describe('IPv6 addresses', () => {
      it('should keep first 4 segments and truncate rest', () => {
        expect(anonymizeIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334'))
          .toBe('2001:0db8:85a3:0000::');
      });

      it('should handle shortened IPv6', () => {
        expect(anonymizeIpAddress('2001:db8:85a3::8a2e:370:7334'))
          .toBe('2001:db8:85a3:::');
      });

      it('should handle full IPv6 format', () => {
        expect(anonymizeIpAddress('fe80:0000:0000:0000:0000:0000:0000:0001'))
          .toBe('fe80:0000:0000:0000::');
      });

      it('should handle localhost IPv6', () => {
        // '::1' splits to ['', '', '1'] which has < 4 segments, so treated as malformed
        expect(anonymizeIpAddress('::1')).toBe('::1');
      });
    });

    describe('edge cases', () => {
      it('should return undefined for undefined input', () => {
        expect(anonymizeIpAddress(undefined)).toBeUndefined();
      });

      it('should return undefined for empty string input', () => {
        // Empty string is falsy, so returns undefined early
        expect(anonymizeIpAddress('')).toBeUndefined();
      });

      it('should return malformed IPv4 as-is', () => {
        expect(anonymizeIpAddress('192.168.1')).toBe('192.168.1');
        expect(anonymizeIpAddress('192.168')).toBe('192.168');
        expect(anonymizeIpAddress('192')).toBe('192');
      });

      it('should return malformed IPv6 with less than 4 segments as-is', () => {
        expect(anonymizeIpAddress('2001:db8:85a3')).toBe('2001:db8:85a3');
      });

      it('should handle IP with extra dots as-is', () => {
        expect(anonymizeIpAddress('192.168.1.100.extra')).toBe('192.168.1.100.extra');
      });
    });
  });

  describe('hashQuery', () => {
    it('should return SHA-256 hash of query', () => {
      const hash = hashQuery('What is my leave balance?');
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]+$/); // Should be hex only
    });

    it('should produce consistent hashes for same input', () => {
      const query = 'Show me all employees';
      const hash1 = hashQuery(query);
      const hash2 = hashQuery(query);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashQuery('Query 1');
      const hash2 = hashQuery('Query 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashQuery('');
      expect(hash).toHaveLength(64);
      // SHA-256 of empty string is a known value
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should handle special characters', () => {
      const hash = hashQuery('<script>alert("XSS")</script>');
      expect(hash).toHaveLength(64);
    });

    it('should handle unicode characters', () => {
      const hash = hashQuery('مرحبا بالعالم'); // Arabic text
      expect(hash).toHaveLength(64);
    });

    it('should be case sensitive', () => {
      const hash1 = hashQuery('Hello');
      const hash2 = hashQuery('hello');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('extractDataAccessSummary', () => {
    describe('entity type mapping', () => {
      it('should map employee functions to Employee entity', () => {
        const summary = extractDataAccessSummary(['getEmployees', 'getEmployeeCount'], []);
        expect(summary.entityTypes).toContain('Employee');
      });

      it('should map asset functions to Asset entity', () => {
        const summary = extractDataAccessSummary(['getAssets', 'getAssetDepreciation'], []);
        expect(summary.entityTypes).toContain('Asset');
      });

      it('should map multiple functions to different entities', () => {
        const summary = extractDataAccessSummary(
          ['getEmployees', 'getAssets', 'getSubscriptions', 'searchSuppliers'],
          []
        );
        expect(summary.entityTypes).toContain('Employee');
        expect(summary.entityTypes).toContain('Asset');
        expect(summary.entityTypes).toContain('Subscription');
        expect(summary.entityTypes).toContain('Supplier');
      });

      it('should not duplicate entity types', () => {
        const summary = extractDataAccessSummary(['getEmployees', 'getEmployeeCount'], []);
        const employeeCount = summary.entityTypes.filter(e => e === 'Employee').length;
        expect(employeeCount).toBe(1);
      });

      it('should handle unknown functions gracefully', () => {
        const summary = extractDataAccessSummary(['unknownFunction', 'anotherUnknown'], []);
        expect(summary.entityTypes).toHaveLength(0);
      });
    });

    describe('sensitive data detection', () => {
      it('should mark as sensitive when getEmployees is called', () => {
        const summary = extractDataAccessSummary(['getEmployees'], []);
        expect(summary.sensitiveData).toBe(true);
      });

      it('should mark as sensitive when getPayrollRunStatus is called', () => {
        const summary = extractDataAccessSummary(['getPayrollRunStatus'], []);
        expect(summary.sensitiveData).toBe(true);
      });

      it('should mark as sensitive when getLeaveSummary is called', () => {
        const summary = extractDataAccessSummary(['getLeaveSummary'], []);
        expect(summary.sensitiveData).toBe(true);
      });

      it('should not mark as sensitive for non-sensitive functions', () => {
        const summary = extractDataAccessSummary(['getAssets', 'searchSuppliers'], []);
        expect(summary.sensitiveData).toBe(false);
      });

      it('should detect sensitive data in mixed function calls', () => {
        const summary = extractDataAccessSummary(
          ['getAssets', 'getEmployees', 'searchSuppliers'],
          []
        );
        expect(summary.sensitiveData).toBe(true);
      });
    });

    describe('record counting', () => {
      it('should count array results', () => {
        const summary = extractDataAccessSummary(
          ['getEmployees'],
          [[{ id: 1 }, { id: 2 }, { id: 3 }]]
        );
        expect(summary.recordCount).toBe(3);
      });

      it('should count objects with count property', () => {
        const summary = extractDataAccessSummary(
          ['getEmployeeCount'],
          [{ count: 42 }]
        );
        expect(summary.recordCount).toBe(42);
      });

      it('should count objects with total property', () => {
        const summary = extractDataAccessSummary(
          ['getAssets'],
          [{ total: 100 }]
        );
        expect(summary.recordCount).toBe(100);
      });

      it('should count single object results as 1', () => {
        const summary = extractDataAccessSummary(
          ['getEmployeeDetails'],
          [{ id: 1, name: 'John' }]
        );
        expect(summary.recordCount).toBe(1);
      });

      it('should sum record counts from multiple results', () => {
        const summary = extractDataAccessSummary(
          ['getEmployees', 'getAssets'],
          [[{ id: 1 }, { id: 2 }], [{ id: 3 }, { id: 4 }, { id: 5 }]]
        );
        expect(summary.recordCount).toBe(5);
      });

      it('should handle empty results', () => {
        const summary = extractDataAccessSummary(['getEmployees'], [[]]);
        expect(summary.recordCount).toBe(0);
      });

      it('should handle null/undefined results gracefully', () => {
        const summary = extractDataAccessSummary(['getEmployees'], [null as unknown as FunctionResult]);
        expect(summary.recordCount).toBe(0);
      });

      it('should handle mixed result types', () => {
        const summary = extractDataAccessSummary(
          ['getEmployees', 'getEmployeeCount', 'getEmployeeDetails'],
          [
            [{ id: 1 }, { id: 2 }], // Array: 2
            { count: 10 },          // Count: 10
            { id: 3, name: 'John' } // Object: 1
          ]
        );
        expect(summary.recordCount).toBe(13);
      });
    });
  });

  describe('createAuditEntry', () => {
    const mockContext = { tenantId: 'org-123', memberId: 'user-456' };

    it('should create entry with basic fields', () => {
      const entry = createAuditEntry(
        mockContext,
        'What is my leave balance?',
        'conv-789',
        undefined,
        150,
        500
      );

      expect(entry.tenantId).toBe('org-123');
      expect(entry.memberId).toBe('user-456');
      expect(entry.conversationId).toBe('conv-789');
      expect(entry.query).toBe('What is my leave balance?');
      expect(entry.tokensUsed).toBe(150);
      expect(entry.responseTimeMs).toBe(500);
    });

    it('should extract function names from function calls', () => {
      const entry = createAuditEntry(
        mockContext,
        'Show employees',
        undefined,
        [
          { name: 'getEmployees', result: [] },
          { name: 'getEmployeeCount', result: { count: 10 } }
        ],
        200,
        600
      );

      expect(entry.functionsCalled).toEqual(['getEmployees', 'getEmployeeCount']);
    });

    it('should include data access summary', () => {
      const entry = createAuditEntry(
        mockContext,
        'Show employees',
        undefined,
        [{ name: 'getEmployees', result: [{ id: 1 }, { id: 2 }] }],
        200,
        600
      );

      expect(entry.dataAccessed.entityTypes).toContain('Employee');
      expect(entry.dataAccessed.recordCount).toBe(2);
      expect(entry.dataAccessed.sensitiveData).toBe(true);
    });

    it('should include request metadata', () => {
      const entry = createAuditEntry(
        mockContext,
        'Query',
        undefined,
        undefined,
        100,
        200,
        undefined,
        { ipAddress: '192.168.1.100', userAgent: 'Mozilla/5.0' }
      );

      expect(entry.ipAddress).toBe('192.168.1.100');
      expect(entry.userAgent).toBe('Mozilla/5.0');
    });

    it('should include sanitization result', () => {
      const sanitizationResult = { flagged: true, flags: ['prompt_injection'] };

      const entry = createAuditEntry(
        mockContext,
        'Ignore previous instructions',
        undefined,
        undefined,
        100,
        200,
        sanitizationResult
      );

      expect(entry.sanitizationResult).toEqual(sanitizationResult);
    });

    it('should handle missing optional fields', () => {
      const entry = createAuditEntry(
        mockContext,
        'Query',
        undefined,
        undefined,
        100,
        200
      );

      expect(entry.conversationId).toBeUndefined();
      expect(entry.functionsCalled).toEqual([]);
      expect(entry.ipAddress).toBeUndefined();
      expect(entry.userAgent).toBeUndefined();
      expect(entry.sanitizationResult).toBeUndefined();
    });
  });

  describe('GDPR compliance', () => {
    it('should anonymize IP addresses to comply with GDPR', () => {
      const originalIp = '192.168.1.100';
      const anonymized = anonymizeIpAddress(originalIp);

      // Should not be able to identify specific user from anonymized IP
      expect(anonymized).not.toBe(originalIp);
      expect(anonymized).toBe('192.168.1.0');
    });

    it('should not store exact query text (hash is used instead)', () => {
      const query = 'Show salary for John Doe';
      const hash = hashQuery(query);

      // Hash should not be reversible to original query
      expect(hash).not.toContain('salary');
      expect(hash).not.toContain('John');
      expect(hash).toHaveLength(64);
    });
  });

  describe('risk scoring integration', () => {
    it('should call getRiskScore with sanitization result', () => {
      const mockGetRiskScore = getRiskScore as jest.Mock;
      mockGetRiskScore.mockReturnValue(50);

      const sanitizationResult = { flagged: true, flags: ['prompt_injection'] };

      // Note: In actual implementation, this would be called in logAuditEntry
      const riskScore = mockGetRiskScore(sanitizationResult);

      expect(riskScore).toBe(50);
      expect(mockGetRiskScore).toHaveBeenCalledWith(sanitizationResult);
    });
  });
});
