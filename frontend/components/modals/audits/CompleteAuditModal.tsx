'use client';

/**
 * =============================================================================
 * COMPLETE AUDIT MODAL
 * =============================================================================
 * 
 * Confirmation modal for completing an audit
 * 
 * - QM and Lead Auditor can complete audits
 * - Can only complete when status = 'in_progress'
 * - Changes status: in_progress to completed
 * - Validates ALL findings are closed
 * - Records actual_end_date
 */

import { useState } from 'react';
import { CheckCircle2, Calendar, AlertTriangle, FileText, ClipboardList } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { Audit, completeAudit } from '@/lib/api/audits';
import { useFindings } from '@/lib/hooks/useFindings';
import { cn, formatDate, FINDING_STATUSES } from '@/lib/utils';

import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';

// ============================================================================
// TYPES
// ============================================================================

interface CompleteAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: Audit;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CompleteAuditModal({
  isOpen,
  onClose,
  audit,
  onSuccess
}: CompleteAuditModalProps) {

  const { notify } = useAchievementNotifier();

  // ========================================
  // FETCH FINDINGS
  // ========================================
  
  const { findings, isLoading, error, refetch } = useFindings(audit.id);

  // ========================================
  // STATE
  // ========================================

  const [isCompleting, setIsCompleting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);  

  // ========================================
  // VALIDATION
  // ========================================

  // Check if all findings are closed
  const totalFindings = findings.length;
  const closedFindings = findings.filter(f => f.status === 'closed').length;
  const openFindings = totalFindings - closedFindings;
  const canComplete = totalFindings > 0 && openFindings === 0;

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Handle modal close
   */
  const handleClose = () => {
    setApiError(null);
    onClose();
  };

  /**
   * Handle complete audit
   */
  const handleCompleteAudit = async () => {
    // Additional validation
    if (!canComplete) {
      setApiError('Cannot complete audit. All findings must be closed first.');
      return;
    }

    try {
      setIsCompleting(true);
      setApiError(null);

      // Call API to complete audit
      const response = await completeAudit(audit.id);

      if (response.success) {

        // Notify first
        if (response.achievements) {
          notify(response.achievements);
        }

        // Success
        onSuccess();
        handleClose();
      }

    } catch (error: any) {
      console.error('Complete audit error:', error);
      setApiError(error.response?.data?.message || 'Failed to complete audit');
    } finally {
      setIsCompleting(false);
    }
  };

  // ========================================
  // LOADING STATE
  // ========================================

  if (isLoading) {
    return (
      <div>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            <ClipboardList className="h-5 w-5 inline mr-2" />
            Findings
          </h2>
        </div>

        {/* Loading Spinner */}
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-gray-600">Loading findings...</span>
        </div>
      </div>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================

  if (error) {
    return (
      <div>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            <ClipboardList className="h-5 w-5 inline mr-2" />
            Findings
          </h2>
        </div>

        {/* Error Message */}
        <ErrorMessage message={error} />
        
        {/* Retry Button */}
        <div className="mt-4">
          <Button variant="outline" onClick={refetch}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Complete Audit"
      size="md"
    >
      <div className="space-y-4">

        {/* Success/Warning Banner */}
        {canComplete ? (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                Ready to complete
              </p>
              <p className="text-sm text-green-800 mt-1">
                All findings are closed. This audit can now be completed.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                Cannot complete audit
              </p>
              <p className="text-sm text-red-800 mt-1">
                {totalFindings === 0 
                  ? 'No findings exist for this audit.'
                  : `${openFindings} finding(s) are not closed yet.`}
              </p>
            </div>
          </div>
        )}

        {/* Audit Details */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600 font-medium">Audit Title:</span>
            <span className="text-gray-900 font-semibold">{audit.title}</span>

            <span className="text-gray-600 font-medium">Type:</span>
            <span className="text-gray-900 capitalize">
              {audit.auditType.replace(/_/g, ' ')}
            </span>

            <span className="text-gray-600 font-medium">Current Status:</span>
            <span className="text-gray-900 capitalize">
              {audit.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Audit Period */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Audit Period:</span>
            </div>
            <div className="text-sm text-gray-900 ml-6 space-y-1">
              <p>
                <span className="text-gray-600">Scheduled:</span>{' '}
                {formatDate(audit.scheduledStartDate)} - {formatDate(audit.scheduledEndDate)}
              </p>
              <p>
                <span className="text-gray-600">Started:</span>{' '}
                {audit.actualStartDate ? formatDate(audit.actualStartDate) : (
                <span className="text-gray-500 italic">Not started</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Findings Status */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            Findings Status:
          </p>
          
          {totalFindings === 0 ? (
            <p className="text-sm text-gray-600 italic">No findings recorded</p>
          ) : (
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                  <div
                    className={cn(
                      'h-2.5 rounded-full transition-all',
                      canComplete ? 'bg-green-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${(closedFindings / totalFindings) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {closedFindings}/{totalFindings}
                </span>
              </div>

              {/* Findings List (if not all closed) */}
              {!canComplete && openFindings > 0 && (
                <div className="mt-3 pt-3">
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {findings.map((finding) => (
                        <div key={finding.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{finding.findingNumber}</span>
                          <span className={cn(
                            'text-sm px-2 py-0.5 rounded',
                            finding.status === 'closed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                          )}>
                            {FINDING_STATUSES[finding.status]?.label || finding.status}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* API Error */}
        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{apiError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCompleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleCompleteAudit}
            disabled={isCompleting || !canComplete}
            className="min-w-[160px]"
          >
            {isCompleting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Audit
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}