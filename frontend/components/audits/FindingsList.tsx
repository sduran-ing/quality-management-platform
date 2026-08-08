/**
 * =============================================================================
 * FINDINGS LIST COMPONENT
 * =============================================================================
 * 
 * Container for findings section with add button and empty state.
 * Fetches findings data using useFindings hook.
 */

import React, { useState } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import FindingCard from './FindingCard';
import { useFindings } from '@/lib/hooks/useFindings';

// ============================================================================
// TYPES
// ============================================================================

interface FindingsListProps {
  auditId: number;
  canAddFindings: boolean;
  onAddFinding: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FindingsList({
  auditId,
  canAddFindings,
  onAddFinding
}: FindingsListProps) {

  // ========================================
  // FETCH FINDINGS
  // ========================================

  const { findings, isLoading, error, refetch } = useFindings(auditId);

  // ========================================
  // STATE - Track expanded findings
  // ========================================

  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());

  /**
   * Toggle finding card expansion
   */
  const toggleFinding = (findingId: number) => {
    setExpandedFindings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(findingId)) {
        newSet.delete(findingId);
      } else {
        newSet.add(findingId);
      }
      return newSet;
    });
  };

  // ========================================
  // LOADING STATE
  // ========================================

  if (isLoading) {
    return (
      <div>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            <ClipboardList className="h-5 w-5 inline mr-2" />
            Findings
          </h2>
        </div>

        {/* Loading Spinner */}
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-gray-600">Loading findings...</span>
        </div>
      </div>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================

  if (error) {
    return (
      <div>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            <ClipboardList className="h-5 w-5 inline mr-2" />
            Findings
          </h2>
        </div>

        {/* Error Message */}
        <ErrorMessage message={error} />
        
        {/* Retry Button */}
        <div className="mt-4">
          <Button variant="outline" onClick={refetch}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          <ClipboardList className="h-5 w-5 inline mr-2" />
          Findings ({findings.length})
        </h2>
        {canAddFindings && (
          <Button
            variant="primary"
            size="sm"
            onClick={onAddFinding}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Finding
          </Button>
        )}
      </div>

      {/* Findings Cards */}
      <div className="space-y-4">
        {findings.map(finding => (
          <FindingCard
            key={finding.id}
            finding={finding}
            auditId={auditId}
            isExpanded={expandedFindings.has(finding.id)}
            onToggleExpand={() => toggleFinding(finding.id)}
          />
        ))}

        {/* Empty State */}
        {findings.length === 0 && (
          <div className="text-center py-12 border border-gray-200 rounded-lg">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No findings</h3>
            <p className="mt-1 text-sm text-gray-500">
              No findings have been recorded for this audit yet.
            </p>
            {canAddFindings && (
              <div className="mt-6">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onAddFinding}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add First Finding
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}