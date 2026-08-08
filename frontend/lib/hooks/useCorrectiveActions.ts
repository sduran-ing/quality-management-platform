'use client';

/**
 * =============================================================================
 * CORRECTIVE ACTIONS HOOK
 * =============================================================================
 * 
 * Custom React hook for managing corrective actions data
 */

import { useState, useEffect } from 'react';
import {
  getCorrectiveActions,
  CorrectiveAction
} from '@/lib/api/correctiveActions';

// ============================================================================
// USE CORRECTIVE ACTIONS
// ============================================================================

interface UseCorrectiveActionsOptions {
  enabled?: boolean; // Option to disable auto-fetch (for lazy loading)
}

interface UseCorrectiveActionsReturn {
  actions: CorrectiveAction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for fetching corrective actions for a finding
 * 
 * USAGE:
 * // Auto-fetch
 * const { actions, isLoading } = useCorrectiveActions(auditId, findingId);
 * 
 * // Lazy loading (only fetch when enabled)
 * const { actions, isLoading, refetch } = useCorrectiveActions(
 *   auditId, 
 *   findingId, 
 *   { enabled: isExpanded }
 * );
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @param options - Hook options (enabled for lazy loading)
 * @returns Actions data, loading state, error, refetch
 */
export function useCorrectiveActions(
  auditId: number | null,
  findingId: number | null,
  options: UseCorrectiveActionsOptions = {}
): UseCorrectiveActionsReturn {
  const { enabled = true } = options;

  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = async () => {
    if (!auditId || !findingId || !enabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await getCorrectiveActions(auditId, findingId);
      setActions(response.data.correctiveActions);

    } catch (err: any) {
      console.error('Error fetching corrective actions:', err);
      setError(err.response?.data?.message || 'Failed to load corrective actions');
      setActions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId, findingId, enabled]);

  const refetch = () => {
    fetchActions();
  };

  return {
    actions,
    isLoading,
    error,
    refetch,
  };
}