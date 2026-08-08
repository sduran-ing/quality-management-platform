'use client';

/**
 * =============================================================================
 * START AUDIT MODAL
 * =============================================================================
 * 
 * Confirmation modal for starting an audit
 *  
 * - QM and Lead Auditor can start audits
 * - Can only start when status = 'scheduled'
 * - Changes status: scheduled to in_progress
 * - Records actual_start_date
 */

import { useState } from 'react';
import { Play, Calendar, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { Audit, startAudit } from '@/lib/api/audits';
import { formatDate } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface StartAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: Audit;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StartAuditModal({
  isOpen,
  onClose,
  audit,
  onSuccess
}: StartAuditModalProps) {

  // ========================================
  // STATE
  // ========================================

  const [isStarting, setIsStarting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

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
   * Handle start audit
   */
  const handleStartAudit = async () => {
    try {
      setIsStarting(true);
      setApiError(null);

      await startAudit(audit.id);

      // Success
      onSuccess();
      handleClose();

    } catch (error: any) {
      console.error('Start audit error:', error);
      setApiError(error.response?.data?.message || 'Failed to start audit');
    } finally {
      setIsStarting(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Start Audit"
      size="md"
    >
      <div className="space-y-4">
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

          {/* Scheduled Dates */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Scheduled Period:</span>
            </div>
            <p className="text-sm text-gray-900 ml-6">
              {formatDate(audit.scheduledStartDate)} - {formatDate(audit.scheduledEndDate)}
            </p>
          </div>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{apiError}</p>
          </div>
        )}

        {/* Confirmation Message */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-900 font-medium">
            Are you sure you want to start this audit?
          </p>
          <p className="text-sm text-yellow-800 mt-1">
            Once started, the audit will be active and findings can be recorded.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isStarting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleStartAudit}
            disabled={isStarting}
            className="min-w-[140px]"
          >
            {isStarting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Audit
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}