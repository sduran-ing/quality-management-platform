'use client';

/**
 * =============================================================================
 * DELETE DRAFT VERSION MODAL
 * =============================================================================
 * 
 * - Confirms deletion of a draft version, if it's the only version it deletes the entire document
 * - Creator can delete their own draft
 * - Quality Manager can delete any draft
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { deleteDraftVersion, DocumentVersion } from '@/lib/api/documents';

interface DeleteDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;  // Optional callback to trigger specific behaviours
  documentId: number;
  version: DocumentVersion;
  documentCode: string;
  documentName: string;
  isOnlyVersion: boolean; // True if this is the only version (will delete entire document)
}

export default function DeleteDraftModal({
  isOpen,
  onClose,
  onSuccess,
  documentId,
  version,
  documentCode,
  documentName,
  isOnlyVersion
}: DeleteDraftModalProps) {
  
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle delete confirmation
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      // Call API to delete draft
      const response = await deleteDraftVersion(documentId, version.versionId);

      if (response.success) {

        console.log('Draft version deleted:', response.data);

        // Call success callback if provided (e.g. for documents list)
        if (onSuccess) {
          onSuccess();  // For refreshing table, closing modal
          return;       // Don't navigate
        }

        // Default behavior: redirect based on scenario
        if (isOnlyVersion) {
          // Document deleted, go to documents list
          router.push('/documents');
        } else {
          // Just version deleted, go to document detail
          router.push(`/documents/${documentId}`);
        }
      }

    } catch (err: any) {
      console.error('Delete draft error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to delete draft version'
      );
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Draft Version"
      size="md"
    >
      <div className="space-y-4">
        
        {/* Warning icon and message */}
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">
              {isOnlyVersion ? (
                <>
                  This is the only version of this document. Deleting it will also delete the entire document.
                </>
              ) : (
                <>
                  This action cannot be undone.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Document/Version details */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600 font-medium">Document:</span>
            <span className="text-gray-900">{documentCode} - {documentName}</span>
            
            <span className="text-gray-600 font-medium">Version:</span>
            <span className="text-gray-900">{version.versionNumber}</span>
            
            <span className="text-gray-600 font-medium">File:</span>
            <span className="text-gray-900">{version.fileName}</span>
            
            <span className="text-gray-600 font-medium">Status:</span>
            <span className="text-gray-900">Draft</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Confirmation text */}
        <p className="text-sm text-gray-700">
          {isOnlyVersion ? (
            <>
              Are you sure you want to delete this document and its draft version?
            </>
          ) : (
            <>
              Are you sure you want to delete version {version.versionNumber}?
            </>
          )}
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          
          {/* Cancel button */}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>

          {/* Delete button - destructive styling */}
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleting}
            className="min-w-[120px]"
          >
            {isDeleting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Deleting...
              </>
            ) : (
              <>
                {isOnlyVersion ? 'Delete Document' : 'Delete Version'}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}