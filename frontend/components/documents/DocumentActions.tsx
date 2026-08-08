/**
 * =============================================================================
 * DOCUMENT ACTIONS COMPONENT
 * =============================================================================
 * 
 * Context-aware dropdown menu for document actions.
 * 
 * - Different actions based on document status
 * - Permission-based action visibility
 * - Keyboard navigation
 * - Click-outside to close
 */

import React, { useState, useRef, useEffect, HTMLAttributes } from 'react';
import {
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    Send,
    Check,
    X,
    Download,
    FilePlus,
    Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { DocumentVersion } from '@/lib/api/documents';

// ============================================================================
// TYPES
// ============================================================================

// Action types that can be performed on a document
export type DocumentAction =
    | 'view'
    | 'edit'
    | 'delete'
    | 'submit'
    | 'approve'
    | 'reject'
    | 'download'
    | 'newVersion'
    | 'makeObsolete';

//  User role (for permission checking)
type UserRole = 'quality_manager' | 'process_owner' | 'employee';

// 'Omit' to override/replace an existing prop with a different signature
// In this case, the 'onSelect' from HTMLAttributes
interface DocumentActionsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {

    version: DocumentVersion;     // Document version data
    userRole: UserRole;   // Current user's role
    userId: number;    // Current user's ID (for ownership checks)
    onSelect: (action: DocumentAction, version: DocumentVersion) => void;     // Callback when action is selected (overrided thanks to Omit)
    align?: 'left' | 'right';     // Position of dropdown (auto-calculated by default)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user can perform an action
 * 
 * BUSINESS RULES:
 * - Draft: Creator or QM can edit/delete/submit
 * - Pending: Assigned approver or QM can approve/reject
 * - Approved: Anyone can view/download, QM can make obsolete
 * - Obsolete/Outdated: Anyone can view/download
 */
function canPerformAction(
    action: DocumentAction,
    version: DocumentVersion,
    userRole: UserRole,
    userId: number
): boolean {

    // Declare relevant info for the validation logic
    const { status, createdBy, assignedApprover } = version;

    // Check ownership and authorization
    const isCreator = createdBy?.id === userId;
    const isQM = userRole === 'quality_manager';
    const isAssignedApprover = assignedApprover?.id === userId;

    switch (action) {
        case 'view':
        case 'download':
            // Everyone can view/download any document
            return true;

        case 'edit':
        case 'delete':
            // Only draft documents can be edited/deleted
            // Only by creator or QM
            return status === 'draft' && (isCreator || isQM);

        case 'submit':
            // Only draft documents can be submitted
            // Only by creator or QM
            return status === 'draft' && (isCreator || isQM);

        case 'approve':
        case 'reject':
            // Only pending documents can be approved/rejected
            // Only by assigned approver or QM (QM can approve anything)
            return status === 'pending_approval' && (isAssignedApprover || isQM);

        case 'newVersion':
            // Only approved documents can have new versions
            // Anyone can propose a new version
            return status === 'approved';

        case 'makeObsolete':
            // Only approved documents can be made obsolete
            // Only QM can make documents obsolete
            return status === 'approved' && isQM;

        default:
            return false;
    }
}
// Get available actions for a document status
function getActionsForStatus(status: DocumentVersion['status']): DocumentAction[] {
    const actionMap: Record<DocumentVersion['status'], DocumentAction[]> = {
        draft: ['view', 'edit', 'delete', 'submit'],
        pending_approval: ['view', 'approve', 'reject'],
        approved: ['view', 'download', 'newVersion', 'makeObsolete'],
        outdated: ['view', 'download'],
        obsolete: ['view', 'download'],
    };

    return actionMap[status] || ['view'];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DocumentActions({
    version,
    userRole,
    userId,
    onSelect,
    align = 'right',
    className,
    ...props
}: DocumentActionsProps) {

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

    const handleActionClick = (action: DocumentAction) => {
        // When clicking the component it has to 
        onSelect(action, version);
        setIsOpen(false);
    };

    // ========================================
    // DETERMINE AVAILABLE ACTIONS
    // ========================================

    // Possible actions for the document version and status
    const possibleActions = getActionsForStatus(version.status);

    // Available actions for the user (even if they are possible, is also user based)
    const availableActions = possibleActions.filter(action =>
        canPerformAction(action, version, userRole, userId)
    );

    // If no actions available, don't render
    if (availableActions.length === 0) {
        return null;
    }

    // ========================================
    // ACTION CONFIGURATIONS
    // ========================================

    const actionConfig: Record<DocumentAction, {
        label: string;
        icon: React.ElementType;
        // The variant is to add rules based on the action classification
        variant?: 'default' | 'danger';
    }> = {
        view: { label: 'View Details', icon: Eye },
        edit: { label: 'Edit', icon: Edit },
        delete: { label: 'Delete', icon: Trash2, variant: 'danger' },
        submit: { label: 'Submit for Approval', icon: Send },
        approve: { label: 'Approve', icon: Check },
        reject: { label: 'Reject', icon: X, variant: 'danger' },
        download: { label: 'Download', icon: Download },
        newVersion: { label: 'New Version', icon: FilePlus },
        makeObsolete: { label: 'Make Obsolete', icon: Archive, variant: 'danger' },
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
                variant="icon"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Document actions"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
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
                    
                    {/* flex-col to force vertical stacking of the rendered actions*/}
                    <div className="py-1 flex flex-col">
                        {/* Map every available action for the document version, status and user trying to access them */}
                        {availableActions.map((action, index) => {
                            const config = actionConfig[action];
                            const Icon = config.icon;
                            const isDanger = config.variant === 'danger';

                            // Add separator before danger actions
                            const showSeparator =
                                index > 0 &&
                                isDanger &&
                                actionConfig[availableActions[index - 1]].variant !== 'danger';

                            {/* Render available actions */ }
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