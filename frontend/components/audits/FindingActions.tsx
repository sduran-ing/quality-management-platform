/**
 * =============================================================================
 * FINDING ACTIONS COMPONENT
 * =============================================================================
 * 
 * Context-aware dropdown menu for finding actions.
 */

import React, { useState, useRef, useEffect, HTMLAttributes } from 'react';
import {
  MoreVertical,
  Edit,
  Plus,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Finding } from '@/lib/api/findings';
import { AuditRoles } from '@/lib/utils/permissions';

// ============================================================================
// TYPES
// ============================================================================

// Action types that can be performed on a finding
export type FindingAction =
  | 'edit'
  | 'close'
  | 'addCorrectiveAction'
  | 'delete';

// User role
type UserRole = 'quality_manager' | 'process_owner' | 'employee';

interface FindingActionsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  finding: Finding;           // Finding data
  userRole: UserRole;         // Current user's role
  userId: number;             // Current user's ID
  auditRoles: AuditRoles,   // Booleans validating the type of role that the user has in the Audit
  onSelect: (action: FindingAction) => void;  // Callback when action is selected
  align?: 'left' | 'right';   // Position of dropdown
}

// ============================================================================
// HELPER FUNCTIONS (MOCK - TODO: Replace with real logic)
// ============================================================================

/**
 * Check if user can perform an action
 * 
 * MOCK BUSINESS RULES (TODO: Replace with real permission logic):
 * - Edit: Creator OR Lead Auditor
 * - Close: Lead Auditor (only if finding is open/in_progress)
 * - Add CA: Process Owner OR Quality Manager
 * - Delete: Lead Auditor (only if no corrective actions)
 */
function canPerformAction(
  action: FindingAction,
  finding: Finding,
  userRole: UserRole,
  userId: number,
  auditRoles: AuditRoles
): boolean {
  const isQM = userRole === 'quality_manager';
  const { isLeadAuditor, isAuditor } = auditRoles;

  // Check if user is the creator
  const isCreator = finding.createdBy === userId;

  switch (action) {
    case 'edit':
      // Creator OR Lead Auditor OR Auditor can edit
      // Only when finding is open
      return (isCreator || isLeadAuditor || isAuditor) && finding.status === 'open';

    case 'close':
      // QM, Lead Auditor, or Auditor can close
      // Only if finding is open or in progress
      return (isQM || isLeadAuditor || isAuditor) &&
        (finding.status !== 'closed');

    case 'addCorrectiveAction':
      // QM or Auditee can add corrective actions
      // Only if finding is open or in progress
      return (isQM || auditRoles.isAuditee) &&
        (finding.status === 'open' || finding.status === 'in_progress');

    case 'delete':
      // QM, Lead Auditor, or Auditor can delete
      // Only when finding is open
      return (isQM || isLeadAuditor || isAuditor) && finding.status === 'open';

    default:
      return false;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FindingActions({
  finding,
  userRole,
  userId,
  auditRoles,
  onSelect,
  align = 'right',
  className,
  ...props
}: FindingActionsProps) {

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

  const handleActionClick = (action: FindingAction) => {
    onSelect(action);
    setIsOpen(false);
  };

  // ========================================
  // DETERMINE AVAILABLE ACTIONS
  // ========================================

  // All possible actions
  const allActions: FindingAction[] = [
    'edit',
    'close',
    'addCorrectiveAction',
    'delete'
  ];

  // Filter by permissions
  const availableActions = allActions.filter(action =>
    canPerformAction(action, finding, userRole, userId, auditRoles)
  );

  // If no actions available, DON'T render the component
  if (availableActions.length === 0) {
    return null;
  }

  // ========================================
  // ACTION CONFIGURATIONS
  // ========================================

  const actionConfig: Record<FindingAction, {
    label: string;
    icon: React.ElementType;
    variant?: 'default' | 'danger';
  }> = {
    edit: { label: 'Edit Finding', icon: Edit },
    close: { label: 'Close Finding', icon: CheckCircle2 },
    addCorrectiveAction: { label: 'Add Corrective Action', icon: Plus },
    delete: { label: 'Delete Finding', icon: Trash2, variant: 'danger' }
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
        aria-label="Finding actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="gap-2"
      >
        Finding Actions
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
            {availableActions.map((action, index) => {
              const config = actionConfig[action];
              const Icon = config.icon;
              const isDanger = config.variant === 'danger';

              // Add separator before danger actions
              const showSeparator =
                index > 0 &&
                isDanger &&
                actionConfig[availableActions[index - 1]].variant !== 'danger';

              return (
                <React.Fragment key={action}>
                  {showSeparator && (
                    <div className="my-1 border-t border-gray-100" />
                  )}
                  <Button
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
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}