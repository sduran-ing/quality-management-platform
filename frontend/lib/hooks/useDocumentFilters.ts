/**
 * =============================================================================
 * USE DOCUMENT FILTERS HOOK
 * =============================================================================
 * 
 * Manages filter state for document lists.
 * 
 * - Filter state management
 * - URL sync (shareable links)
 * - Reset filters
 * - Default filters (for different pages)
 */

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Filter values
export interface DocumentFilters {
  search?: string;
  status?: string | string[];
  documentTypeId?: number;
  processId?: number;
  departmentId?: number;
  createdBy?: number;
}

interface UseDocumentFiltersOptions {
  
  defaultFilters?: DocumentFilters;   // Default filter values
  syncWithUrl?: boolean;    // Sync with URL query params (default: true)
}

interface UseDocumentFiltersReturn {

  filters: DocumentFilters;   // Current filter values
  
  setFilter: <K extends keyof DocumentFilters>(key: K, value: DocumentFilters[K]) => void;  // Set a single filter value
  setFilters: (newFilters: Partial<DocumentFilters>) => void;   // Set multiple filters at once
  resetFilters: () => void;   // Reset all filters to defaults
  clearFilters: () => void;   // Clear all filters (empty values)
  hasActiveFilters: boolean;    // Check if any filters are active
}

export function useDocumentFilters(options: UseDocumentFiltersOptions = {}): UseDocumentFiltersReturn {
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
  const parseFiltersFromUrl = (): DocumentFilters => {
    if (!syncWithUrl || typeof window === 'undefined') {
      return defaultFilters;
    }

    const filters: DocumentFilters = { ...defaultFilters };

    // Search
    const search = searchParams.get('search');
    if (search) filters.search = search;

    // Status (can be single or array)
    const status = searchParams.getAll('status');
    if (status.length > 0) {
      filters.status = status.length === 1 ? status[0] : status;
    }

    // Document Type
    const documentTypeId = searchParams.get('documentTypeId');
    if (documentTypeId) filters.documentTypeId = parseInt(documentTypeId, 10);

    // Process
    const processId = searchParams.get('processId');
    if (processId) filters.processId = parseInt(processId, 10);

    // Department
    const departmentId = searchParams.get('departmentId');
    if (departmentId) filters.departmentId = parseInt(departmentId, 10);

    // Created By
    const createdBy = searchParams.get('createdBy');
    if (createdBy) filters.createdBy = parseInt(createdBy, 10);

    return filters;
  };

  /**
   * Initialize state from URL (LAZY INITIALIZATION)
   * 
   * - Only runs ONCE on mount
   * - No effect needed
   * - No cascading renders
   */
  const [filters, setFiltersState] = useState<DocumentFilters>(() => {
    return parseFiltersFromUrl();
  });

  /**
   * Update URL with current filters
   * 
   * STABLE WITH useCallback
   * - Dependencies are primitives (syncWithUrl) or stable (router)
   * - Won't cause re-renders
   */
  const updateUrl = useCallback((newFilters: DocumentFilters) => {
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

    if (newFilters.documentTypeId) {
      params.set('documentTypeId', newFilters.documentTypeId.toString());
    }

    if (newFilters.processId) {
      params.set('processId', newFilters.processId.toString());
    }

    if (newFilters.departmentId) {
      params.set('departmentId', newFilters.departmentId.toString());
    }

    if (newFilters.createdBy) {
      params.set('createdBy', newFilters.createdBy.toString());
    }

    // Reset to page 1 when filters change
    params.set('page', '1');

    router.push(`?${params.toString()}`, { scroll: false });
  }, [syncWithUrl, router]);

  // Set a single filter
  const setFilter = useCallback(<K extends keyof DocumentFilters>(
    key: K,
    value: DocumentFilters[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    
    // Remove undefined values
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k as keyof DocumentFilters] === undefined || 
          newFilters[k as keyof DocumentFilters] === '' ||
          newFilters[k as keyof DocumentFilters] === null) {
        delete newFilters[k as keyof DocumentFilters];
      }
    });

    setFiltersState(newFilters);
    updateUrl(newFilters);
  }, [filters, updateUrl]);

  // Set multiple filters at once
  const setFilters = useCallback((newFilters: Partial<DocumentFilters>) => {
    const merged = { ...filters, ...newFilters };
    
    // Remove undefined values
    Object.keys(merged).forEach(k => {
      if (merged[k as keyof DocumentFilters] === undefined || 
          merged[k as keyof DocumentFilters] === '' ||
          merged[k as keyof DocumentFilters] === null) {
        delete merged[k as keyof DocumentFilters];
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
    const k = key as keyof DocumentFilters;
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