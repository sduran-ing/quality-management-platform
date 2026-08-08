'use client';

/**
 * =============================================================================
 * FINDING DETAIL PAGE
 * =============================================================================
 * 
 * SECTIONS:
 * 1. Finding details
 * 2. Corrective actions
 * 
 * ROUTE: /audits/[id]/findings/[findingId]
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Calendar, AlertCircle, Bolt, FileText, TriangleAlert, Plus } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useFinding } from '@/lib/hooks/useFindings';
import { useCorrectiveActions } from '@/lib/hooks/useCorrectiveActions';
import FindingActions, { FindingAction } from '@/components/audits/FindingActions';
import Badge, { getFindingSeverityVariant, getFindingStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { formatDate, formatUserName, FINDING_SEVERITIES, FINDING_STATUSES } from '@/lib/utils';
import CorrectiveActionCard from '@/components/audits/CorrectiveActionCard';

// Add Corrective Action Modals
import { useModal } from '@/lib/hooks/useModal';
import CreateCorrectiveActionModal from '@/components/modals/audits/correctiveActions/CreateCorrectiveActionModal';
import DeleteCorrectiveActionModal from '@/components/modals/audits/correctiveActions/DeleteCorrectiveActionModal';
import RejectCorrectiveActionModal from '@/components/modals/audits/correctiveActions/RejectCorrectiveActionModal';
import EditCorrectiveActionModal from '@/components/modals/audits/correctiveActions/EditCorrectiveActionModal';
import ApproveCorrectiveActionModal from '@/components/modals/audits/correctiveActions/ApproveCorrectiveActionModal';
import ImplementCorrectiveActionModal from '@/components/modals/audits/correctiveActions/ImplementCorrectiveActionModal';
import VerifyCorrectiveActionModal from '@/components/modals/audits/correctiveActions/VerifyCorrectiveActionModal';
import { CorrectiveAction } from '@/lib/api/correctiveActions';
import { CorrectiveActionOption } from '@/components/audits/CorrectiveActionOptions';

// Add Finding Modals
import DeleteFindingModal from '@/components/modals/audits/findings/DeleteFindingModal';
import EditFindingModal from '@/components/modals/audits/findings/EditFindingModal';
import CloseFindingModal from '@/components/modals/audits/findings/CloseFindingModal';
import { Finding } from '@/lib/api/findings';

// Add audit team members
import { getAuditTeamMembers, TeamMember } from '@/lib/api/audits';
import { getUserAuditRoles } from '@/lib/utils/permissions';

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const auditId = parseInt(params.id as string, 10);
  const findingId = parseInt(params.findingId as string, 10);

  // ========================================
  // FETCH FINDING & CORRECTIVE ACTIONS
  // ========================================

  const { finding, isLoading: findingLoading, error: findingError, refetch: findingRefetch } = useFinding(auditId, findingId);
  const { actions, isLoading: actionsLoading, error: actionsError, refetch: actionRefetch } = useCorrectiveActions(auditId, findingId);

  // Add state for team members
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);

  // Fetch team members
useEffect(() => {
  const fetchTeamMembers = async () => {
    try {
      setIsLoadingTeam(true);
      const response = await getAuditTeamMembers(auditId);
      setTeamMembers(response.data.teamMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  fetchTeamMembers();
}, [auditId]);

/**
 * Calculate user's audit roles for this page
 * 
 * useMemo is a React hook that "memoizes" (caches) a computed value
 * It only recalculates when dependencies change
 * 
 * Depedencies array [user?.id, teamMembers]:
 * - React compares these values between renders
 * - If they're the same (by reference), skip recomputation
 * - If different, recompute
 * 
 * E.g.
 * - User logs out (user?.id changes): Recalculates 
 * - Audit team updated (teamMembers changes): Recalculates 
 * - Just a re-render (nothing changed): Uses cache 
 */
