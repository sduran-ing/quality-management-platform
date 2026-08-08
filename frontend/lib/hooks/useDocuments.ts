'use client';

/**
 * =============================================================================
 * DOCUMENTS HOOKS
 * =============================================================================
 * 
 * Custom React hooks for managing document data
 */

import { useState, useEffect } from 'react';
import {
  getAllDocuments,
  getDocumentById,
  GetDocumentsParams,
  DocumentVersion,
  Document,
  Pagination
} from '@/lib/api/documents';

// ============================================================================
// USE DOCUMENTS (LIST WITH PAGINATION)
// ============================================================================

// Return type for useDocuments hook
interface UseDocumentsReturn {

  versions: DocumentVersion[];    // Document versions (flattened structure)
  pagination: Pagination | null;    // Pagination metadata
  isLoading: boolean;   // Loading state
  error: string | null;   // Error message

  refetch: () => void;    // Refetch documents
}

/**
 * Hook for fetching paginated document versions
 * 
 * BACKEND RESPONSE STRUCTURE:
 * {
 *   success: true,
 *   message: "...",
 *   data: {
 *     versions: [...],
 *     pagination: {
 *       page: 1,
 *       limit: 10,
 *       total: 47,
 *       totalPages: 5,
 *       hasMore: true
 *     }
 *   }
 * }
 * 
 * USAGE:
 * const { versions, pagination, isLoading, error, refetch } = useDocuments({
 *   page: 1,
 *   limit: 10,
 *   status: 'approved'
 * });
 * 
 * @param params - Query parameters (page, limit, search, filters)
 * @returns Versions data, pagination, loading state, error, refetch
 */
export function useDocuments(params?: GetDocumentsParams): UseDocumentsReturn {
  // Each item has both version and document fields
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  // Pagination metadata
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Loading and error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch documents from backend
   * 
   * FLOW:
   * 1. Call getAllDocuments with params
   * 2. Backend returns: { success, message, data: { versions, pagination } }
   * 3. Extract versions array and pagination object
   */
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      /**
       * Call API
       * 
       * getAllDocuments returns response.data (pre-extracted)
       * Structure: { success, message, data: { versions, pagination } }
       */
      const response = await getAllDocuments(params);

      /**
       * Extract data from response
       * 
       * response.data.versions: array of flattened versions
       * response.data.pagination: pagination metadata
       */
      setVersions(response.data.versions);
      setPagination(response.data.pagination);

    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.response?.data?.message || 'Failed to load documents');
      setVersions([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Effect: Fetch on mount and when params change
   * 
   * DEPENDENCY: JSON.stringify(params)
   * 
   * WHY:
   * - params is an object
   * - { page: 1 } !== { page: 1 } (different references)
   * - JSON.stringify creates stable string for comparison
   * - When any param changes, string changes, effect runs
   * 
   * TRIGGERS REFETCH WHEN:
   * - page changes
   * - search term changes
   * - filters change
   */
  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  // React compares: oldString === newString
  // '{"page":1}' === '{"page":1}': TRUE
  // Effect only runs when VALUES change, not reference

  /**
   * Manual refetch function
   * 
   * USE CASES:
   * - After creating a document
   * - After updating status
   * - User clicks refresh button
   * - Error occurred and user wants to retry
   */
  const refetch = () => {
    fetchDocuments();
  };

  return {
    versions,      // Array of document versions (flattened)
    pagination,    // Pagination metadata
    isLoading,     // Loading state
    error,         // Error message
    refetch,       // Manual refetch function
  };
}

// ============================================================================
// USE DOCUMENT (SINGLE DOCUMENT WITH VERSIONS)
// ============================================================================

// Return type for useDocument hook
interface UseDocumentReturn {

  document: Document | null;    // Single document with all versions
  isLoading: boolean;   // Loading state
  error: string | null;   // Error message

  refetch: () => void;    // Refetch document
}

/**
 * Hook for fetching single document with version history
 * 
 * BACKEND RESPONSE STRUCTURE:
 * {
 *   success: true,
 *   message: "...",
 *   data: {
 *     document: {
 *       id: 1,
 *       code: "HROB-PROC-001",
 *       name: "Student Registration",
 *       // ... metadata
 *       currentVersion: { ... },  // Current version details
 *       versions: [ ... ]         // All versions history
 *     }
 *   }
 * }
 * 
 * USAGE:
 * const { document, isLoading, error, refetch } = useDocument(documentId);
 * 
 * @param id - Document ID (null if not selected)
 * @returns Single document data, loading state, error, refetch
 */
export function useDocument(id: number | null): UseDocumentReturn {
  // Single document
  const [document, setDocument] = useState<Document | null>(null);

  // State: Loading and error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch document from backend
  const fetchDocument = async () => {
    /**
     * Guard: If no ID, don't fetch
     * 
     * USE CASE:
     * - Component mounted but no document selected yet
     * - ID is null initially
     */
    if (!id) {
      setIsLoading(false);
      setDocument(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      /**
       * Call documents API
       * 
       * getDocumentById returns response.data (pre-extracted)
       * Structure: { success, message, data: { document } }
       */
      const response = await getDocumentById(id);

      /**
       * Extract document from response
       * 
       * response.data.document: full document with versions
       */
      setDocument(response.data.document);

    } catch (err: any) {
      console.error('Error fetching document:', err);
      setError(err.response?.data?.message || 'Failed to load document');
      setDocument(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect: Fetch when ID changes
  useEffect(() => {
    fetchDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Manual refetch function
  const refetch = () => {
    fetchDocument();
  };

  return {
    document,
    isLoading,
    error,
    refetch,
  };
}