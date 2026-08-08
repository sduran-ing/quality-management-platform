/**
 * =============================================================================
 * AUDIT PERMISSIONS UTILITIES
 * =============================================================================
 * 
 * Functions for determining user permissions within audits
 * Used across audit-related components to avoid logic duplication
 */

import { TeamMember } from '@/lib/api/audits';

// Audit role flags for a user
export interface AuditRoles {
  isAuditee: boolean;
  isLeadAuditor: boolean;
  isAuditor: boolean;  // Includes lead auditor
}

/**
 * Determine user's roles within an audit team
 * 
 * Pure function, same inputs same output
 * Used with useMemo to avoid recalculating on every render
 * 
 * @param userId - User ID to check
 * @param teamMembers - Audit team members array
 * @returns Object with role flags
 * 
 * @example
 * const roles = getUserAuditRoles(user.id, audit.teamMembers);
 * if (roles.isLeadAuditor) { ... }
 */
export function getUserAuditRoles(
  userId: number,
  teamMembers: TeamMember[]
): AuditRoles {
  return {
    // User is an auditee
    isAuditee: teamMembers.some(
      member => member.id === userId && member.AuditTeam?.role === 'auditee'
    ),
    
    // User is the lead auditor
    isLeadAuditor: teamMembers.some(
      member => member.id === userId && member.AuditTeam?.role === 'lead_auditor'
    ),
    
    // User is an auditor (includes lead auditor)
    isAuditor: teamMembers.some(
      member => member.id === userId && 
      (member.AuditTeam?.role === 'auditor' || member.AuditTeam?.role === 'lead_auditor')
    )
  };
}