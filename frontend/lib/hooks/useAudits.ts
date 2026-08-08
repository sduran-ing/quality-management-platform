'use client';

/**
 * =============================================================================
 * AUDITS HOOKS
 * =============================================================================
 * 
 * Custom React hooks for managing audit data
 */

import { useState, useEffect } from 'react';
import {
  getAllAudits,
  getAuditById,
  getAuditStatistics,
  GetAuditsParams,
  Audit,
  Pagination,
  AuditStatistics
} from '@/lib/api/audits';


// ============================================================================
// USE AUDITS (LIST WITH PAGINATION)
// ============================================================================

// Return type for useAudits hook
interface UseAuditsReturn {
  audits: Audit[];                  // Array of audits
  pagination: Pagination | null;    // Pagination metadata
  isLoading: boolean;               // Loading state
  error: string | null;             // Error message
  refetch: () => void;              // Refetch audits
}

/**
 * Hook for fetching paginated audits
 * 
 * BACKEND RESPONSE STRUCTURE:
 * {
 *   success: true,
 *   message: "...",
 *   data: {
 *     audits: [...],
 *     pagination: {
 *          currentPage: 1,
 *          totalPages: 5,
 *          totalCount: 47,
 *          limit: 10,
 *          hasMore: true
 *   }
 * }
 * 
 * USAGE:
 * const { audits, pagination, isLoading, error, refetch } = useAudits({
 *   page: 1,
 *   limit: 10,
 *   status: 'in_progress'
 * });
 * 
 * @param params - Query parameters (page, limit, search, filters)
 * @returns Audits data, pagination, loading state, error, refetch
 */
export function useAudits(params?: GetAuditsParams): UseAuditsReturn {
  // State: Audits array
  const [audits, setAudits] = useState<Audit[]>([]);

  // State: Pagination metadata
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // State: Loading and error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch audits from backend
   * 
   * FLOW:
   * 1. Call getAudits with params
   * 2. Backend returns: { success, message, data: { audits }, pagination }
   * 3. Extract audits array and pagination object
   */
  const fetchAudits = async () => {
    try {
      setIsLoading(true);
      setError(null);

      /**
       * Call API
       * 
       * getAllAudits returns response.data (pre-extracted)
       * Structure: { success, message, data: { audits, pagination } }
       */
      const response = await getAllAudits(params);

      /**
       * Extract data from response
       * 
       * response.data.audits: array of audits
       * response.pagination: pagination metadata
       */
      setAudits(response.data.audits);
      setPagination(response.data.pagination);

    } catch (err: any) {
      console.error('Error fetching audits:', err);
      setError(err.response?.data?.message || 'Failed to load audits');
      setAudits([]);
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
    fetchAudits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  // React compares: oldString === newString
  // '{"page":1}' === '{"page":1}': TRUE
  // Effect only runs when VALUES change, not reference

  /**
   * Manual refetch function
   * 
   * USE CASES:
   * - After creating an audit
   * - After updating status
   * - User clicks refresh button
   * - Error occurred and user wants to retry
   */
  const refetch = () => {
    fetchAudits();
  };

  return {
    audits,        // Array of audits
    pagination,    // Pagination metadata
    isLoading,     // Loading state
    error,         // Error message
    refetch,       // Manual refetch function
  };
}

// ============================================================================
// USE AUDIT (SINGLE AUDIT WITH DETAILS)
// ============================================================================

// Return type for useAudit hook
interface UseAuditReturn {
  audit: Audit | null;      // Single audit with all details
  isLoading: boolean;       // Loading state
  error: string | null;     // Error message
  refetch: () => void;      // Refetch audit
}

/**
 * Hook for fetching single audit with full details
 * 
 * BACKEND RESPONSE STRUCTURE:
 * {
 *   success: true,
 *   message: "...",
 *   data: {
 *     audit: {
 *       id: 1,
 *       title: "ISO 9001 Internal Audit",
 *       // ... audit metadata
 *       creator: { ... },
 *       processes: [ ... ],
 *       standards: [ ... ],
 *       teamMembers: [ ... ],
 *       findings: [ ... ]
 *     }
 *   }
 * }
 * 
 * USAGE:
 * const { audit, isLoading, error, refetch } = useAudit(auditId);
 * 
 * @param id - Audit ID (null if not selected)
 * @returns Single audit data, loading state, error, refetch
 */
export function useAudit(id: number | null): UseAuditReturn {
  // State: Single audit
  const [audit, setAudit] = useState<Audit | null>(null);

  // State: Loading and error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch audit from backend
  const fetchAudit = async () => {
    /**
     * Guard: If no ID, don't fetch
     * 
     * USE CASE:
     * - Component mounted but no audit selected yet
     * - ID is null initially
     */
    if (!id) {
      setIsLoading(false);
      setAudit(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      /**
       * Call audits API
       * 
       * getAuditById returns response.data (pre-extracted)
       * Structure: { success, message, data: { audit } }
       */
      const response = await getAuditById(id);

      /**
       * Extract audit from response
       * 
       * response.data.audit: full audit with associations
       */
      setAudit(response.data.audit);

    } catch (err: any) {
      console.error('Error fetching audit:', err);
      setError(err.response?.data?.message || 'Failed to load audit');
      setAudit(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect: Fetch when ID changes
  useEffect(() => {
    fetchAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Manual refetch function
  const refetch = () => {
    fetchAudit();
  };

  return {
    audit,
    isLoading,
    error,
    refetch,
  };
}

// ============================================================================
// USE AUDIT STATISTICS (FINDINGS AND CORRECTIVE ACTIONS COUNT)
// ============================================================================

/**
 * Hook to fetch audit statistics
 */
export function useAuditStatistics(auditId: number) {
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAuditStatistics(auditId);
      setStatistics(response.data.statistics);
    } catch (err: any) {
      console.error('Error fetching audit statistics:', err);
      setError(err.response?.data?.message || 'Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (auditId) {
      fetchStatistics();
    }
  }, [auditId]);

  return {
    statistics,
    isLoading,
    error,
    refetch: fetchStatistics
  };
}