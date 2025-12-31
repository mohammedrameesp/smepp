/**
 * @file index.ts
 * @description Two-factor authentication module exports. Provides TOTP, backup codes,
 *              encryption, and re-verification enforcement for enhanced security.
 * @module two-factor
 */

export * from './totp';
export * from './backup-codes';
export * from './encryption';
export * from './require-recent-2fa';
