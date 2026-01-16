/**
 * @file index.ts
 * @description Approvals module exports. Re-exports the approval engine for multi-level
 *              approval workflows across leave requests, purchase requests, and asset requests.
 * @module domains/system/approvals
 */

export * from './approval-engine';
export * from './default-policies';
export * from './process-entity-approval';
