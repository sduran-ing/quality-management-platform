/**
 * =============================================================================
 * AUDIT DETAILS COMPONENT
 * =============================================================================
 * 
 * Displays audit information and team members.
 * - Audit Information (dates, processes, standards, description)
 * - Audit Team (lead auditor, auditors, auditees)
 */

import React from 'react';
import {
  Calendar,
  User,
  Users,
  Bolt
} from 'lucide-react';
import { Audit } from '@/lib/api/audits';
import { formatDate, formatUserName } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface AuditDetailsProps {
  audit: Audit;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AuditDetails({ audit }: AuditDetailsProps) {

  // ========================================
  // COMPUTED VALUES
  // ========================================

  /**
   * Get lead auditor from team members
   */
  const leadAuditor = audit.teamMembers?.find(
    member => member.auditTeam?.role === 'lead_auditor'
  );

  /**
   * Group team members by role
   */
  const auditors = audit.teamMembers?.filter(
    member => member.auditTeam?.role === 'auditor'
  ) || [];

  const auditees = audit.teamMembers?.filter(
    member => member.auditTeam?.role === 'auditee'
  ) || [];

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-6">

      {/* ========================================
          AUDIT INFORMATION CARD
          ======================================== */}
      <div>
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Scheduled Start Date */}
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                <Calendar className="h-3 w-3 inline mr-1" />
                Scheduled Start Date
              </p>
              <p className="text-base text-gray-900">
                {formatDate(audit.scheduledStartDate)}
              </p>
            </div>

            {/* Scheduled End Date */}
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                <Calendar className="h-3 w-3 inline mr-1" />
                Scheduled End Date
              </p>
              <p className="text-base text-gray-900">
                {formatDate(audit.scheduledEndDate)}
              </p>
            </div>

            {/* Created By */}
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                <User className="h-3 w-3 inline mr-1" />
                Created By
              </p>
              <p className="text-base text-gray-900">
                {audit.creator ? formatUserName(audit.creator) : 'Unknown'}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">
                {formatDate(audit.createdAt)}
              </p>
            </div>

            {/* Actual Start Date */}
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                <Calendar className="h-3 w-3 inline mr-1" />
                Actual Start Date
              </p>
              <p className="text-base text-gray-900">
                {audit.actualStartDate ? formatDate(audit.actualStartDate) : (
                  <span className="text-gray-500 italic">Not started</span>
                )}
              </p>
            </div>

            {/* Actual End Date */}
            <div className="md:col-span-2 lg:col-span-2">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                <Calendar className="h-3 w-3 inline mr-1" />
                Actual End Date
              </p>
              <p className="text-base text-gray-900">
                {audit.actualEndDate ? formatDate(audit.actualEndDate) : (
                  <span className="text-gray-500 italic">Not completed</span>
                )}
              </p>
            </div>

            {/* Processes in Scope */}
            <div className="md:col-span-2 lg:col-span-1">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                <Bolt className="h-3 w-3 inline mr-1" />
                Processes in Scope
              </p>
              {audit.processes && audit.processes.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {audit.processes.map(process => (
                    <li key={process.id} className="text-base text-gray-900">
                      {process.name} ({process.acronym})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base text-gray-500 italic">None specified</p>
              )}
            </div>

            {/* Standards */}
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                Standards
              </p>
              {audit.standards && audit.standards.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {audit.standards.map(standard => (
                    <li key={standard.id} className="text-base text-gray-900">
                      {standard.name} {standard.version}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base text-gray-500 italic">None specified</p>
              )}
            </div>
          </div>

          {/* Description */}
          {audit.description && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                Description
              </p>
              <p className="text-base text-gray-900">
                {audit.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================
          AUDIT TEAM CARD
          ======================================== */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          <Users className="h-5 w-5 inline mr-2" />
          Audit Team
        </h3>
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Lead Auditor */}
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                Lead Auditor
              </p>
              {leadAuditor ? (
                <div className="space-y-1">
                  <p className="text-base text-gray-900">
                    {formatUserName(leadAuditor)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {leadAuditor.email}
                  </p>
                </div>
              ) : (
                <p className="text-base text-gray-500 italic">Not assigned</p>
              )}
            </div>

            {/* Auditors */}
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                Auditors ({auditors.length})
              </p>
              {auditors.length > 0 ? (
                <ul className="space-y-2">
                  {auditors.map(auditor => (
                    <li key={auditor.id}>
                      <p className="text-base text-gray-900">
                        {formatUserName(auditor)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {auditor.email}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base text-gray-500 italic">None assigned</p>
              )}
            </div>

            {/* Auditees */}
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                Auditees ({auditees.length})
              </p>
              {auditees.length > 0 ? (
                <ul className="space-y-2">
                  {auditees.map(auditee => (
                    <li key={auditee.id}>
                      <p className="text-base text-gray-900">
                        {formatUserName(auditee)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {auditee.email}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base text-gray-500 italic">None assigned</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}