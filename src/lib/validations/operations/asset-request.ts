/**
 * @file asset-request.ts
 * @description Validation schemas for asset request workflows including employee requests, admin assignments, and approvals
 * @module validations/operations
 */

import { z } from 'zod';
import { AssetRequestType, AssetRequestStatus } from '@prisma/client';

// Employee requesting an asset
export const createAssetRequestSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  reason: z.string().min(1, 'Please provide a reason for your request').max(500),
  notes: z.string().max(1000).optional().nullable(),
});

// Admin assigning an asset to a user
export const createAssetAssignmentSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  userId: z.string().min(1, 'User is required'),
  reason: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// User requesting to return an asset
export const createReturnRequestSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  reason: z.string().min(1, 'Please provide a reason for returning the asset').max(500),
  notes: z.string().max(1000).optional().nullable(),
});

// Admin approving a request (employee request or return)
export const approveAssetRequestSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
});

// Admin rejecting a request
export const rejectAssetRequestSchema = z.object({
  reason: z.string().min(1, 'Please provide a reason for rejection').max(500),
});

// User accepting an assignment
export const acceptAssetAssignmentSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
});

// User declining an assignment
export const declineAssetAssignmentSchema = z.object({
  reason: z.string().min(1, 'Please provide a reason for declining').max(500),
});

// Query schema for listing asset requests
export const assetRequestQuerySchema = z.object({
  q: z.string().optional(),
  type: z.nativeEnum(AssetRequestType).optional(),
  status: z.nativeEnum(AssetRequestStatus).optional(),
  userId: z.string().optional(),
  assetId: z.string().optional(),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(['createdAt', 'updatedAt', 'requestNumber', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Type exports
export type CreateAssetRequestData = z.infer<typeof createAssetRequestSchema>;
export type CreateAssetAssignmentData = z.infer<typeof createAssetAssignmentSchema>;
export type CreateReturnRequestData = z.infer<typeof createReturnRequestSchema>;
export type ApproveAssetRequestData = z.infer<typeof approveAssetRequestSchema>;
export type RejectAssetRequestData = z.infer<typeof rejectAssetRequestSchema>;
export type AcceptAssetAssignmentData = z.infer<typeof acceptAssetAssignmentSchema>;
export type DeclineAssetAssignmentData = z.infer<typeof declineAssetAssignmentSchema>;
export type AssetRequestQuery = z.infer<typeof assetRequestQuerySchema>;
