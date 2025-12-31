/**
 * @file utils.ts
 * @description General utility functions - Tailwind CSS class name merging
 * @module lib/core
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