const auditRoles = useMemo(
  // Syntax: () => computeValue(), [dependency1, dependency2])
  () => getUserAuditRoles(user?.id || 0, teamMembers),
  [user?.id, teamMembers]
);

// Checks if user is QM
const isQM = user?.role === 'quality_manager';

// ========================================
// FINDINGS ACTION MODALS
// ========================================

  const deleteFindingModal = useModal<Finding>();   // Store finding to be deleted
  const editFindingModal = useModal<Finding>();
  const closeFindingModal = useModal<Finding>();

// ========================================
// CORRECTIVE ACTION MODALS
// ========================================
const createCAModal = useModal<void>();
const deleteCAModal = useModal<CorrectiveAction>();  // Store corrective action to be deleted
const rejectCAModal = useModal<CorrectiveAction>();  // Store corrective action to be rejected
const editCAModal = useModal<CorrectiveAction>();   // Store corrective action to be edited
const approveCAModal = useModal<CorrectiveAction>()   // Store corrective action to be approved
const implementCAModal = useModal<CorrectiveAction>();
const verifyCAModal = useModal<CorrectiveAction>();

// ========================================
// HANDLERS
// ========================================

/**
 * Handle finding actions
 */
const handleFindingAction = (actionType: FindingAction) => {
  console.log('Finding action selected:', actionType);

  // Early return if finding is null
  if (!finding) {
    console.error('Finding is null - cannot perform action');
    return;
  }
  
  switch (actionType) {
    case 'edit':
      editFindingModal.open(finding);
      break;
    case 'close':
      closeFindingModal.open(finding);
      break;
    case 'addCorrectiveAction':
      createCAModal.open();
      break;
    case 'delete':
      deleteFindingModal.open(finding);
      break;
    default:
      return false;
  }
};

  /**
   * Handle add correctice action
   */
  const handleAddCA = () => {
    createCAModal.open();
  };

  /**
   * Handle corrective action options
   */
  const handleActionOption = (optionType: CorrectiveActionOption, correctiveAction: CorrectiveAction) => {
  console.log('CA option:', optionType, correctiveAction);
  
  switch (optionType) {
    case 'delete':
      deleteCAModal.open(correctiveAction);  // Open modal with action data
      break;

    case 'approve':
      approveCAModal.open(correctiveAction);
      break;

    case 'reject':
      rejectCAModal.open(correctiveAction);
      break;

    case 'edit':
      editCAModal.open(correctiveAction);
      break;

    case 'implement':
      implementCAModal.open(correctiveAction);
      break;

    case 'verify':
      verifyCAModal.open(correctiveAction);
      break;
    
    default:
      return false;
  }
};

  // ========================================
  // LOADING STATE
  // ========================================

  if (findingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading finding...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================

  if (findingError || !finding) {
    return (
      <div className="p-6">
        <ErrorMessage message={findingError || 'Finding not found'} />
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/audits/${auditId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Audit
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
            onClick={() => router.push(`/audits/${auditId}`)}
            className="gap-2 text-gray-600 hover:text-gray-900"
        >
            <ArrowLeft className="h-4 w-4" />
            Back to Audit
        </Button>

        {/* Finding Actions Dropdown - The authorization for rendering is checked in the component <FindingActions> */}
        {user && (
            <FindingActions
            finding={finding}
            userRole={user.role as 'quality_manager' | 'process_owner' | 'employee'}
            userId={user.id}
            auditRoles={auditRoles}   // Pass verification of audit team roles
            onSelect={handleFindingAction}
            />
        )}
        </div>

        {/* ========================================
            SECTION 1: FINDING DETAILS
            ======================================== */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-6">
            
            {/* Title and Badges */}
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl font-semibold text-gray-900">
                Finding {finding.findingNumber}
              </h1>

              <Badge variant={getFindingStatusVariant(finding.status)} className="text-sm px-3 py-1">
                {FINDING_STATUSES[finding.status]?.label || finding.status}
              </Badge>
            </div>

            <h2 className="text-lg font-bold text-gray-900 pb-2">
              ID: {finding.id}
            </h2>

            {/* Audit Info */}
            {finding.audit && (
              <h2 className="text-lg text-gray-700 mb-4 font-medium">
                Audit: {finding.audit.title}
              </h2>
            )}

            <div className="space-y-6">

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Finding Description
                </h3>
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <p className="text-base text-gray-900 whitespace-pre-wrap">
                    {finding.description}
                  </p>
                </div>
              </div>

              {/* Finding Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Finding Information
                </h3>
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Type */}

                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                          <TriangleAlert className="h-3 w-3 inline mr-1" />
                          Severity
                        </p>
                        <Badge variant={getFindingSeverityVariant(finding.severity)} className="text-sm px-3 py-1">
                            {FINDING_SEVERITIES[finding.severity]?.label || finding.severity}
                        </Badge>
                      </div>


                    {/* Process */}
                    {finding.process && (
                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                          <Bolt className="h-3 w-3 inline mr-1" />
                          Process
                        </p>
                        <p className="text-base text-gray-900">
                          {finding.process.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {finding.process.acronym}
                        </p>
                      </div>
                    )}

                    {/* Standard Requirement */}
                    {finding.requirement && (
                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                          <FileText className="h-3 w-3 inline mr-1" />
                          Standard Requirement
                        </p>

                        <p className="text-base text-gray-900">
                          {finding.requirement.clauseNumber}. - {finding.requirement.title}
                        </p>
                      </div>
                    )}

                    {/* Created By */}
                    {finding.creator && (
                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                          <User className="h-3 w-3 inline mr-1" />
                          Created By
                        </p>
                        <p className="text-base text-gray-900">
                          {formatUserName(finding.creator)}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {formatDate(finding.createdAt)}
                        </p>
                      </div>
                    )}

                    {/* Closed By */}
                    {finding.closedBy && finding.closedAt && (
                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                          <User className="h-3 w-3 inline mr-1" />
                          Closed By
                        </p>
                        <p className="text-base text-gray-900">
                          {formatUserName(finding.closedByUser)}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {formatDate(finding.closedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Evidence Description */}
              {finding.evidenceDescription && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Evidence Description
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <p className="text-base text-gray-900 whitespace-pre-wrap">
                      {finding.evidenceDescription}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ========================================
            SECTION 2: CORRECTIVE ACTIONS
            ======================================== */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Corrective Actions {actions.length > 0 && `(${actions.length})`}
            </h2>
            
            {/* Only aduitee or QM can create corrective actions for the findings */}
            {((auditRoles.isAuditee || isQM) && 
            (finding.status === 'open' || finding.status === 'in_progress')) &&  (
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddCA}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Corrective Action
            </Button>
          )}
          </div>
            {/* Loading State */}
            {actionsLoading && (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
                <span className="ml-3 text-gray-600">Loading corrective actions...</span>
              </div>
            )}

            {/* Error State */}
            {actionsError && !actionsLoading && (
              <ErrorMessage message={actionsError} />
            )}

            {/* Actions List */}
            {!actionsLoading && !actionsError && (
              <div className="space-y-4">
                {actions.map(action => (
                    <CorrectiveActionCard
                      key={action.id}
                      action={action}
                      userRole={user?.role as 'quality_manager' | 'process_owner' | 'employee'}
                      auditRoles={auditRoles}  // Pass verification of audit team roles
                      onActionSelect={handleActionOption}
                    />
                ))}

                {/* Empty State */}
                {actions.length === 0 && (
                  <div className="text-center py-12 border border-gray-200 rounded-lg">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No corrective actions
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No corrective actions have been created for this finding yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

    {/* Delete Finding Modal */}
    {deleteFindingModal.data && (
      <DeleteFindingModal
        isOpen={deleteFindingModal.isOpen}
        onClose={deleteFindingModal.close}
        auditId={auditId}
        finding={deleteFindingModal.data}
        onSuccess={() => {
          // Navigate back to audit page
          router.push(`/audits/${auditId}`);
        }}
      />
    )}

    {/* Edit Finding Modal */}
    {editFindingModal.data && (
      <EditFindingModal
        isOpen={editFindingModal.isOpen}
        onClose={editFindingModal.close}
        auditId={auditId}
        finding={editFindingModal.data}
        onSuccess={() => {          
          editFindingModal.close();
          findingRefetch();   // Refresh finding data
        }}
      />
    )}

    {/* Close Finding Modal */}
    {closeFindingModal.data && (
      <CloseFindingModal
        isOpen={closeFindingModal.isOpen}
        onClose={closeFindingModal.close}
        auditId={auditId}
        finding={closeFindingModal.data}
        correctiveActions={actions}  // Pass corrective actions for validation inside the modal
        onSuccess={() => {
          closeFindingModal.close();
          findingRefetch();   // Refresh finding data
        }}
      />
    )}

    {/* Create CA Modal */}
    {finding && (
      <CreateCorrectiveActionModal
        isOpen={createCAModal.isOpen}
        onClose={createCAModal.close}
        auditId={auditId}
        findingId={findingId}
        findingNumber={finding.findingNumber}
        onSuccess={() => {
          createCAModal.close();
          actionRefetch();
        }}
      />
    )}

    {/* Delete CA Modal */}
    {deleteCAModal.data && (
      <DeleteCorrectiveActionModal
        isOpen={deleteCAModal.isOpen}
        onClose={deleteCAModal.close}
        auditId={auditId}
        findingId={findingId}
        correctiveAction={deleteCAModal.data}
        onSuccess={() => {
          deleteCAModal.close();
          actionRefetch();
        }}
      />
    )}

    {/* Reject CA Modal */}
{rejectCAModal.data && (
  <RejectCorrectiveActionModal
    isOpen={rejectCAModal.isOpen}
    onClose={rejectCAModal.close}
    auditId={auditId}
    findingId={findingId}
    action={rejectCAModal.data}
    onSuccess={() => {
          rejectCAModal.close();
          actionRefetch();
        }}
  />
)}

{/* Edit CA Modal */}
{editCAModal.data && (
  <EditCorrectiveActionModal
    isOpen={editCAModal.isOpen}
    onClose={editCAModal.close}
    auditId={auditId}
    findingId={findingId}
    action={editCAModal.data}
    onSuccess={() => {
          editCAModal.close();
          actionRefetch();
        }}
  />
)}

{/* Approve CA Modal */}
{approveCAModal.data && (
  <ApproveCorrectiveActionModal
    isOpen={approveCAModal.isOpen}
    onClose={approveCAModal.close}
    auditId={auditId}
    findingId={findingId}
    action={approveCAModal.data}
    onSuccess={() => {
          approveCAModal.close();
          actionRefetch();
          findingRefetch();   // Refresh finding data to perceive status changes
        }}
  />
)}

{/* Implement CA Modal */}
{implementCAModal.data && (
  <ImplementCorrectiveActionModal
    isOpen={implementCAModal.isOpen}
    onClose={implementCAModal.close}
    auditId={auditId}
    findingId={findingId}
    action={implementCAModal.data}
    onSuccess={() => {
          implementCAModal.close();
          actionRefetch();
        }}
  />
)}

{/* Verify CA Modal */}
{verifyCAModal.data && (
  <VerifyCorrectiveActionModal
    isOpen={verifyCAModal.isOpen}
    onClose={verifyCAModal.close}
    auditId={auditId}
    findingId={findingId}
    action={verifyCAModal.data}
    onSuccess={() => {
          verifyCAModal.close();
          actionRefetch();
          findingRefetch();   // Refresh finding data to perceive status changes
        }}
  />
)}

      </div>
    </div>
  );
}