import { z } from 'zod';

export const uploadSchema = z.object({
  entityType: z.enum(['asset', 'subscription']),
  entityId: z.string().min(1, 'Entity ID is required'),
  projectCode: z.string().optional().nullable(),
});

export const signedUrlSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  expiresInSec: z.number().min(60).max(86400).optional().default(3600), // 1 minute to 24 hours
});

export type UploadRequest = z.infer<typeof uploadSchema>;
export type SignedUrlRequest = z.infer<typeof signedUrlSchema>;
