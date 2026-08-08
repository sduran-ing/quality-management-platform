/**
 * =============================================================================
 * DOCUMENTS TABLE COMPONENT
 * =============================================================================
 * 
 * Main table for displaying document versions with pagination and actions.
 * 
 * - Sortable columns (future enhancement)
 * - Responsive design (desktop/tablet/mobile)
 * - Loading states
 * - Empty states
 * - Action dropdown per row
 */

import React from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { DocumentVersion } from '@/lib/api/documents';

// UI components
import Spinner from '@/components/ui/Spinner';
import Badge, { getDocumentStatusVariant } from '@/components/ui/Badge';

import DocumentActions, { DocumentAction } from './DocumentActions';
import { cn, formatDate, formatUserName, DOCUMENT_STATUSES } from '@/lib/utils';


// ============================================================================
// TYPES
// ============================================================================

// User role (for permission checking in actions)
type UserRole = 'quality_manager' | 'process_owner' | 'employee';

interface DocumentsTableProps {

    versions: DocumentVersion[];      // Document versions to display
    userRole: UserRole;       // Current user's role (for actions permissions)
    userId: number;       // Current user's ID (for actions permissions)
    onActionSelect: (action: DocumentAction, version: DocumentVersion) => void;       // Callback when action is selected
    isLoading?: boolean;      // Loading state
    className?: string;       // Custom className for wrapper
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DocumentsTable({
    // Component parameters
    versions,
    userRole,
    userId,
    onActionSelect,
    isLoading = false,
    className
}: DocumentsTableProps) {

    // ========================================
    // LOADING STATE
    // ========================================

    if (isLoading) {
        return (
            <div className={cn('bg-white rounded-lg shadow', className)}>
                <div className="p-8 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
                    <Spinner size="lg" />
                    <p className="mt-4 text-gray-600">Loading documents...</p>
                </div>
            </div>
        );
    }

    // ========================================
    // EMPTY STATE
    // ========================================

    if (versions.length === 0) {
        return (
            <div className={cn('bg-white rounded-lg shadow', className)}>
                <div className="p-8 text-center text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your filters or search criteria
                    </p>
                </div>
            </div>
        );
    }

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

                            {/* Code */}
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Code
                            </th>

                            {/* Document Name */}
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Document Name
                            </th>

                            {/* Version */}
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Version
                            </th>

                            {/* Type */}
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

                            {/* Date of Approval */}
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Date of Approval
                            </th>

                            {/* Assigned To */}
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Assigned To
                            </th>

                            {/* Actions */}
                            <th
                                scope="col"
                                className="px-6 py-3 text-center text-xs font-heading font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Actions
                            </th>
                        </tr>
                    </thead>

                    {/* ========================================
              TABLE BODY
              ======================================== */}
                    <tbody className="bg-white divide-y divide-gray-200">
                        {versions.map((version) => (
                            <tr
                                key={version.versionId}
                                className="hover:bg-gray-50 transition-colors"
                            >
                                {/* ID */}
                                <td className="font-body px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {version.documentId}
                                </td>

                                {/* Code (clickable) */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Link
                                        href={
                                            // Only when the version is approved it sends the user to the document details
                                            // Otherwise it will send it to the version details
                                            version.status !== 'approved'
                                                ? `/documents/${version.documentId}/versions/${version.versionId}`
                                                : `/documents/${version.documentId}`
                                        }
                                        className="font-body text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                                    >
                                        {version.code}
                                    </Link>
                                </td>

                                {/* Document Name (clickable) */}
                                <td className="px-6 py-4">
                                    <Link
                                        href={
                                            // Only when the version is approved it sends the user to the document details
                                            // Otherwise it will send it to the version details
                                            version.status !== 'approved'
                                                ? `/documents/${version.documentId}/versions/${version.versionId}`
                                                : `/documents/${version.documentId}`
                                        }
                                        className="font-body text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                                    >
                                        {version.name}
                                    </Link>
                                </td>

                                {/* Version */}
                                <td className="font-body px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {version.versionNumber}
                                </td>

                                {/* Type (full name) */}
                                <td className="font-body px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {version.documentType.name}
                                </td>

                                {/* Status (Badge) */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {/* The badge variant is defined using the helper function from <Badge> */}
                                    <Badge variant={getDocumentStatusVariant(version.status)}>
                                        {/* Maps the status backend names to the constants with the frontend expected output */}
                                        {DOCUMENT_STATUSES[version.status].label}
                                    </Badge>
                                </td>

                                {/* Date of Approval */}
                                <td className="font-body px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {version.approvedAt ? formatDate(version.approvedAt) : '-'}
                                </td>

                                {/* Assigned To */}
                                <td className="font-body px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatUserName(version.assignedApprover)}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <DocumentActions
                                        version={version}
                                        userRole={userRole}
                                        userId={userId}
                                        onSelect={onActionSelect}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}