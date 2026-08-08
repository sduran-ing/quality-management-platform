/**
 * =============================================================================
 * CORRECTIVE ACTION OPTIONS COMPONENT
 * =============================================================================
 * 
 * Dropdown menu for corrective action options with permission checks
 * 
 * - All permission checks happen here
 * - Determines available options based on status, user role and team membership
 * - CorrectiveActionCard just passes props, no logic duplication
 */

import React, { useState, useRef, useEffect, HTMLAttributes } from 'react';
import {
  MoreVertical,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  FileText,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { CorrectiveAction } from '@/lib/api/correctiveActions';
import { AuditRoles } from '@/lib/utils/permissions';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Available corrective action operations
 */
export type CorrectiveActionOption = 
  | 'approve' 
  | 'reject' 
  | 'edit' 
  | 'delete'
  | 'implement'
  | 'verify';

type UserRole = 'quality_manager' | 'process_owner' | 'employee';

interface CorrectiveActionOptionsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  action: CorrectiveAction;
  userRole: UserRole;
  auditRoles: AuditRoles;  // Booleans validating the type of role that the user has in the Audit
  onSelect: (option: CorrectiveActionOption) => void;
  align?: 'left' | 'right';
}

/**
 * Determine which options are possible based on CA status
 * 
 * This is the first filter - status-based
 * Then we filter by permissions in canPerformAction()
 * 
 * @param status - Corrective action status
 * @returns Array of possible actions for this status
 */
function getOptionsForStatus(status: CorrectiveAction['status']): CorrectiveActionOption[] {
  const optionMap: Record<CorrectiveAction['status'], CorrectiveActionOption[]> = {
    proposed: ['approve', 'reject', 'edit', 'delete'],
    rejected: ['edit', 'delete'],
    in_implementation: ['implement'],
    pending_verification: ['verify'],
    completed: []  // No actions available for completed
  };

  return optionMap[status] || [];
}

/**
 * Check if user can perform a specific action
 * 
 * This is the second filter - permission-based
 * Combines user role, team membership, and CA status
 * 
 * BUSINESS RULES:
 * - Approve: QM OR Lead Auditor OR Auditor (proposed status)
 * - Reject: QM OR Lead Auditor OR Auditor (proposed status)
 * - Edit: QM OR Auditee (rejected status only)
 * - Delete: QM OR Auditee (proposed/rejected status)
 * - Implement: QM OR Auditee (in_implementation status)
 * - Verify: QM OR Lead Auditor OR Auditor (pending_verification status)
 * - Reject Verification: QM OR Lead Auditor OR Auditor (pending_verification status)
 * 
 * @param option - The action to check
 * @param action - The corrective action
 * @param userRole - User's role in the system
 * @param auditRoles - Checks wich role has the user in the audit
 * @returns true if user can perform the action
 */
function canPerformAction(
  option: CorrectiveActionOption,
  action: CorrectiveAction,
  userRole: UserRole,
  auditRoles: AuditRoles
): boolean {
  // Quality Manager has global permissions
  const isQM = userRole === 'quality_manager';
  
  // Declare team membership roles
  const { isAuditee, isLeadAuditor, isAuditor } = auditRoles;

  switch (option) {
    case 'approve':
      // Only QM, Lead Auditor, or Auditor can approve
      // Only in proposed status
      return (isQM || isLeadAuditor || isAuditor) && 
             action.status === 'proposed';

    case 'reject':
      // Only QM, Lead Auditor, or Auditor can reject
      // Only in proposed status
      return (isQM || isLeadAuditor || isAuditor) && 
             action.status === 'proposed';

    case 'edit':
      // QM or Auditee can edit
      // Only in rejected status
      return (isQM || isAuditee) && action.status === 'rejected';

    case 'delete':
      // QM or Auditee can delete
      // Only in proposed or rejected status
      return (isQM || isAuditee) && 
             (action.status === 'proposed' || action.status === 'rejected');

    case 'implement':
      // QM or Auditee can implement (add evidence and send to verification)
      // Only in in_implementation status
      return (isQM || isAuditee) && 
             action.status === 'in_implementation';

    case 'verify':
      // QM, Lead Auditor, or Auditor can verify
      // Only in pending_verification status
      return (isQM || isLeadAuditor || isAuditor) && 
             action.status === 'pending_verification';

    default:
      return false;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CorrectiveActionOptions({
  action,
  userRole,
  auditRoles,
  onSelect,
  align = 'right',
  className,
  ...props
}: CorrectiveActionOptionsProps) {

  // ========================================
  // STATE
  // ========================================

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ========================================
  // EFFECTS - Dropdown control
  // ========================================

  /**
   * Close menu when clicking outside
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Delay to prevent immediate close on trigger click
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Close menu on Escape key
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleSelect = (option: CorrectiveActionOption) => {
    onSelect(option);
    setIsOpen(false);
  };

  // ========================================
  // DETERMINE AVAILABLE OPTIONS
  // ========================================

  /**
   * Two-step filtering:
   * 1. Get possible options based on status
   * 2. Filter by user permissions
   */
  const possibleOptions = getOptionsForStatus(action.status);
  
  const availableOptions = possibleOptions.filter(option =>
    canPerformAction(option, action, userRole, auditRoles)
  );

  // Don't render if no options available
  if (availableOptions.length === 0) {
    return null;
  }

  // ========================================
  // OPTION CONFIGURATIONS
  // ========================================

  /**
   * UI configuration for each option type
   * Includes label, icon, and variant (for styling)
   */
  const optionConfig: Record<CorrectiveActionOption, {
    label: string;
    icon: React.ElementType;
    variant?: 'default' | 'danger';
  }> = {
    approve: { label: 'Approve Action', icon: CheckCircle2 },
    reject: { label: 'Reject Action', icon: XCircle, variant: 'danger' },
    edit: { label: 'Edit Action', icon: Edit },
    delete: { label: 'Delete Action', icon: Trash2, variant: 'danger' },
    implement: { label: 'Implement Action', icon: Send },
    verify: { label: 'Verify Action', icon: CheckCircle2 }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div
      ref={menuRef}
      className={cn('relative inline-block text-left', className)}
      {...props}
    >
      {/* Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Corrective action options"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        Options
        <MoreVertical className="h-4 w-4" />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-56 rounded-lg',
            'bg-white shadow-lg ring-1 ring-black ring-opacity-5',
            'focus:outline-none',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1 flex flex-col">
            {availableOptions.map((option, index) => {
              const config = optionConfig[option];
              const Icon = config.icon;
              const isDanger = config.variant === 'danger';

              // Add separator before danger actions
              const showSeparator =
                index > 0 &&
                isDanger &&
                optionConfig[availableOptions[index - 1]].variant !== 'danger';

              return (
                <React.Fragment key={option}>
                  {showSeparator && (
                    <div className="my-1 border-t border-gray-100" />
                  )}
                  <Button
                    variant="menuItem"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'gap-3 w-full',
                      isDanger && 'text-red-600 hover:bg-red-50 hover:text-red-700'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </Button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}