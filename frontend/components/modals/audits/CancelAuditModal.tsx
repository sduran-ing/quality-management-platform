'use client';

import { useState, useEffect } from 'react';
import { XCircle, AlertTriangle, FileX, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { Audit, cancelAudit } from '@/lib/api/audits';
import { useAuditStatistics } from '@/lib/hooks/useAudits';
import { formatDate } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface CancelAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: Audit;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CancelAuditModal({
  isOpen,
  onClose,
  audit,
  onSuccess
}: CancelAuditModalProps) {

  // ========================================
  // STATE
  // ========================================

  const [isCancelling, setIsCancelling] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  // ========================================
  // FETCH STATISTICS
  // ========================================

  const { statistics, isLoading, error } = useAuditStatistics(audit.id);

  // ========================================
  // VALIDATION
  // ========================================

  const totalFindings = statistics?.totalFindings || 0;
  const totalCorrectiveActions = statistics?.totalCorrectiveActions || 0;
  const hasData = totalFindings > 0 || totalCorrectiveActions > 0;
  
  // Require typing "CANCEL" to confirm
  const isConfirmed = confirmText.toUpperCase() === 'CANCEL';

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Handle modal close
   */
  const handleClose = () => {
    setApiError(null);
    setConfirmText('');
    onClose();
  };

  /**
   * Handle cancel audit
   */
  const handleCancelAudit = async () => {
    if (!isConfirmed) {
      setApiError('Please type CANCEL to confirm');
      return;
    }

    try {
      setIsCancelling(true);
      setApiError(null);

      const response = await cancelAudit(audit.id);

      // Success
      console.log('Audit cancelled:', response.data);
      onSuccess();
      handleClose();

    } catch (error: any) {
      console.error('Cancel audit error:', error);
      setApiError(error.response?.data?.message || 'Failed to cancel audit');
    } finally {
      setIsCancelling(false);
    }
  };

  // ========================================
  // LOADING STATE
  // ========================================

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Cancel Audit" size="md">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </Modal>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancel Audit"
      size="md"
    >
      <div className="space-y-4">

        {/* Critical Warning Banner */}
        <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 mt-1">
              Cancelling this audit will permanently delete all associated findings and corrective actions.
            </p>
          </div>
        </div>

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

            <span className="text-gray-600 font-medium">Scheduled Period:</span>
            <span className="text-gray-900">
              {formatDate(audit.scheduledStartDate)} - {formatDate(audit.scheduledEndDate)}
            </span>
          </div>
        </div>

        {/* Data to be Deleted */}
        {hasData && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-bold text-red-900">
                The following data will be permanently deleted:
              </p>
            </div>
            
            <div className="space-y-2 ml-7">
              {totalFindings > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-800">
                    <Trash2 className="h-4 w-4 inline mr-2" />
                    Findings
                  </span>
                  <span className="font-bold text-red-900">{totalFindings}</span>
                </div>
              )}
              
              {totalCorrectiveActions > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-800">
                    <Trash2 className="h-4 w-4 inline mr-2" />
                    Corrective Actions
                  </span>
                  <span className="font-bold text-red-900">{totalCorrectiveActions}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Data Message */}
        {!hasData && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-900">
              This audit has no findings or corrective actions yet.
            </p>
          </div>
        )}

        {/* API Error */}
        {(apiError || error) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{apiError || error}</p>
          </div>
        )}

        {/* Confirmation Input */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
          <p className="text-sm font-medium text-gray-900 mb-2">
            To confirm cancellation, type <span className="font-bold text-red-600">CANCEL</span> below:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type CANCEL"
            disabled={isCancelling}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {confirmText && !isConfirmed && (
            <p className="mt-1 text-sm text-red-600">
              Please type exactly "CANCEL" (without quotes)
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCancelling}
          >
            Keep Audit
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleCancelAudit}
            disabled={isCancelling || !isConfirmed}
            className="min-w-[160px]"
          >
            {isCancelling ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Audit
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}