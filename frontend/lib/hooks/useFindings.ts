'use client';

/**
 * =============================================================================
 * FINDINGS HOOKS
 * =============================================================================
 * 
 * Custom React hooks for managing findings data
 */

import { useState, useEffect } from 'react';
import {
  getAllFindings,
  getFindingById,
  Finding
} from '@/lib/api/findings';

// ============================================================================
// USE FINDINGS (LIST FOR AN AUDIT)
// ============================================================================

interface UseFindingsReturn {
  findings: Finding[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for fetching all findings for an audit
 * 
 * USAGE:
 * const { findings, isLoading, error, refetch } = useFindings(auditId);
 * 
 * @param auditId - Audit ID
 * @returns Findings data, loading state, error, refetch
 */
export function useFindings(auditId: number | null): UseFindingsReturn {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFindings = async () => {
    if (!auditId) {
      setIsLoading(false);
      setFindings([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await getAllFindings(auditId);
      setFindings(response.data.findings);

    } catch (err: any) {
      console.error('Error fetching findings:', err);
      setError(err.response?.data?.message || 'Failed to load findings');
      setFindings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId]);

  const refetch = () => {
    fetchFindings();
  };

  return {
    findings,
    isLoading,
    error,
    refetch,
  };
}

// ============================================================================
// USE FINDING (SINGLE FINDING)
// ============================================================================

interface UseFindingReturn {
  finding: Finding | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for fetching single finding
 * 
 * USAGE:
 * const { finding, isLoading, error, refetch } = useFinding(auditId, findingId);
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @returns Finding data, loading state, error, refetch
 */
export function useFinding(
  auditId: number | null,
  findingId: number | null
): UseFindingReturn {
  const [finding, setFinding] = useState<Finding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinding = async () => {
    if (!auditId || !findingId) {
      setIsLoading(false);
      setFinding(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await getFindingById(auditId, findingId);
      setFinding(response.data.finding);

    } catch (err: any) {
      console.error('Error fetching finding:', err);
      setError(err.response?.data?.message || 'Failed to load finding');
      setFinding(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId, findingId]);

  const refetch = () => {
    fetchFinding();
  };

  return {
    finding,
    isLoading,
    error,
    refetch,
  };
}