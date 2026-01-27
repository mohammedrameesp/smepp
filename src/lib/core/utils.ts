/**
 * @file utils.ts
 * @description General utility functions
 * @module lib/core
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes with proper conflict resolution.
 *
 * Uses clsx for conditional class handling and tailwind-merge for
 * resolving Tailwind CSS class conflicts (e.g., `p-4` vs `p-2`).
 *
 * @param inputs - Class values to merge (strings, objects, arrays, or conditionals)
 * @returns Merged class string with conflicts resolved
 *
 * @example
 * // Basic usage
 * cn('px-4', 'py-2', 'bg-blue-500')
 * // => 'px-4 py-2 bg-blue-500'
 *
 * @example
 * // Conditional classes
 * cn('btn', isActive && 'btn-active', { 'btn-disabled': isDisabled })
 * // => 'btn btn-active' (if isActive=true, isDisabled=false)
 *
 * @example
 * // Tailwind conflict resolution
 * cn('p-4', 'p-2')
 * // => 'p-2' (later class wins)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
