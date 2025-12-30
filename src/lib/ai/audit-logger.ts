/**
 * AI Chat Audit Logger
 *
 * Logs AI chat interactions for security monitoring, compliance, and debugging.
 * Uses SHA-256 hashing for privacy-friendly query tracking.
 */

import { createHash } from 'crypto';
import { prisma } from '@/lib/core/prisma';
import type { SanitizationResult } from './input-sanitizer';
import { getRiskScore } from './input-sanitizer';

export interface AuditLogEntry {
  tenantId: string;
  userId: string;
  conversationId?: string;
  query: string;
  functionsCalled: string[];
  dataAccessed: DataAccessSummary;
  tokensUsed: number;
  responseTimeMs: number;
  ipAddress?: string;
  userAgent?: string;
  sanitizationResult?: SanitizationResult;
}

export interface DataAccessSummary {
  entityTypes: string[];  // e.g., ['Employee', 'Asset', 'Subscription']
  recordCount: number;
  sensitiveData: boolean; // Whether salary, personal info, etc. was accessed
}

/**
 * Generate SHA-256 hash of query for privacy-friendly tracking
 */
function hashQuery(query: string): string {
  return createHash('sha256').update(query).digest('hex');
}

/**
 * Extract data access summary from function calls
 */
function extractDataAccessSummary(
  functionsCalled: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  functionResults: any[]
): DataAccessSummary {
  const entityTypes = new Set<string>();
  let recordCount = 0;
  let sensitiveData = false;

  // Map function names to entity types
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

  // Sensitive data functions
  const sensitiveFunctions = [
    'getEmployees', // Contains salary info
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

  // Count records from results
  for (const result of functionResults) {
    if (Array.isArray(result)) {
      recordCount += result.length;
    } else if (result && typeof result === 'object') {
      if ('count' in result) {
        recordCount += result.count;
      } else if ('total' in result) {
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

/**
 * Log an AI chat interaction
 */
export async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  try {
    const queryHash = hashQuery(entry.query);
    const riskScore = entry.sanitizationResult
      ? getRiskScore(entry.sanitizationResult)
      : 0;

    const flagged = riskScore >= 30 || entry.sanitizationResult?.flagged || false;
    const flagReasons = entry.sanitizationResult?.flags || [];

    await prisma.aIChatAuditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        conversationId: entry.conversationId,
        queryHash,
        queryLength: entry.query.length,
        functionsCalled: JSON.parse(JSON.stringify(entry.functionsCalled)),
        dataAccessed: JSON.parse(JSON.stringify(entry.dataAccessed)),
        tokensUsed: entry.tokensUsed,
        responseTimeMs: entry.responseTimeMs,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        flagged,
        flagReasons,
        riskScore,
      },
    });

    // Log high-risk entries to console for immediate attention
    if (flagged) {
      console.warn(
        `[AI Audit] Flagged query from user ${entry.userId} in org ${entry.tenantId}:`,
        {
          riskScore,
          flags: flagReasons,
          functionsCalled: entry.functionsCalled,
          sensitiveDataAccessed: entry.dataAccessed.sensitiveData,
        }
      );
    }
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('[AI Audit] Failed to log audit entry:', error);
  }
}

/**
 * Create audit entry from chat response
 */
export function createAuditEntry(
  context: { tenantId: string; userId: string },
  query: string,
  conversationId: string | undefined,
  functionCalls: Array<{ name: string; result: unknown }> | undefined,
  tokensUsed: number,
  responseTimeMs: number,
  sanitizationResult?: SanitizationResult,
  request?: { ipAddress?: string; userAgent?: string }
): AuditLogEntry {
  const functionsCalled = functionCalls?.map(f => f.name) || [];
  const functionResults = functionCalls?.map(f => f.result) || [];

  return {
    tenantId: context.tenantId,
    userId: context.userId,
    conversationId,
    query,
    functionsCalled,
    dataAccessed: extractDataAccessSummary(functionsCalled, functionResults),
    tokensUsed,
    responseTimeMs,
    ipAddress: request?.ipAddress,
    userAgent: request?.userAgent,
    sanitizationResult,
  };
}

/**
 * Get audit log summary for an organization
 */
export async function getAuditSummary(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalQueries: number;
  flaggedQueries: number;
  uniqueUsers: number;
  topFunctions: Array<{ name: string; count: number }>;
  avgRiskScore: number;
}> {
  const logs = await prisma.aIChatAuditLog.findMany({
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      userId: true,
      flagged: true,
      riskScore: true,
      functionsCalled: true,
    },
  });

  const totalQueries = logs.length;
  const flaggedQueries = logs.filter(l => l.flagged).length;
  const uniqueUsers = new Set(logs.map(l => l.userId)).size;
  const avgRiskScore = totalQueries > 0
    ? Math.round(logs.reduce((sum, l) => sum + l.riskScore, 0) / totalQueries)
    : 0;

  // Count function usage
  const functionCounts = new Map<string, number>();
  for (const log of logs) {
    const funcs = log.functionsCalled as string[];
    if (Array.isArray(funcs)) {
      for (const func of funcs) {
        functionCounts.set(func, (functionCounts.get(func) || 0) + 1);
      }
    }
  }

  const topFunctions = Array.from(functionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    totalQueries,
    flaggedQueries,
    uniqueUsers,
    topFunctions,
    avgRiskScore,
  };
}

/**
 * Get flagged queries for review
 */
export async function getFlaggedQueries(
  tenantId: string,
  limit = 50
): Promise<Array<{
  id: string;
  userId: string;
  queryHash: string;
  flagReasons: string[];
  riskScore: number;
  functionsCalled: unknown;
  createdAt: Date;
}>> {
  return prisma.aIChatAuditLog.findMany({
    where: {
      tenantId,
      flagged: true,
    },
    select: {
      id: true,
      userId: true,
      queryHash: true,
      flagReasons: true,
      riskScore: true,
      functionsCalled: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Clean up old audit logs (retention policy)
 */
export async function cleanupOldAuditLogs(
  retentionDays = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.aIChatAuditLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      flagged: false, // Keep flagged entries longer
    },
  });

  return result.count;
}
