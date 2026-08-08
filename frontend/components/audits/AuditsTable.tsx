/**
 * =============================================================================
 * AUDITS TABLE COMPONENT
 * =============================================================================
 * 
 * Main table for displaying audits with pagination and details link.
 * 
 * - Responsive design (desktop/tablet/mobile)
 * - Loading states
 * - Empty states
 * - Details link per row
 */

import React from 'react';
import Link from 'next/link';
import { ClipboardList, ExternalLink } from 'lucide-react';
import { Audit } from '@/lib/api/audits';

// UI components
import Spinner from '@/components/ui/Spinner';
import Badge, { getAuditStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

import { cn, formatDate, formatUserName, AUDIT_STATUSES, AUDIT_TYPES } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface AuditsTableProps {
  audits: Audit[];              // Audits to display
  isLoading?: boolean;          // Loading state
  className?: string;           // Custom className for wrapper
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AuditsTable({
  audits,
  isLoading = false,
  className
}: AuditsTableProps) {

  // ========================================
  // LOADING STATE
  // ========================================

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-lg shadow', className)}>
        <div className="p-8 text-center text-gray-500">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading audits...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // EMPTY STATE
  // ========================================

  if (audits.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg shadow', className)}>
        <div className="p-8 text-center text-gray-500">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No audits found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or search criteria
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // HELPER: Get lead auditor from team members
  // ========================================

  const getLeadAuditor = (audit: Audit) => {
    if (!audit.teamMembers || audit.teamMembers.length === 0) {
      return null;
    }

    // Find team member with lead_auditor role
    const leadAuditor = audit.teamMembers.find(
      member => member.auditTeam?.role === 'lead_auditor'
    );

    return leadAuditor || null;
  };

  // ========================================
  // TABLE RENDER
  // ========================================

  return (
    <div className={cn('bg-white rounded-lg shadow overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">

          {/* ========================================
              TABLE HEADER
              ======================================== */}
          <thead className="bg-gray-50">
            <tr>
              {/* ID */}
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
              >
                ID
              </th>

              {/* Title */}
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
              >
                Audit Title
              </th>

              {/* Audit Type */}
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
              >
                Type
              </th>

              {/* Status */}
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>

              {/* Start Date */}
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
              >
                Start Date
              </th>

              {/* End Date */}
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
              >
                End Date
              </th>

              {/* Lead Auditor */}
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
              >
                Lead Auditor
              </th>

              {/* Details */}
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
              >
                Details
              </th>
            </tr>
          </thead>

          {/* ========================================
              TABLE BODY
              ======================================== */}
          <tbody className="bg-white divide-y divide-gray-200">
            {audits.map((audit) => {
              const leadAuditor = getLeadAuditor(audit);

              return (
                <tr
                  key={audit.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* ID */}
                  <td className="font-body px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {audit.id}
                  </td>

                  {/* Title */}
                  <td className="px-6 py-4">
                    <Link
                        href={`/audits/${audit.id}`}
                        className="font-body text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                        >
                        {audit.title}
                    </Link>
                  </td>

                  {/* Audit Type */}
                  <td className="font-body px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {AUDIT_TYPES[audit.auditType].label}
                  </td>

                  {/* Status (Badge) */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getAuditStatusVariant(audit.status)}>
                      {AUDIT_STATUSES[audit.status].label}
                    </Badge>
                  </td>

                  {/* Start Date */}
                  <td className="font-body px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(audit.scheduledStartDate)}
                  </td>

                  {/* End Date */}
                  <td className="font-body px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(audit.scheduledEndDate)}
                  </td>

                  {/* Lead Auditor */}
                  <td className="font-body px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {leadAuditor ? formatUserName(leadAuditor) : '-'}
                  </td>

                  {/* Details */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Link href={`/audits/${audit.id}`}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}