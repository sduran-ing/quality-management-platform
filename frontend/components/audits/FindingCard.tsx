/**
 * =============================================================================
 * FINDING CARD COMPONENT
 * =============================================================================
 * 
 * Expandable card for displaying a single finding with corrective actions.
 * 
 * FEATURES:
 * - Lazy loading of corrective actions (only when expanded)
 * - Proper type safety with API interfaces
 * - Badge system for severity and status
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  User
} from 'lucide-react';
import { Finding } from '@/lib/api/findings';
import { useCorrectiveActions } from '@/lib/hooks/useCorrectiveActions';
import Badge, { 
  getFindingSeverityVariant, 
  getFindingStatusVariant, 
  getCorrectiveActionStatusVariant 
} from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { 
  formatDate, 
  formatUserName,
  FINDING_SEVERITIES, 
  FINDING_STATUSES, 
  CORRECTIVE_ACTION_STATUSES 
} from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface FindingCardProps {
  finding: Finding;
  auditId: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showDetailsButton?: boolean; // Option to hide details button (if already on details page)
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FindingCard({
  finding,
  auditId,
  isExpanded = false,
  onToggleExpand,
  showDetailsButton = true
}: FindingCardProps) {

  const router = useRouter();

  // ========================================
  // FETCH CORRECTIVE ACTIONS (Lazy Loading)
  // ========================================

  /**
   * Only fetch corrective actions when card is expanded
   * Uses the 'enabled' option to control when the hook fetches
   */
  const { actions, isLoading: actionsLoading, error: actionsError } = useCorrectiveActions(
    auditId,
    finding.id,
    { enabled: isExpanded } // Only fetch when expanded
  );

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">

      {/* ========================================
          FINDING HEADER (Always Visible)
          ======================================== */}
      <div className="p-4 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">

            {/* Finding Number and Badges */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-base font-bold text-gray-900">
                {finding.findingNumber}
              </span>

              {/* Severity Badge */}
              <Badge variant={getFindingSeverityVariant(finding.severity)}>
                {FINDING_SEVERITIES[finding.severity]?.label || finding.severity}
              </Badge>

              {/* Status Badge */}
              <Badge variant={getFindingStatusVariant(finding.status)}>
                {FINDING_STATUSES[finding.status]?.label || finding.status}
              </Badge>
            </div>

            {/* Description (truncated to 150 characters) */}
            <p className="text-base text-gray-700 mb-2">
              {finding.description.substring(0, 150)}
              {finding.description.length > 150 && '...'}
            </p>

            {/* Process */}
            {finding.process && (
              <p className="text-sm text-gray-500">              
                Process: {finding.process.name}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-start gap-2 ml-4">
            {/* Expand/Collapse Button */}
            {onToggleExpand && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="gap-2"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Expand
                  </>
                )}
              </Button>
            )}

            {/* Detail Button */}
            {showDetailsButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/audits/${auditId}/findings/${finding.id}`)}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Details
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================
          CORRECTIVE ACTIONS (Expanded)
          ======================================== */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Corrective Actions {actions.length > 0 && `(${actions.length})`}
          </h2>

          {/* Loading State */}
          {actionsLoading && (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" />
              <span className="ml-2 text-sm text-gray-600">Loading corrective actions...</span>
            </div>
          )}

          {/* Error State */}
          {actionsError && !actionsLoading && (
            <div className="text-center py-4 text-sm text-red-600">
              Failed to load corrective actions
            </div>
          )}

          {/* Actions List */}
          {!actionsLoading && !actionsError && actions.length > 0 && (
            <div className="space-y-2">
              {actions.map(action => (
                <div
                  key={action.id}
                  className="bg-white border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Action Number and Status */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-bold text-gray-900">
                          {action.actionNumber}
                        </span>

                        {/* Status Badge */}
                        <Badge variant={getCorrectiveActionStatusVariant(action.status)}>
                          {CORRECTIVE_ACTION_STATUSES[action.status]?.label || action.status}
                        </Badge>
                      </div>

                      {/* Proposed Action (Description) */}
                      <p className="text-base text-gray-700 mb-2">
                        {action.proposedAction}
                      </p>

                      {/* Responsible Person and Due Date */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          <User className="h-3 w-3 inline mr-1" />
                          {action.responsibleUser 
                            ? formatUserName(action.responsibleUser)
                            : 'Not assigned'
                          }
                        </span>
                        <span>
                          <Calendar className="h-3 w-3 inline mr-1" />
                          Due: {formatDate(action.expectedCompletionDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Corrective Actions Message */}
          {!actionsLoading && !actionsError && actions.length === 0 && (
            <div className="text-center py-4 text-base text-gray-500">
              No corrective actions defined yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}