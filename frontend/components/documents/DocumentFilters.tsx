/**
 * =============================================================================
 * DOCUMENT FILTERS COMPONENT
 * =============================================================================
 * 
 * Reusable filter controls for document lists.
 * 
 * - Search box
 * - Status multi-select
 * - Document type dropdown
 * - Process dropdown
 * - Department dropdown
 * - Clear filters button
 */

import React, { useState, useEffect, HTMLAttributes } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DOCUMENT_STATUSES } from '@/lib/utils/constants';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { DocumentFilters as FilterValues } from '@/lib/hooks/useDocumentFilters';

// Import API functions for dropdowns
import { getAllDocumentTypes, DocumentType } from '@/lib/api/documentTypes';
import { getAllProcesses, Process } from '@/lib/api/processes';
import { getAllDepartments, Department } from '@/lib/api/departments';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentFiltersProps extends HTMLAttributes<HTMLDivElement> {

  filters: FilterValues;    // Current filter values
  onFilterChange: <K extends keyof FilterValues>(key: K, value: FilterValues[K]) => void;   // Callback when filter changes
  onClearFilters: () => void;       // Callback when filters cleared

  // Hide specific filters (for specialized views)
  hideFilters?: Array<'search' | 'status' | 'documentType' | 'process' | 'department'>;
  allowedStatuses?: string[]; // Some pages will have specific statuses available
  showFilterCount?: boolean;    // Show active filter count
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DocumentFilters({
  filters,
  onFilterChange,
  onClearFilters,
  hideFilters = [],
  allowedStatuses,
  showFilterCount = true,
  className,
  ...props
}: DocumentFiltersProps) {

  // Define available statuses (use allowed if provided)
  const availableStatuses = allowedStatuses || [
    'draft',
    'pending_approval',
    'approved',
    'outdated',
    'obsolete'
  ];

  // ========================================
  // STATE: Dropdown options
  // ========================================

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // ========================================
  // FETCH: Dropdown options on mount
  // ========================================

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setIsLoadingOptions(true);

        // Fetch all options in parallel
        const [typesRes, processesRes, departmentsRes] = await Promise.all([
          getAllDocumentTypes(),
          getAllProcesses(),
          getAllDepartments()
        ]);

        setDocumentTypes(typesRes.data.documentTypes);
        setProcesses(processesRes.data.processes);
        setDepartments(departmentsRes.data.departments);
      } catch (error) {
        console.error('Error fetching filter options:', error);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    fetchOptions();
  }, []);

  // ========================================
  // HELPERS
  // ========================================

  // Count active filters (excluding search)
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    // Don't count search as a "filter"
    if (key === 'search') return false;

    // Count if value exists
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null;
  }).length;

  // Check if a specific filter should be shown
  const shouldShowFilter = (filterName: string): boolean => {
    return !hideFilters.includes(filterName as any);
  };

  /**
   * Handle status checkbox toggle
   * 
   * LOGIC:
   * - If status is string, convert to array
   * - Toggle status in/out of array
   * - If array becomes empty, set to undefined
   */
  const handleStatusToggle = (status: string) => {
    const currentStatuses = Array.isArray(filters.status)
      ? filters.status
      : filters.status
        ? [filters.status]
        : [];

    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)  // Remove
      : [...currentStatuses, status];               // Add

    onFilterChange('status', newStatuses.length > 0 ? newStatuses : undefined);
  };

  // Check if status is selected
  const isStatusSelected = (status: string): boolean => {
    if (!filters.status) return false;
    if (Array.isArray(filters.status)) return filters.status.includes(status);
    return filters.status === status;
  };

  return (
    <div
      className={cn('space-y-4', className)}
      {...props}
    >
      {/* ========================================
          SEARCH BOX
          ======================================== */}
      {shouldShowFilter('search') && (
        <div>
          <Input
            type="text"
            placeholder="Search by code or name..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value || undefined)}
            icon={<Search className="h-4 w-4" />}
            className="w-full"
          />
        </div>
      )}

      {/* ========================================
          FILTER CONTROLS ROW
          ======================================== */}
      <div className="flex flex-wrap items-center gap-3">

        {/* STATUS MULTI-SELECT */}
        {shouldShowFilter('status') && (
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DOCUMENT_STATUSES)
                .filter(([key]) => {
                  // If allowedStatuses is provided, only show those statuses
                  if (allowedStatuses && allowedStatuses.length > 0) {
                    return allowedStatuses.includes(key);
                  }
                  // Otherwise show all statuses
                  return true;
                })
                .map(([key, { label }]) => {
                  const selected = isStatusSelected(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleStatusToggle(key)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
                        selected
                          ? 'bg-secondary-600 text-white'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* DOCUMENT TYPE DROPDOWN */}
        {shouldShowFilter('documentType') && (
          <div className="min-w-[200px]">
            <label
              htmlFor="documentType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Document Type
            </label>
            <div className="relative">
              <select
                id="documentType"
                value={filters.documentTypeId || ''}
                onChange={(e) => onFilterChange(
                  'documentTypeId',
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
                disabled={isLoadingOptions}
                className={cn(
                  'w-full appearance-none rounded-lg border border-gray-300 bg-white',
                  'px-3 py-2 pr-10 text-sm text-gray-900',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <option value="">All Types</option>
                {documentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.acronym} - {type.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* PROCESS DROPDOWN */}
        {shouldShowFilter('process') && (
          <div className="min-w-[200px]">
            <label
              htmlFor="process"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Process
            </label>
            <div className="relative">
              <select
                id="process"
                value={filters.processId || ''}
                onChange={(e) => onFilterChange(
                  'processId',
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
                disabled={isLoadingOptions}
                className={cn(
                  'w-full appearance-none rounded-lg border border-gray-300 bg-white',
                  'px-3 py-2 pr-10 text-sm text-gray-900',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <option value="">All Processes</option>
                {processes.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.acronym} - {process.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* DEPARTMENT DROPDOWN */}
        {shouldShowFilter('department') && (
          <div className="min-w-[200px]">
            <label
              htmlFor="department"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Department
            </label>
            <div className="relative">
              <select
                id="department"
                value={filters.departmentId || ''}
                onChange={(e) => onFilterChange(
                  'departmentId',
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
                disabled={isLoadingOptions}
                className={cn(
                  'w-full appearance-none rounded-lg border border-gray-300 bg-white',
                  'px-3 py-2 pr-10 text-sm text-gray-900',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* CLEAR FILTERS BUTTON */}
        {activeFilterCount > 0 && (
          <div className="flex items-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear {showFilterCount && `(${activeFilterCount})`}
            </Button>
          </div>
        )}
      </div>

      {/* ========================================
          ACTIVE FILTERS SUMMARY (Optional)
          ======================================== */}
      {showFilterCount && activeFilterCount > 0 && (
        <div className="text-sm text-gray-600">
          {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
        </div>
      )}
    </div>
  );
}