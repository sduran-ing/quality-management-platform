'use client';

/**
 * =============================================================================
 * MAKE OBSOLETE MODAL
 * =============================================================================
 * 
 * - Marks current approved version as obsolete
 * - Deletes all draft and pending versions
 * - Only Quality Manager can mark documents as obsolete
 * - Current version must be approved
 * - This is irreversible
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { makeObsolete } from '@/lib/api/documents';

import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';

interface MakeObsoleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;  // Optional callback for list page
  documentId: number;
  documentCode: string;
  documentName: string;
  currentVersionNumber: string;
  hasDraftVersions: boolean;      // True if there are draft versions
  hasPendingVersions: boolean;    // True if there are pending versions
}

export default function MakeObsoleteModal({
  isOpen,
  onClose,
  onSuccess,
  documentId,
  documentCode,
  documentName,
  currentVersionNumber,
  hasDraftVersions,
  hasPendingVersions
}: MakeObsoleteModalProps) {
  
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { notify } = useAchievementNotifier();

  // Handle make obsolete confirmation
  const handleMakeObsolete = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Call API to make document obsolete
      const response = await makeObsolete(documentId);

      if (response.success) {

        // Notify first
        if (response.achievements) {
          notify(response.achievements);
        }

        // router.refresh() can't be used in this case because it clears Next.js's server cache. 
        // But the data lives in React state in the browser where it can be only updated by hooks

        // Call success callback if provided, parent will handle data refresh via onSuccess={refetch} (which is a hook action)
        if (onSuccess) {
          onSuccess();  // Close modal, refresh table, etc. (defined in the parent)
          onClose(); 
          return;       // Don't navigate
        }

        // Default behavior: Push to the document page of the obsolete document
        onClose(); 
        router.push(`/documents/${documentId}`);
      }

    } catch (err: any) {
      console.error('Make obsolete error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to mark document as obsolete'
      );
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Make Document Obsolete"
      size="md"
    >
      <div className="space-y-4">
        
        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 mb-2">
              This action cannot be undone
            </p>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>Current approved version will be marked as obsolete</li>
              {hasDraftVersions && (
                <li className="font-medium">All draft versions will be permanently deleted</li>
              )}
              {hasPendingVersions && (
                <li className="font-medium">All pending versions will be permanently deleted</li>
              )}
              <li>No new versions can be created</li>
            </ul>
          </div>
        </div>

        {/* Document details */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600 font-medium">Document:</span>
            <span className="text-gray-900">{documentCode} - {documentName}</span>
            
            <span className="text-gray-600 font-medium">Current Version:</span>
            <span className="text-gray-900">{currentVersionNumber}</span>
            
            <span className="text-gray-600 font-medium">Current Status:</span>
            <span className="text-gray-900">Approved</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Confirmation text */}
        <p className="text-sm text-gray-700 font-medium">
          Are you sure you want to mark this document as obsolete?
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          
          {/* Cancel button */}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>

          {/* Make Obsolete button - destructive styling */}
          <Button
            variant="danger"
            onClick={handleMakeObsolete}
            disabled={isProcessing}
            className="min-w-[160px]"
          >
            {isProcessing ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Make Obsolete
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}