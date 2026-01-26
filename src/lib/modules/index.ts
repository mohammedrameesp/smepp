/**
 * @file index.ts
 * @description Module System - Barrel export for all module-related functionality
 * @module lib/modules
 *
 * This module provides:
 * - Module registry with all feature module definitions
 * - Access control helpers for checking module access
 * - Type definitions for module IDs and configurations
 *
 * @example
 * import {
 *   ModuleId,
 *   isValidModuleId,
 *   hasModuleAccess,
 *   canInstallModule,
 * } from '@/lib/modules';
 */

export * from './registry';
export * from './access';
