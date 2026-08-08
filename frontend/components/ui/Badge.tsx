import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Badge variants match our status colors
type BadgeVariant = 
  | 'default'
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info'
  | 'draft'
  | 'pending'
  | 'approved'
  | 'obsolete'
  | 'outdated';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export default function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  // Base styles for all badges
  const baseStyles = 
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full ' +
    'text-xs font-body font-medium border';

  // Variant-specific colors
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700 border-gray-300',
    
    // Status variants
    success: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    warning: 'bg-amber-100 text-amber-700 border-amber-300',
    error: 'bg-red-100 text-red-700 border-red-300',
    info: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    
    // Document status variants (match backend statuses)
    draft: 'bg-gray-100 text-gray-700 border-gray-300',
    pending: 'bg-amber-100 text-amber-700 border-amber-300',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    outdated: 'bg-red-100 text-red-500 border-red-300',
    obsolete: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <span
      className={cn(
        baseStyles,
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Helper function to get badge variant from document status
export function getDocumentStatusVariant(status: string): BadgeVariant {
  const statusMap: Record<string, BadgeVariant> = {
    draft: 'draft',
    pending_approval: 'pending',
    approved: 'approved',
    obsolete: 'obsolete',
    outdated: 'outdated',
  };
  
  return statusMap[status] || 'default';
}
// Without helper (repetitive code everywhere):
// In every component that shows status
// <Badge variant={
//   status === 'draft' ? 'draft' :
//   status === 'approved' ? 'approved' :
//   status === 'pending_approval' ? 'pending' :
//   'default'
// }>

// With helper (clean, reusable):
// Import once, use everywhere
// <Badge variant={getDocumentStatusVariant(status)}>

// Helper to map audit status to badge variant
export function getAuditStatusVariant(status: string): BadgeVariant {
  const statusMap: Record<string, BadgeVariant> = {
    scheduled: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'error',
  };

  return statusMap[status] || 'default';
};

// Helper function to get badge variant from finding severity
export function getFindingSeverityVariant(severity: string): BadgeVariant {
  const severityMap: Record<string, BadgeVariant> = {
    major_nonconformity: 'error',
    minor_nonconformity: 'warning',
    opportunity: 'info',
  };
  
  return severityMap[severity] || 'default';
}

// Helper function to get badge variant from finding status
export function getFindingStatusVariant(status: string): BadgeVariant {
  const statusMap: Record<string, BadgeVariant> = {
    open: 'info',
    in_progress: 'warning',
    closed: 'success',
    pending_verification: 'warning',
  };
  
  return statusMap[status] || 'default';
}

// Helper function to get badge variant from corrective action status
export function getCorrectiveActionStatusVariant(status: string): BadgeVariant {
  const statusMap: Record<string, BadgeVariant> = {
    proposed: 'draft',
    rejected: 'error',
    in_implementation: 'warning',
    pending_verification: 'warning',
    completed: 'success'
  };
  
  return statusMap[status] || 'default';
}