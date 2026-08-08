/**
 * Application-wide constants
 * Centralizing these makes them easy to change and type-safe
 */

// Document statuses with their display properties
export const DOCUMENT_STATUSES = {
  draft: {
    label: 'Draft',
    color: 'text-gray-700 bg-gray-100 border-gray-300',
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'text-amber-700 bg-amber-100 border-amber-300',
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-700 bg-emerald-100 border-emerald-300',
  },
  outdated: {
    label: 'Outdated',
    color: 'bg-red-100 text-red-500 border-red-300',
  },
  obsolete: {
    label: 'Obsolete',
    color: 'text-red-700 bg-red-100 border-red-300',
  },
  // 'as const' makes this read-only
  // This way TypeScript knows:
  // STATUS.draft.label  => Type: "Draft" (exactly this string, nothing else)
} as const;  

// Audit statuses
export const AUDIT_STATUSES = {
  scheduled: {
    label: 'Scheduled',
    color: 'text-blue-700 bg-blue-100',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-amber-700 bg-amber-100',
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-700 bg-emerald-100',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-700 bg-red-100',
  },
} as const;

/**
 * Audit type display configuration
 */
export const AUDIT_TYPES = {
  internal: {
    label: 'Internal',
    description: 'Internal company audit'
  },
  external: {
    label: 'External',
    description: 'External third-party audit'
  },
  certification: {
    label: 'Certification',
    description: 'Certification audit (e.g., ISO)'
  },
  surveillance: {
    label: 'Surveillance',
    description: 'Surveillance audit for maintaining certification'
  }
} as const;

/**
 * Team member role display configuration
 */
export const TEAM_ROLES = {
  lead_auditor: {
    label: 'Lead Auditor',
    description: 'Leads the audit and is responsible for final report'
  },
  auditor: {
    label: 'Auditor',
    description: 'Supports the lead auditor in conducting the audit'
  },
  auditee: {
    label: 'Auditee',
    description: 'Person or department being audited'
  }
} as const;

// Finding severity levels
export const FINDING_SEVERITIES = {
  major_nonconformity: {
    label: 'Major Nonconformity',
    color: 'text-red-700 bg-red-100 border-red-300',
    icon: '🔴',
  },
  minor_nonconformity: {
    label: 'Minor Nonconformity',
    color: 'text-amber-700 bg-amber-100 border-amber-300',
    icon: '🟡',
  },
  opportunity: {
    label: 'Opportunity for Improvement',
    color: 'text-cyan-700 bg-cyan-100 border-cyan-300',
    icon: '💡',
  },
} as const;

// Audit statuses
export const FINDING_STATUSES = {
  open: {
    label: 'Open',
    color: 'text-blue-700 bg-blue-100',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-amber-700 bg-amber-100',
  },
  closed: {
    label: 'Closed',
    color: 'text-emerald-700 bg-emerald-100',
  },
  pending_verification: {
    label: 'Pending Verification',
    color: 'text-gray-700 bg-gray-100',
  },
} as const;

// Audit statuses
export const CORRECTIVE_ACTION_STATUSES = {
  proposed: {
    label: 'Proposed',
    color: 'text-gray-700 bg-gray-100',
    description: 'Action has been proposed and awaits approval'
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700 bg-red-100',
    description: 'Action was rejected and needs revision'
  },
  in_implementation: {
    label: 'In Implementation',
    color: 'text-amber-700 bg-amber-100',
    description: 'Action has been approved and is being implemented'
  },
  pending_verification: {
    label: 'Pending Verification',
    color: 'text-amber-700 bg-amber-100',
    description: 'Implementation complete, awaiting verification'
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-700 bg-emerald-100',
    description: 'Action has been verified as effective'
  },
} as const;

/**
 * =============================================================================
 * ALLOWED FILE TYPES
 * =============================================================================
 * 
 * Matches backend s3Utils.js allowed types
 * 
 * SUPPORTED FORMATS:
 * - PDF documents
 * - Word documents (.doc, .docx)
 * - Excel spreadsheets (.xls, .xlsx)
 * - Images (.jpg, .jpeg, .png)
 */
export const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/jpg': '.jpg'
};

// Max file size for uploading documents
// Also matches backend s3Utils.js
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// API Base URL (we'll use environment variable in production)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';