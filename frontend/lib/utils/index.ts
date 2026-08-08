/**
 * Utility functions (Barrel Export)
 * 
 * This file re-exports all utilities from their respective files, and contains non-formatting utilities like { cn }.
 * This allows clean imports: import { cn, formatDate } from '@/lib/utils'
 * instead of: import { formatDate } from '@/lib/utils/formatters'
 */

// Formatting utilities
export {
  formatDate,
  formatRelativeTime,
  truncate,
  capitalize,
  getInitials,
  formatCurrency,
  formatNumber,
  formatSnakeCase,
  formatUserName,
  formatFileSize,
  } from './formatters';

// Constants (re-export for convenience)
export * from './constants';

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Non-formatting utility
 * Combines class names and merges Tailwind classes intelligently
 * 
 * Why we need this:
 * Without this, if you have "bg-red-500 bg-blue-500", both classes apply
 * and the result is unpredictable. twMerge ensures only the last one wins.
 * 
 * @param inputs - Class names (strings, objects, arrays, etc.)
 * @returns Merged class string with Tailwind conflicts resolved
 * 
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary-600', className)
 * // Returns: "px-4 py-2 bg-primary-600 custom-class"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}