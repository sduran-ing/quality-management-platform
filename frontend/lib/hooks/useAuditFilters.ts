/**
 * =============================================================================
 * USE AUDIT FILTERS HOOK
 * =============================================================================
 * 
 * Manages filter state for audit lists.
 * 
 * - Filter state management
 * - URL sync (shareable links)
 * - Reset filters
 * - Default filters (for different pages)
 */

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuditStatus, AuditType, TeamMemberRole } from '@/lib/api/audits';

// ============================================
// TYPES
// ============================================

// Filter values
export interface AuditFilters {
  search?: string;
  status?: AuditStatus | AuditStatus[];
  auditType?: AuditType | AuditType[];
  processId?: number;
  myRole?: TeamMemberRole;
  myView?: boolean;
}

interface UseAuditFiltersOptions {
  defaultFilters?: AuditFilters;   // Default filter values
  syncWithUrl?: boolean;            // Sync with URL query params (default: true)
}

interface UseAuditFiltersReturn {
  filters: AuditFilters;            // Current filter values
  
  setFilter: <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => void;  // Set a single filter value
  setFilters: (newFilters: Partial<AuditFilters>) => void;   // Set multiple filters at once
  resetFilters: () => void;         // Reset all filters to defaults
  clearFilters: () => void;         // Clear all filters (empty values)
  hasActiveFilters: boolean;        // Check if any filters are active
}

// ============================================
// HOOK
// ============================================

export function useAuditFilters(options: UseAuditFiltersOptions = {}): UseAuditFiltersReturn {
  const {
    defaultFilters = {},
    syncWithUrl = true
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Parse filters from URL
   * 
   * EXTRACTED AS STANDALONE FUNCTION (not useCallback)
   * - Used only during initialization
   * - No need to memoize
   */
  const parseFiltersFromUrl = (): AuditFilters => {
    if (!syncWithUrl || typeof window === 'undefined') {
      return defaultFilters;
    }

    const filters: AuditFilters = { ...defaultFilters };

    // Search
    const search = searchParams.get('search');
    if (search) filters.search = search;

    // Status (can be single or array)
    const status = searchParams.getAll('status');
    if (status.length > 0) {
      filters.status = status.length === 1 
        ? status[0] as AuditStatus
        : status as AuditStatus[];
    }

    // Audit Type (can be single or array)
    const auditType = searchParams.getAll('auditType');
    if (auditType.length > 0) {
      filters.auditType = auditType.length === 1 
        ? auditType[0] as AuditType
        : auditType as AuditType[];
    }

    // Process
    const processId = searchParams.get('processId');
    if (processId) filters.processId = parseInt(processId, 10);

    // My Role
    const myRole = searchParams.get('myRole');
    if (myRole) filters.myRole = myRole as TeamMemberRole;

    // My View
    const myView = searchParams.get('myView');
    if (myView) filters.myView = myView === 'true';

    return filters;
  };

  /**
   * Initialize state from URL (LAZY INITIALIZATION)
   * 
   * - Only runs ONCE on mount
   * - No effect needed
   * - No cascading renders
   */
  const [filters, setFiltersState] = useState<AuditFilters>(() => {
    return parseFiltersFromUrl();
  });

  /**
   * Update URL with current filters
   * 
   * STABLE WITH useCallback
   * - Dependencies are primitives (syncWithUrl) or stable (router)
   * - Won't cause re-renders
   */
  const updateUrl = useCallback((newFilters: AuditFilters) => {
    if (!syncWithUrl) return;

    const params = new URLSearchParams();

    // Add all filter params
    if (newFilters.search) {
      params.set('search', newFilters.search);
    }

    if (newFilters.status) {
      if (Array.isArray(newFilters.status)) {
        // Multiple statuses
        newFilters.status.forEach(s => params.append('status', s));
      } else {
        // Single status
        params.set('status', newFilters.status);
      }
    }

    if (newFilters.auditType) {
      if (Array.isArray(newFilters.auditType)) {
        // Multiple audit types
        newFilters.auditType.forEach(t => params.append('auditType', t));
      } else {
        // Single audit type
        params.set('auditType', newFilters.auditType);
      }
    }

    if (newFilters.processId) {
      params.set('processId', newFilters.processId.toString());
    }

    if (newFilters.myRole) {
      params.set('myRole', newFilters.myRole);
    }

    if (newFilters.myView !== undefined) {
      params.set('myView', newFilters.myView.toString());
    }

    // Reset to page 1 when filters change
    params.set('page', '1');

    router.push(`?${params.toString()}`, { scroll: false });
  }, [syncWithUrl, router]);

  // Set a single filter
  const setFilter = useCallback(<K extends keyof AuditFilters>(
    key: K,
    value: AuditFilters[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    
    // Remove undefined values
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k as keyof AuditFilters] === undefined || 
          newFilters[k as keyof AuditFilters] === '' ||
          newFilters[k as keyof AuditFilters] === null) {
        delete newFilters[k as keyof AuditFilters];
      }
    });

    setFiltersState(newFilters);
    updateUrl(newFilters);
  }, [filters, updateUrl]);

  // Set multiple filters at once
  const setFilters = useCallback((newFilters: Partial<AuditFilters>) => {
    const merged = { ...filters, ...newFilters };
    
    // Remove undefined values
    Object.keys(merged).forEach(k => {
      if (merged[k as keyof AuditFilters] === undefined || 
          merged[k as keyof AuditFilters] === '' ||
          merged[k as keyof AuditFilters] === null) {
        delete merged[k as keyof AuditFilters];
      }
    });

    setFiltersState(merged);
    updateUrl(merged);
  }, [filters, updateUrl]);

  // Reset to default filters
  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    updateUrl(defaultFilters);
  }, [defaultFilters, updateUrl]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState({});
    updateUrl({});
  }, [updateUrl]);

  // Check if any non-default filters are active
  const hasActiveFilters = Object.keys(filters).some(key => {
    const k = key as keyof AuditFilters;
    return filters[k] !== undefined && filters[k] !== defaultFilters[k];
  });

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    clearFilters,
    hasActiveFilters
  };
}