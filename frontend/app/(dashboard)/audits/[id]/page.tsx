'use client';

/**
 * =============================================================================
 * AUDIT DETAIL PAGE
 * =============================================================================
 * 
 * 1. Audit details
 * 2. Findings section
 * 
 * ROUTE: /audits/[id]
 */

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAudit } from '@/lib/hooks/useAudits';
import Badge, { getAuditStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { AUDIT_STATUSES, AUDIT_TYPES } from '@/lib/utils';
import { getUserAuditRoles } from '@/lib/utils/permissions';

// Audit components
import AuditActions, { AuditAction } from '@/components/audits/AuditActions';
import AuditDetails from '@/components/audits/AuditDetails';
import FindingsList from '@/components/audits/FindingsList';

// Modals
import { Audit } from '@/lib/api/audits';
import StartAuditModal from '@/components/modals/audits/StartAuditModal';
import CompleteAuditModal from '@/components/modals/audits/CompleteAuditModal';
import CancelAuditModal from '@/components/modals/audits/CancelAuditModal';
import CreateFindingModal from '@/components/modals/audits/findings/CreateFindingModal';

import { useModal } from '@/lib/hooks/useModal';

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const auditId = parseInt(params.id as string, 10);

  // ========================================
  // FETCH AUDIT
  // ========================================

  const { audit, isLoading, error, refetch } = useAudit(auditId);

/**
 * Calculate user's audit roles for this page
 * 
 * useMemo is a React hook that "memoizes" (caches) a computed value
 * It only recalculates when dependencies change
 * 
 * Depedencies array [user?.id, audit?.teamMembers]:
 * - React compares these values between renders
 * - If they're the same (by reference), skip recomputation
 * - If different, recompute
 * 
 * E.g.
 * - User logs out (user?.id changes): Recalculates 
 * - Audit team updated (audit?.teamMembers changes): Recalculates 
 * - Just a re-render (nothing changed): Uses cache 
 */
  const auditRoles = useMemo(
  // Syntax: () => computeValue(), [dependency1, dependency2])
  () => getUserAuditRoles(user?.id || 0, audit?.teamMembers || []),
  [user?.id, audit?.teamMembers]
);

  // Declare team membership roles for permission checks
  const { isAuditor } = auditRoles;

  // Permission checks for creating findings, calculated here and sent in <FindingsList>
  const isQM = user?.role === 'quality_manager';
  const auditInProgress = audit?.status === 'in_progress';
  const canAddFindings = (isQM || isAuditor) && auditInProgress;  


  // ========================================
  // AUDIT MODALS
  // ========================================

  const startAuditModal = useModal<Audit>();  // Stores the audit to be started
  const completeAuditModal = useModal<Audit>();
  const cancelAuditModal = useModal<Audit>();

  // ========================================
  // FINDING MODALS
  // ========================================

  const createFindingModal = useModal<void>();

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Handle audit actions
   */
  const handleAuditAction = (action: AuditAction) => {

    // Early return if audit is null
    if (!audit) {
      console.error('Audit is null - cannot perform action');
      return;
    }

    switch (action) {
      case 'edit':      
      router.push(`/audits/${auditId}/edit`);
      break;

      case 'start':      
      startAuditModal.open(audit);  // Open modal for starting an audit
      break;

      case 'complete':      
      completeAuditModal.open(audit);  // Open modal for completing an audit
      break;

      case 'cancel':      
      cancelAuditModal.open(audit);  // Open modal for cancelling an audit
      break;

      case 'addFinding':
      createFindingModal.open();  // Open modal for creating a finding
      break;

      default:
        console.warn(`Unhandled action: ${action}`);
    }
  };

  /**
   * Handle add finding from FindingsList component
   */
  const handleAddFinding = () => {
    // Open add finding modal
    createFindingModal.open();
  };

  // ========================================
  // LOADING STATE
  // ========================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading audit...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================

  if (error || !audit) {
    return (
      <div className="p-6">
        <ErrorMessage message={error || 'Audit not found'} />
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/audits')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Audits
        </Button>
      </div>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="space-y-6 p-6">

        {/* ========================================
            HEADER
            ======================================== */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/audits')}
            className="gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Audits
          </Button>

          {/* Actions Dropdown - The authorization for rendering is checked in the component <AuditActions> */}
          {user && (
            <AuditActions
              audit={audit}
              userRole={user.role as 'quality_manager' | 'process_owner' | 'employee'}
              auditRoles={auditRoles}
              onSelect={handleAuditAction}
            />
          )}
        </div>

        {/* ========================================
            SECTION 1: AUDIT DETAILS
            ======================================== */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-6">
            {/* Title and Status */}
            
            <h2 className="text-xl text-gray-700 mb-2 font-medium">
              {AUDIT_TYPES[audit.auditType].label} Audit
            </h2>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl font-semibold text-gray-900">
                {audit.title}
              </h1>

              <Badge variant={getAuditStatusVariant(audit.status)} className="text-sm px-3 py-1">
                {AUDIT_STATUSES[audit.status].label}
              </Badge>              
            </div>


            <h2 className="text-lg font-bold text-gray-900 pb-2">
              ID: {audit.id}
            </h2>

            {/* Audit Details Component */}
            <AuditDetails audit={audit} />
          </div>
        </div>

        {/* ========================================
            SECTION 2: FINDINGS
            ======================================== */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-6">
            {/* FindingsList fetches its own data */}
            <FindingsList
              auditId={auditId}
              canAddFindings={canAddFindings}
              onAddFinding={handleAddFinding}
            />
          </div>
        </div>

    {/* Start Audit Modal */}
    {startAuditModal.data && (
      <StartAuditModal
        isOpen={startAuditModal.isOpen}
        onClose={startAuditModal.close}
        audit={startAuditModal.data}
        onSuccess={() => {
          startAuditModal.close();
          refetch();
        }}
      />
    )}

    {/* Complete Audit Modal */}
    {completeAuditModal.data && (
      <CompleteAuditModal
        isOpen={completeAuditModal.isOpen}
        onClose={completeAuditModal.close}
        audit={completeAuditModal.data}
        onSuccess={() => {
          completeAuditModal.close();
          refetch();
        }}
      />
    )}

    {/* Create finding Modal */}
    {audit && (
      <CreateFindingModal
        isOpen={createFindingModal.isOpen}
        onClose={createFindingModal.close}
        auditId={auditId}
        onSuccess={() => {
          createFindingModal.close();
          refetch();
        }}
      />
    )}

    {/* Cancel Audit Modal */}
    {cancelAuditModal.data && (
      <CancelAuditModal
        isOpen={cancelAuditModal.isOpen}
        onClose={cancelAuditModal.close}
        audit={cancelAuditModal.data}
        onSuccess={() => {
          // Redirect to audits list after cancellation
          router.push('/audits');
        }}
      />
    )}

      </div>
    </div>
  );
}