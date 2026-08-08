import Link from 'next/link';
import { Calendar, User, ArrowRight } from 'lucide-react';
// AUDIT_STATUSES has status labels and colors for display
import { formatDate, AUDIT_STATUSES } from '@/lib/utils';
import Badge, { getAuditStatusVariant } from '@/components/ui/Badge';

/**
 * =============================================================================
 * TYPE DEFINITION: Audit
 * =============================================================================
 * 
 * Defines the shape of an audit object from the backend API.
 * 
 * - leadAuditor can be null
 * - Audit might not have lead auditor assigned yet
 * - Backend returns null in this case
 * - We need to handle this in the UI
 */
interface Audit {
  id: number;
  title: string;
  scheduledStartDate: string;  // ISO date string
  scheduledEndDate: string;    // ISO date string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  
  /**
   * Lead Auditor - CAN BE NULL
   * 
   * - Audit created but lead not assigned yet
   * - Lead auditor removed from system
   * - Data inconsistency
   * 
   * HANDLING:
   * We check for null before rendering auditor name
   */
  leadAuditor: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  
  /**
   * Processes and Standards
   * Arrays can be empty but never null
   */
  processes: Array<{
    id: number;
    name: string;
    acronym: string;
  }>;
  standards: Array<{
    id: number;
    name: string;
    version: string;
  }>;
}

interface UpcomingAuditsProps {
  audits: Audit[];
}

export default function UpcomingAudits({ audits }: UpcomingAuditsProps) {
  // Filter, sort, and limit audits
  const upcomingAudits = audits
    .filter(audit => 
      audit.status === 'scheduled' || 
      audit.status === 'in_progress'
    )
    .sort((a, b) => {
      const dateA = new Date(a.scheduledEndDate).getTime();
      const dateB = new Date(b.scheduledEndDate).getTime();
      return dateA - dateB;
    })
    .slice(0, 5);

  // If empty (0 audits) it shows empty state with calendar icon
  if (upcomingAudits.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="font-body text-sm text-gray-500">
          No upcoming audits scheduled
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcomingAudits.map((audit) => (
        <div
          key={audit.id}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200"
        >
          {/* Left side - Audit info */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h4 className="font-heading text-base font-semibold text-gray-900 mb-2">
              {audit.title}
            </h4>

            {/* Date range and lead auditor */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* Date range */}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="font-body">
                  {formatDate(audit.scheduledStartDate)} - {formatDate(audit.scheduledEndDate)}
                </span>
              </div>

              {/**
               * Lead auditor - WITH NULL CHECK
               * 
               * CONDITIONAL RENDERING:
               * Only show if leadAuditor exists (not null)
               * 
               * WHY?
               * - Backend can return null
               * - Can't access .firstName on null (would crash)
               * - Better to show nothing than crash
               * 
               */}
              {audit.leadAuditor && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="font-body">
                    {audit.leadAuditor.firstName} {audit.leadAuditor.lastName} (Lead)
                  </span>
                </div>
              )}

              {/* Status badge */}
              <Badge variant={getAuditStatusVariant(audit.status)}>
                {AUDIT_STATUSES[audit.status].label}
              </Badge>
            </div>
          </div>

          {/* Right side - View details link */}
          <Link
            href={`/audits/${audit.id}`}
            className="ml-4 flex items-center gap-2 px-4 py-2 text-sm font-body font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
          >
            View Details
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ))}

      {/* View all audits link */}
      <Link
        href="/audits"
        className="block text-center py-2 text-sm font-body font-medium text-primary-600 hover:text-primary-700 transition-colors"
      >
        View All Audits →
      </Link>
    </div>
  );
}