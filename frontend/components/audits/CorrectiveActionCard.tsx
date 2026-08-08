/**
 * =============================================================================
 * CORRECTIVE ACTION CARD COMPONENT
 * =============================================================================
 * 
 * Displays full corrective action details with options menu
 * 
 * - Display corrective action information
 * - Pass props to CorrectiveActionOptions
 * - All permission checks happen in CorrectiveActionOptions
 */

import React from 'react';
import {
  Calendar,
  User,
  CheckCircle2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { CorrectiveAction } from '@/lib/api/correctiveActions';
import { AuditRoles } from '@/lib/utils/permissions';
import Badge, { getCorrectiveActionStatusVariant } from '@/components/ui/Badge';
import CorrectiveActionOptions, { CorrectiveActionOption } from './CorrectiveActionOptions';
import { formatDate, formatUserName, CORRECTIVE_ACTION_STATUSES } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type UserRole = 'quality_manager' | 'process_owner' | 'employee';

interface CorrectiveActionCardProps {
  action: CorrectiveAction;
  userRole: UserRole;
  auditRoles: AuditRoles; // Pass through to CorrectiveActionOptions
  onActionSelect?: (actionType: CorrectiveActionOption, action: CorrectiveAction) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CorrectiveActionCard({
  action,
  userRole,
  auditRoles, 
  onActionSelect
}: CorrectiveActionCardProps) {

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Handle option selection from dropdown
   * Pass action along with option type to parent
   */
  const handleOptionSelect = (option: CorrectiveActionOption) => {
    onActionSelect?.(option, action);
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="p-6">

        {/* ========================================
            HEADER - Action Number, Status, Options
            ======================================== */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">
              {action.actionNumber}
            </h3>
            <Badge variant={getCorrectiveActionStatusVariant(action.status)} className="text-sm px-3 py-1">
              {CORRECTIVE_ACTION_STATUSES[action.status]?.label || action.status}
            </Badge>
          </div>

          {/* Options Menu - All logic handled inside the component */}
          <CorrectiveActionOptions
            action={action}
            userRole={userRole}
            auditRoles={auditRoles}
            onSelect={handleOptionSelect}
          />
        </div>

        <h2 className="text-base font-bold text-gray-900 pb-2">
          ID: {action.id}
        </h2>

        {/* ========================================
            PROPOSED ACTION
            ======================================== */}
        <div className="mb-6">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
            Proposed Action
          </p>
          <p className="text-base text-gray-900">
            {action.proposedAction}
          </p>
        </div>

        {/* ========================================
            ROOT CAUSE ANALYSIS
            ======================================== */}
        {action.rootCauseAnalysis && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
              Root Cause Analysis
            </p>
            <p className="text-base text-gray-900">
              {action.rootCauseAnalysis}
            </p>
          </div>
        )}

        {/* ========================================
            DETAILS GRID
            ======================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">

          {/* Responsible Person */}
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
              <User className="h-3 w-3 inline mr-1" />
              Responsible
            </p>
            <p className="text-base text-gray-900">
              {action.responsibleUser ? formatUserName(action.responsibleUser) : 'Not assigned'}
            </p>
            {action.responsibleUser?.email && (
              <p className="text-sm text-gray-600 mt-0.5">
                {action.responsibleUser.email}
              </p>
            )}
          </div>

          {/* Expected Completion Date */}
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Expected Completion
            </p>
            <p className="text-base text-gray-900">
              {formatDate(action.expectedCompletionDate)}
            </p>
          </div>

          {/* Actual Completion Date */}
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Actual Completion
            </p>
            <p className="text-base text-gray-900">
              {action.actualCompletionDate ? (
                formatDate(action.actualCompletionDate)
              ) : (
                <span className="text-gray-500 italic">Not completed</span>
              )}
            </p>
          </div>

          {/* Proposed By */}
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
              <User className="h-3 w-3 inline mr-1" />
              Proposed By
            </p>
            <p className="text-base text-gray-900">
              {action.proposer ? formatUserName(action.proposer) : 'Unknown'}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {formatDate(action.proposedAt)}
            </p>
          </div>

          {/* Approved By */}
          {action.approvedBy && action.approver && (
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                Approved By
              </p>
              <p className="text-base text-gray-900">
                {formatUserName(action.approver)}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">
                {action.approvedAt && formatDate(action.approvedAt)}
              </p>
            </div>
          )}

          {/* Verified By */}
          {action.verifiedBy && action.verifier && (
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                Verified By
              </p>
              <p className="text-base text-gray-900">
                {formatUserName(action.verifier)}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">
                {action.verifiedAt && formatDate(action.verifiedAt)}
              </p>
            </div>
          )}
        </div>

        {/* ========================================
            IMPLEMENTATION EVIDENCE
            ======================================== */}
        {action.implementationEvidence && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
              <FileText className="h-3 w-3 inline mr-1" />
              Implementation Evidence
            </p>
            <p className="text-base text-gray-900">
              {action.implementationEvidence}
            </p>
          </div>
        )}

        {/* ========================================
            REJECTION REASON
            ======================================== */}
        {action.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-bold text-red-700 uppercase tracking-wide mb-2">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              Rejection Reason
            </p>
            <p className="text-base text-red-900">
              {action.rejectionReason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}