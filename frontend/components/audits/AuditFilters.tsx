/**
 * =============================================================================
 * AUDIT FILTERS COMPONENT
 * =============================================================================
 * 
 * Reusable filter controls for audit lists.
 * 
 * - Search box
 * - Status multi-select
 * - Audit type multi-select
 * - Process dropdown
 * - Department dropdown
 * - My role dropdown
 * - My view toggle
 * - Clear filters button
 */

import React, { useState, useEffect, HTMLAttributes } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { cn, AUDIT_STATUSES, AUDIT_TYPES, TEAM_ROLES } from '@/lib/utils';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { AuditFilters as FilterValues } from '@/lib/hooks/useAuditFilters';
import { AuditStatus, AuditType, TeamMemberRole } from '@/lib/api/audits';

// Import API functions for dropdowns
import { getAllProcesses, Process } from '@/lib/api/processes';

// ============================================================================
// TYPES
// ============================================================================

interface AuditFiltersProps extends HTMLAttributes<HTMLDivElement> {
  filters: FilterValues;    // Current filter values
  onFilterChange: <K extends keyof FilterValues>(key: K, value: FilterValues[K]) => void;   // Callback when filter changes
  onClearFilters: () => void;       // Callback when filters cleared

  // Hide specific filters (for specialized views)
  hideFilters?: Array<'search' | 'status' | 'auditType' | 'process' | 'myRole' | 'myView'>;
  showFilterCount?: boolean;    // Show active filter count
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AuditFilters({
  filters,
  onFilterChange,
  onClearFilters,
  hideFilters = [],
  showFilterCount = true,
  className,
  ...props
}: AuditFiltersProps) {

  // ========================================
  // STATE: Dropdown options
  // ========================================

  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // ========================================
  // FETCH: Dropdown options on mount
  // ========================================

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setIsLoadingOptions(true);

        // Fetch all options in parallel
        const [processesRes] = await Promise.all([
          getAllProcesses(),
        ]);

        setProcesses(processesRes.data.processes);

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
  const handleStatusToggle = (status: AuditStatus) => {
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

  /**
   * Handle audit type checkbox toggle
   */
  const handleAuditTypeToggle = (auditType: AuditType) => {
    const currentTypes = Array.isArray(filters.auditType)
      ? filters.auditType
      : filters.auditType
        ? [filters.auditType]
        : [];

    const newTypes = currentTypes.includes(auditType)
      ? currentTypes.filter(t => t !== auditType)  // Remove
      : [...currentTypes, auditType];               // Add

    onFilterChange('auditType', newTypes.length > 0 ? newTypes : undefined);
  };

  // Check if status is selected
  const isStatusSelected = (status: AuditStatus): boolean => {
    if (!filters.status) return false;
    if (Array.isArray(filters.status)) return filters.status.includes(status);
    return filters.status === status;
  };

  // Check if audit type is selected
  const isAuditTypeSelected = (auditType: AuditType): boolean => {
    if (!filters.auditType) return false;
    if (Array.isArray(filters.auditType)) return filters.auditType.includes(auditType);
    return filters.auditType === auditType;
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
            placeholder="Search by audit title..."
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
              {Object.entries(AUDIT_STATUSES).map(([key, { label }]) => {
                const selected = isStatusSelected(key as AuditStatus);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleStatusToggle(key as AuditStatus)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
                      selected
                        ? 'bg-secondary-600 text-white border-secondary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-secondary-600'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* AUDIT TYPE MULTI-SELECT */}
        {shouldShowFilter('auditType') && (
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audit Type
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(AUDIT_TYPES).map(([key, { label }]) => {
                const selected = isAuditTypeSelected(key as AuditType);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleAuditTypeToggle(key as AuditType)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
                      selected
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-600'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
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

        {/* MY ROLE DROPDOWN */}
        {shouldShowFilter('myRole') && (
          <div className="min-w-[200px]">
            <label
              htmlFor="myRole"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              My Role
            </label>
            <div className="relative">
              <select
                id="myRole"
                value={filters.myRole || ''}
                onChange={(e) => onFilterChange(
                  'myRole',
                  e.target.value ? (e.target.value as TeamMemberRole) : undefined
                )}
                className={cn(
                  'w-full appearance-none rounded-lg border border-gray-300 bg-white',
                  'px-3 py-2 pr-10 text-sm text-gray-900',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500'
                )}
              >
                <option value="">All Roles</option>
                {Object.entries(TEAM_ROLES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* MY VIEW TOGGLE */}
        {shouldShowFilter('myView') && (
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.myView || false}
                onChange={(e) => onFilterChange('myView', e.target.checked || undefined)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                My Audits Only
              </span>
            </label>
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