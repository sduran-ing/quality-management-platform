/**
 * =============================================================================
 * AUDIT ACTIONS COMPONENT
 * =============================================================================
 * 
 * Context-aware dropdown menu for audit actions.
 */

import React, { useState, useRef, useEffect, HTMLAttributes } from 'react';
import {
  MoreVertical,
  Edit,
  Plus,
  Play,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Audit } from '@/lib/api/audits';
import { AuditRoles } from '@/lib/utils/permissions';

// ============================================================================
// TYPES
// ============================================================================

// Action types that can be performed on an audit
export type AuditAction = 'edit' | 'addFinding' | 'start' | 'complete' | 'cancel';

// User role
type UserRole = 'quality_manager' | 'process_owner' | 'employee';

interface AuditActionsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  audit: Audit;             // Audit data
  userRole: UserRole;       // Current user's role
  auditRoles: AuditRoles;   // User's roles within this audit
  onSelect: (action: AuditAction) => void;  // Callback when action is selected
  align?: 'left' | 'right'; // Position of dropdown
}

/**
 * Check if user can perform an action
 */
function canPerformAction(
  audit: Audit, 
  action: AuditAction,
  userRole: UserRole,
  auditRoles: AuditRoles
): boolean {
  const isQM = userRole === 'quality_manager';
  const { isLeadAuditor, isAuditor } = auditRoles;

  switch (action) {
    case 'edit':
      // Only Quality Manager OR Lead Auditor AND audit scheduled
      return (isQM || isLeadAuditor) && audit.status === 'scheduled';

      case 'start':
      // Only Quality Manager OR Lead Auditor AND audit scheduled
      return (isQM || isLeadAuditor) && audit.status === 'scheduled';

      case 'complete':
      // Only Quality Manager OR Lead Auditor AND audit in progress
      return (isQM || isLeadAuditor) && audit.status === 'in_progress';

      case 'cancel':
      // Only Quality Manager OR Lead Auditor AND audit in progress or scheduled
      return (isQM || isLeadAuditor) && ((audit.status === 'in_progress') || (audit.status === 'scheduled'));

      case 'addFinding':
      // Quality Manager OR Lead Auditor OR Auditor AND audit in progress
      return (isQM || isAuditor) && audit.status === 'in_progress';

    default:
      return false;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AuditActions({
  audit,
  userRole,
  auditRoles,
  onSelect,
  align = 'right',
  className,
  ...props
}: AuditActionsProps) {

  // ========================================
  // STATE
  // ========================================

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ========================================
  // EFFECTS
  // ========================================

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Add delay to prevent immediate close on trigger click
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleActionClick = (action: AuditAction) => {
    onSelect(action);
    setIsOpen(false);
  };

  // ========================================
  // DETERMINE AVAILABLE ACTIONS
  // ========================================

  // All possible actions
  const allActions: AuditAction[] = ['edit', 'addFinding', 'start', 'complete', 'cancel'];

  // Filter by permissions
  const availableActions = allActions.filter(action =>
    canPerformAction(audit, action, userRole, auditRoles)
  );

  // If no actions available, DON'T render the component
  if (availableActions.length === 0) {
    return null;
  }

  // ========================================
  // ACTION CONFIGURATIONS
  // ========================================

  const actionConfig: Record<AuditAction, {
    label: string;
    icon: React.ElementType;
    variant?: 'default' | 'danger';
  }> = {
    edit: { label: 'Edit Audit', icon: Edit },
    addFinding: { label: 'Add Finding', icon: Plus },
    start: { label: 'Start Audit', icon: Play },
    complete: { label: 'Complete Audit', icon: CheckCircle2 },
    cancel: { label: 'Cancel Audit', icon: XCircle }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div
      ref={dropdownRef}
      className={cn('relative inline-block text-left', className)}
      {...props}
    >
      {/* Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Audit actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="gap-2"
      >
        Audit Actions
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
            {availableActions.map((action) => {
              const config = actionConfig[action];
              const Icon = config.icon;
              const isDanger = config.variant === 'danger';

              return (
                <Button
                  key={action}
                  variant="menuItem"
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    'gap-3 w-full',
                    isDanger && 'text-red-600 hover:bg-red-50 hover:text-red-700'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}