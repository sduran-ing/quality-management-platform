// Import models
const { Document, DocumentVersion, DocumentType, Process, Department, User } = require('../models');
const { Op } = require('sequelize');
const { matchedData } = require('express-validator'); 
const sequelize = require('../config/database');
const { 
  uploadFileToSupabase, 
  deleteFileFromSupabase, 
  getSignedDownloadUrl 
} = require('../utils/supabaseUtils');
const achievementService = require('../services/achievementService');   // For using the achievements logic

// ============================================
// HELPER: GENERATE DOCUMENT CODE
// ============================================

/**
 * Generate unique document code: [PROCESS]-[TYPE]-[###]
 * Example: ITEN-PROC-001
 */
const generateDocumentCode = async (companyId, processAcronym, typeAcronym) => {
  // Find the highest number for this process-type combination
  const existingDocs = await Document.findAll({
    where: {
      company_id: companyId
    },
    attributes: ['code'],
    raw: true
  });

  // Filter codes that match the pattern
  const prefix = `${processAcronym}-${typeAcronym}-`;
  const matchingCodes = existingDocs
    .map(doc => doc.code)
    .filter(code => code.startsWith(prefix));

  // Extract numbers and find max
  let maxNumber = 0;
  matchingCodes.forEach(code => {
    const numberPart = code.split('-')[2]; // Get the ### part
    const number = parseInt(numberPart, 10);
    if (number > maxNumber) {
      maxNumber = number;
    }
  });

  // Generate new code with next number
  const nextNumber = maxNumber + 1;
  const paddedNumber = String(nextNumber).padStart(3, '0'); // 001, 002, etc.
  const newCode = `${prefix}${paddedNumber}`;

  return newCode;
};

// ============================================
// HELPER: TRANSFORMS VERSION TO CAMELCASE (FRONTEND)
// ============================================

/**
 * Converts snake_case fields to camelCase to match frontend interface
 * 
 * @param {Object} versionData - Version data from database (snake_case)
 * @param {Object} documentData - Document data (for reference fields)
 * @returns {Object} Transformed version (camelCase)
 */
const transformVersion = (versionData, documentData) => {
  if (!versionData) return null;

  return {
    versionId: versionData.id,
    versionNumber: versionData.version_number,
    status: versionData.status,
    fileName: versionData.file_name,
    fileSize: versionData.file_size,
    approvedAt: versionData.approved_at,
    createdAt: versionData.created_at,
    changeNotes: versionData.change_notes,

    // Document reference fields (passed as parameter)
    documentId: documentData.id,
    code: documentData.code,
    name: documentData.name,
    isCurrentVersion: documentData.current_version_id === versionData.id,

    // Related data (already in correct format from includes)
    documentType: documentData.documentType,
    process: documentData.process,
    department: documentData.department,
    createdBy: versionData.creator,
    approvedBy: versionData.approver,
    assignedApprover: versionData.assignedApprover
  };
};

// ============================================
// CREATE DOCUMENT WITH FILE UPLOAD
// ============================================

/**
 * Create a new document with file upload
 * POST /api/documents
 * Body (multipart/form-data): 
 *   - file (file upload)
 *   - name (string)
 *   - document_type_id (integer)
 *   - process_id (integer)
 *   - department_id (integer)
 *   - change_notes (string, optional)
 *   - assigned_approver_id (integer)
 */
const createDocument = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { name, document_type_id, process_id, department_id, change_notes, assigned_approver_id } = req.body;

    // Validation - check if file was uploaded
    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'File upload is required'
      });
    }

    // Validation - check required fields
    if (!name || !document_type_id || !process_id || !department_id || !assigned_approver_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Name, document type, process, and department, and assigned approver are required'
      });
    }

    /**
     * VALIDATE ASSIGNED APPROVER
     * 
     * Approver must be Quality Manager or Process Owner
     */
    const assignedApprover = await User.findOne({
      where: {
        id: assigned_approver_id,
        company_id: req.user.companyId,
        role: ['quality_manager', 'process_owner'],
        is_active: true  // The user has to be active
      }
    });

    if (!assignedApprover) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid assigned approver. Approver must be a Quality Manager or Process Owner.'
      });
    }

    // Verify document type exists and belongs to company
    const documentType = await DocumentType.findOne({
      where: {
        id: document_type_id,
        company_id: req.user.companyId
      }
    });

    if (!documentType) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Document type not found'
      });
    }

    // Verify process exists and belongs to company
    const process = await Process.findOne({
      where: {
        id: process_id,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!process) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }

    // Verify department exists and belongs to company
    const department = await Department.findOne({
      where: {
        id: department_id,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!department) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Generate unique document code
    const documentCode = await generateDocumentCode(
      req.user.companyId,
      process.acronym,
      documentType.acronym
    );

    // Upload file to Supabase
    const storagePath = await uploadFileToSupabase(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `company-${req.user.companyId}`  // Folder structure: company-1/documents/...
    );

    // Create document record
    const document = await Document.create({
      company_id: req.user.companyId,
      code: documentCode,
      name: name.trim(),
      document_type_id,
      process_id,
      department_id,
      created_by: req.user.id
    }, { transaction });

    // Create first version (1.0)
    const documentVersion = await DocumentVersion.create({
      document_id: document.id,
      version_number: '1.0',
      file_url: storagePath,
      file_name: req.file.originalname,
      file_size: req.file.size,
      status: 'draft',  // New documents start as draft
      created_by: req.user.id,
      assigned_approver_id,
      change_notes: change_notes || 'Initial version'
    }, { transaction });

    // Update document to point to current version
    document.current_version_id = documentVersion.id;
    await document.save({ transaction });

    // IMPORTANT: Reload before extracting data, otherwise it will have empty relations
    // 1. Reload populates all relations
    await document.reload({
      include: [
        {
          model: DocumentType,
          as: 'documentType',
          attributes: ['id', 'name', 'acronym']
        },
        {
          model: Process,
          as: 'process',
          attributes: ['id', 'name', 'acronym']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: DocumentVersion,
          as: 'currentVersion',
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'first_name', 'last_name', 'role']
            },
            {
              model: User,
              as: 'approver',
              attributes: ['id', 'first_name', 'last_name', 'role']
            },
            {
              model: User,
              as: 'assignedApprover',
              attributes: ['id', 'first_name', 'last_name', 'role']
            }
          ]
        }
      ],
      transaction
    });

    // Commit after successful reload
    await transaction.commit();

    // Track achievement AFTER commit - never inside transaction
    // Service handles its own errors so this never breaks the response
    const achievements = await achievementService.track(
      req.user.id,
      req.user.companyId,
      'document_proposal',
      documentVersion.id,
      'document_versions'
    );

    // 2. Then toJSON() extracts populated data
    // Extracts data with associations loaded
    const documentData = document.toJSON();

    // 3. Finally, build transformed response
    const responseData = {
      id: documentData.id,
      companyId: documentData.company_id,
      code: documentData.code,
      name: documentData.name,
      documentTypeId: documentData.document_type_id,
      processId: documentData.process_id,
      departmentId: documentData.department_id,
      createdBy: documentData.created_by,
      currentVersionId: documentData.current_version_id,
      createdAt: documentData.createdAt,
      updatedAt: documentData.updatedAt,

      // Relations (already in correct format from includes)
      documentType: documentData.documentType,
      process: documentData.process,
      department: documentData.department,
      creator: documentData.creator,

      // Transform current version to camelCase
      currentVersion: transformVersion(documentData.currentVersion, documentData)
    };

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      // Sends to the frontend the transformed data
      data: { document: responseData },
      achievements  // { progress: [], newlyEarned: [] }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document',
      error: error.message
    });
  }
};

/**
 * ============================================================================
 * GET ALL DOCUMENT VERSIONS
 * ============================================================================
 * 
 * Returns paginated list of document versions with filtering and search.
 * 
 * FEATURES:
 * - Pagination (10 per page)
 * - Search (code + name)
 * - Multi-status filter
 * - Default ordering
 * 
 * QUERY PARAMS:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - search: Search in code and name
 * - status: Single status or array ['draft', 'pending_approval']
 * - document_type_id: Filter by type
 * - process_id: Filter by process
 * - department_id: Filter by department
 * - created_by: Filter by creator (for "my documents")
 * - my_view: Filter by documents created or assigned to the user
 * 
 * ROUTE: GET /api/documents
 */
const getAllDocuments = async (req, res) => {
  try {

    /**
     * matchedData() returns only validated/sanitized values from the routes validations
     * This ensures we get the boolean true, not string 'true' in my_view attribute
     */
    const validatedQuery = matchedData(req, { locations: ['query'] });

    const {
      page = 1,
      limit = 10,  // Items per page (default: 10)
      search,
      status,
      process_id,
      department_id,
      document_type_id,
      created_by,
      my_view  // Query parameter that applies role filtering automatically, it uses .customSanitizer(value => {}
    } = validatedQuery;

    /**
     * PAGINATION CALCULATION
     * 
     * page=1, limit=10, offset=0  (items 1-10)
     * page=2, limit=10, offset=10 (items 11-20)
     * page=3, limit=10, offset=20 (items 21-30)
     */
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    /**
     * BUILD WHERE CLAUSE FOR DOCUMENTS
     * 
     * Filters at document level:
     * - company_id (always required)
     * - process_id (optional)
     * - department_id (optional)
     * - document_type_id (optional)
     * - search (code or name)
     */
    const documentWhere = {
      company_id: req.user.companyId
    };

    // Apply optional document filters
    if (process_id) documentWhere.process_id = process_id;
    if (department_id) documentWhere.department_id = department_id;
    if (document_type_id) documentWhere.document_type_id = document_type_id;

    /**
     * SEARCH IMPLEMENTATION
     *  
     * Case-insensitive (ILIKE in PostgreSQL)
     * Partial match (wrapping with %)  
     */
    if (search && search.trim()) {
      // Add search condition using Op.and wrapper
      if (!documentWhere[Op.and]) {
        documentWhere[Op.and] = [];
      }

      documentWhere[Op.and].push({
        [Op.or]: [
          { code: { [Op.iLike]: `%${search.trim()}%` } },
          { name: { [Op.iLike]: `%${search.trim()}%` } }
        ]
      });
    }

    /**
     * BUILD WHERE CLAUSE FOR VERSIONS
     * 
     * Filters at version level:
     * - status (single or multiple)
     * - created_by (for "pendings" view)
     */
    const versionWhere = {};

    /**
     * STATUS FILTER
     * 
     * SUPPORTS:
     * - Single: ?status=approved
     * - Multiple: ?status[]=draft&status[]=pending_approval
     * 
     * BACKEND HANDLING:
     * - If array: status IN [...]
     * - If single: status = '...'
     */
    if (status) {
      if (Array.isArray(status)) {
        // Multiple statuses: ['draft', 'pending_approval']
        versionWhere.status = { [Op.in]: status };
      } else {
        // Single status: 'approved'
        versionWhere.status = status;
      }
    }

    /**
     * MY VIEW FILTER (New!)
     * 
     * Role-based filtering for pending documents page:
     * 
     * QUALITY MANAGER:
     * - No filter (sees all documents)
     * 
     * EMPLOYEE / PROCESS OWNER:
     * - created_by = current user (documents they created)
     * - OR assigned_approver_id = current user (documents assigned to them)
     */

    // This boolean value is sent by the front as a string 'true' but the documentRoutes.js validator transforms it into a BOOLEAN
    if (my_view === true) {
      // Quality Manager sees everything, no additional filter
      if (req.user.role !== 'quality_manager') {
        // Employee and Process Owner see only their documents
        versionWhere[Op.or] = [
          { created_by: req.user.id },              // Documents I created
          { assigned_approver_id: req.user.id }     // Documents assigned to me
        ];
      }
    }

    /**
     * CREATED BY FILTER
     * 
     * USE CASE:
     * - "My Pending Documents" view
     * - Show only versions created by current user
     */
    if (created_by) {
      versionWhere.created_by = created_by;
    }

    // Count total - Used to calculate totalPages
    const totalCount = await DocumentVersion.count({
      where: versionWhere,
      include: [
        {
          model: Document,
          as: 'document',
          where: documentWhere,
          required: true
        }
      ]
    });

    /**
     * QUERY VERSIONS WITH PAGINATION
     * 
     * ORDER:
     * 1. Status priority (approved first, then pending, draft, obsolete, outdated)
     * 2. Date ordering (approved_at if approved, otherwise created_at) - newest first
     */
    const versions = await DocumentVersion.findAll({
      where: versionWhere,
      include: [
        {
          model: Document,
          as: 'document',
          where: documentWhere,
          include: [
            {
              model: DocumentType,
              as: 'documentType',
              attributes: ['id', 'name', 'acronym']
            },
            {
              model: Process,
              as: 'process',
              attributes: ['id', 'name', 'acronym']
            },
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'name']
            },
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'first_name', 'last_name', 'email', 'role']
            }
          ]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        },
        {
          model: User,
          as: 'assignedApprover',
          attributes: ['id', 'first_name', 'last_name', 'role'],
          required: false
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name', 'role'],
          required: false
        }
      ],

      // CUSTOM STATUS ORDERING FOR ALL THE VERSIONS RETRIEVED
      order: [
        // 1. Status priority (approved first)
        [sequelize.literal(`
          CASE status
            WHEN 'approved' THEN 1
            WHEN 'pending_approval' THEN 2
            WHEN 'draft' THEN 3
            WHEN 'obsolete' THEN 4
            WHEN 'outdated' THEN 5
          END
        `), 'ASC'],
        /**
         * 2. Date ordering (newest first)
         * 
         * LOGIC:
         * - If approved: Use approved_at
         * - If not approved: Use created_at
         * 
         * COALESCE returns first non-null value:
         * - approved_at (if exists)
         * - Falls back to created_at
         * 
         * Because both DocumentVersion and Document tables have a created_at
         * we have to use DocumentVersion table columns explicitly:
         * - "DocumentVersion"."approved_at"
         * - "DocumentVersion"."created_at"
         */
        [sequelize.literal('COALESCE("DocumentVersion"."approved_at", "DocumentVersion"."created_at")'), 'DESC']
      ],
      limit: limitNum,
      offset: offset
    });

    /**
     * TRANSFORM DATA FOR FRONTEND
     */
    const transformedVersions = versions.map(version => {
      const versionData = version.toJSON();
      const documentData = versionData.document;

      return {
        // Version fields
        versionId: versionData.id,
        versionNumber: versionData.version_number,
        status: versionData.status,
        fileName: versionData.file_name,
        fileSize: versionData.file_size,
        approvedAt: versionData.approved_at,
        createdAt: versionData.created_at,
        changeNotes: versionData.change_notes,

        // Document fields
        documentId: documentData.id,
        code: documentData.code,
        name: documentData.name,
        isCurrentVersion: documentData.current_version_id === versionData.id,

        // Related data
        documentType: documentData.documentType,
        process: documentData.process,
        department: documentData.department,
        createdBy: versionData.creator,
        approvedBy: versionData.approver,
        assignedApprover: versionData.assignedApprover
      };
    });

    /**
     * CALCULATE PAGINATION METADATA
     */
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasMore = pageNum < totalPages;

    /**
     * RESPONSE
     */
    res.status(200).json({
      success: true,
      message: 'Document versions retrieved successfully',
      data: {
        versions: transformedVersions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: totalPages,
          hasMore: hasMore
        }
      }
    });

  } catch (error) {
    console.error('Get document versions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document versions',
      error: error.message
    });
  }
};

// ============================================
// GET SINGLE DOCUMENT
// ============================================

/**
 * Get a single document by ID with all versions
 * GET /api/documents/:id
 */
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findOne({
      where: {
        id,
        company_id: req.user.companyId
      },
      include: [
        {
          model: DocumentType,
          as: 'documentType',
          attributes: ['id', 'name', 'acronym']
        },
        {
          model: Process,
          as: 'process',
          attributes: ['id', 'name', 'acronym']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        },
        {
          model: DocumentVersion,
          as: 'currentVersion',
          attributes: [
            'id',
            'version_number',
            'file_name',
            'file_size',
            'status',
            'created_at',
            'approved_at',
            'change_notes',
            'created_by',
            'approved_by',
            'assigned_approver_id'
          ],
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'first_name', 'last_name', 'role']
            },
            {
              model: User,
              as: 'approver',
              attributes: ['id', 'first_name', 'last_name', 'role']
            },
            {
              model: User,
              as: 'assignedApprover',
              attributes: ['id', 'first_name', 'last_name', 'email']
            }
          ]
        },
        {
          model: DocumentVersion,
          as: 'versions',
          attributes: [
            'id',
            'version_number',
            'file_name',
            'file_size',
            'status',
            'created_at',
            'change_notes',
            'approved_at',
            'created_by',
            'approved_by',
            'assigned_approver_id'
          ],
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'first_name', 'last_name', 'role']
            },
            {
              model: User,
              as: 'approver',
              attributes: ['id', 'first_name', 'last_name', 'role']
            },
            {
              model: User,
              as: 'assignedApprover',
              attributes: ['id', 'first_name', 'last_name', 'email']
            }
          ]
        }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Transform data for frontend
    const documentData = document.toJSON();

    // Transform current version
    const transformedCurrentVersion = documentData.currentVersion
      ? transformVersion(documentData.currentVersion, documentData)
      : null;

    // Transform all versions array
    const transformedVersions = documentData.versions
      ? documentData.versions.map(v => transformVersion(v, documentData))
      : [];

    // Build response with transformed data
    const responseData = {
      // Document fields HAS TO MATCH frontend interface
      id: documentData.id,
      companyId: documentData.company_id,
      code: documentData.code,
      name: documentData.name,
      documentTypeId: documentData.document_type_id,
      processId: documentData.process_id,
      departmentId: documentData.department_id,
      createdBy: documentData.created_by,
      currentVersionId: documentData.current_version_id,
      createdAt: documentData.created_at,
      updatedAt: documentData.updated_at,

      // Relations (already in camelCase from includes)
      documentType: documentData.documentType,
      process: documentData.process,
      department: documentData.department,
      creator: documentData.creator,

      // Transformed versions (camelCase)
      currentVersion: transformedCurrentVersion,
      versions: transformedVersions
    };

    res.status(200).json({
      success: true,
      message: 'Document retrieved successfully',
      data: {
        document: responseData
      }
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document',
      error: error.message
    });
  }
};

// ============================================
// DOWNLOAD DOCUMENT (Generate Signed URL)
// ============================================

/**
 * Get a pre-signed URL to download a specific document version
 * GET /api/documents/:id/versions/:versionId/download
 */
const downloadDocument = async (req, res) => {
  try {
    const { id, versionId } = req.params;

    // Find document version
    const version = await DocumentVersion.findOne({
      where: { id: versionId },
      include: [
        {
          model: Document,
          as: 'document',
          where: {
            id,
            company_id: req.user.companyId
          }
        }
      ]
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Document version not found'
      });
    }

    // Generate signed URL (expires in 1 hour)
    const downloadUrl = await getSignedDownloadUrl(version.file_url, 3600);

    res.status(200).json({
      success: true,
      message: 'Download URL generated successfully',
      data: {
        downloadUrl,
        fileName: version.file_name,
        expiresIn: 3600 // seconds
      }
    });

  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate download URL',
      error: error.message
    });
  }
};

// ============================================
// SUBMIT DOCUMENT VERSION FOR APPROVAL
// ============================================

/**
 * Submit document version for approval (draft → pending_approval)
 * Each document can only have ONE draft at a time
 * PUT /api/documents/:id/submit-approval
 * Any user can create a draft and submit it for approval
 */
const submitForApproval = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find document
    const document = await Document.findOne({
      where: {
        id,
        company_id: req.user.companyId
      }
    });

    // 2. Validate document exists  
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // 3. Find the DRAFT version for this document
    // Only ONE draft version should exist per document
    const draftVersion = await DocumentVersion.findOne({
      where: {
        document_id: id,
        status: 'draft'
      },
      order: [['created_at', 'DESC']]  // Latest draft if multiple exist
    });

    // 4. Validate draft version exists  
    if (!draftVersion) {
      return res.status(400).json({
        success: false,
        message: 'No draft version found for this document. Create a draft version first.'
      });
    }

    /**
     * 5. Check AUTHORIZATION
     * 
     * - Quality Manager: Can submit for approval any draft
     * - Creator of version: Can submit for approval their own draft
     */
    const isCreator = draftVersion.created_by === req.user.id;
    const isQualityManager = req.user.role === 'quality_manager';

    if (!isCreator && !isQualityManager) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only the version creator or Quality Manager can submit for approval.'
      });
    }

    /**
     * 6. Update version status
     * 
     * STATE CHANGE:
     * - draft → pending_approval
     */
    draftVersion.status = 'pending_approval';
    await draftVersion.save();

    // 7. Reload document with associations for response
    await document.reload({
      include: [
        { model: DocumentType, as: 'documentType', attributes: ['id', 'name', 'acronym'] },
        { model: Process, as: 'process', attributes: ['id', 'name', 'acronym'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: DocumentVersion, as: 'currentVersion' }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Version ${draftVersion.version_number} submitted for approval`,
      data: {
        document,
        submittedVersion: {
          id: draftVersion.id,
          versionNumber: draftVersion.version_number,
          status: draftVersion.status
        }
      }
    });

  } catch (error) {
    console.error('Submit for approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit document for approval',
      error: error.message
    });
  }
};

// ============================================
// APPROVE DOCUMENT
// ============================================

/**
 * Approve document (pending_approval → approved)
 * Each document can only have ONE pending_approval at a time
 * PUT /api/documents/:id/approve
 * ONLY Assigned approver OR Quality Manager can approve
 */
const approveDocument = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    // 1. Find document
    const document = await Document.findOne({
      where: {
        id,
        company_id: req.user.companyId
      }
    });

    if (!document) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // 2. Find the PENDING version for this document
    // Only ONE pending version should exist per document     
    const pendingVersion = await DocumentVersion.findOne({
      where: {
        document_id: id,
        status: 'pending_approval'
      },
      include: [
        {
          model: User,
          as: 'assignedApprover',
          attributes: ['id', 'first_name', 'last_name', 'role']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // 4. Validate pending version exists
    if (!pendingVersion) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'No pending version found for this document. Submit a version for approval first.'
      });
    }

    /**
     * CHECK AUTHORIZATION
     * 
     * - QM has universal approval authority
     * - Process Owners can only approve if assigned
     * - Employees cannot approve
     */
    const isQualityManager = req.user.role === 'quality_manager';
    const isAssignedApprover = pendingVersion.assigned_approver_id === req.user.id;

    if (!isQualityManager && !isAssignedApprover) {
      await transaction.rollback();

      // Helpful error message
      let message = 'You are not authorized to approve this document. ';

      if (pendingVersion.assignedApprover) {
        message += `This version is assigned to ${pendingVersion.assignedApprover.first_name} ${pendingVersion.assignedApprover.last_name} for approval.`;
      } else {
        message += 'No approver is assigned to this version.';
      }

      return res.status(403).json({
        success: false,
        message
      });
    }

    /**
     * 5. Find and update OLD approved version
     * 
     * IMPORTANT:
     * - The current approved version (current_version_id) becomes outdated
     * - This happens BEFORE approving new version
     * - Because only ONE version can be 'approved' at a time
     */
    if (document.current_version_id) {
      // Retreive the OLD approved version and start a transaction
      const oldApprovedVersion = await DocumentVersion.findByPk(
        document.current_version_id,
        { transaction }
      );

      // If the OLD version is found and its status is approved, changed to outdated
      if (oldApprovedVersion && oldApprovedVersion.status === 'approved') {
        oldApprovedVersion.status = 'outdated';
        await oldApprovedVersion.save({ transaction });
      }
    }

    // 6. Approve the pending version
    pendingVersion.status = 'approved';  // status: pending_approval → approved
    pendingVersion.approved_by = req.user.id;  // approved_by: Set to current user
    pendingVersion.approved_at = new Date();  // approved_at: Set to current timestamp
    await pendingVersion.save({ transaction });

    /**
     * 7. Update document.current_version_id     * 
     * - This is when current_version_id changes
     * - Now points to newly approved version
     */
    document.current_version_id = pendingVersion.id;
    await document.save({ transaction });

    // 8. Reload document with full associations
    await document.reload({
      include: [
        { model: DocumentType, as: 'documentType', attributes: ['id', 'name', 'acronym'] },
        { model: Process, as: 'process', attributes: ['id', 'name', 'acronym'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        {
          // This will bring the info of the recently approved version
          model: DocumentVersion,
          as: 'currentVersion',
          include: [
            { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name'] }
          ]
        }
      ],
      transaction
    });
    
    // Commit after successful reload
    await transaction.commit();

    // Determine activity type based on version number:
    // '1.0' = first ever approval = document_approved
    // anything else = new version approval = document_updated
    const activityType = pendingVersion.version_number === '1.0'
      ? 'document_approved'
      : 'document_updated';

    const achievements = await achievementService.track(
      req.user.id,
      req.user.companyId,
      activityType,
      pendingVersion.id,
      'document'
    );

    res.status(200).json({
      success: true,
      message: `Version ${pendingVersion.version_number} approved successfully`,
      data: { document },
      achievements  // { progress: [], newlyEarned: [] }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Approve document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve document',
      error: error.message
    });
  }
};

/**
 * ============================================================================
 * REJECT DOCUMENT (Back to draft)
 * ============================================================================
 * 
 * - Rejects a pending version, returning it to draft status
 * - Find the ONE pending_approval version for this document
 * - ONLY Quality Manager or Process Owner can reject
 * 
 * ROUTE: PUT /api/documents/:id/reject
 */
const rejectDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    // 1. Find document
    const document = await Document.findOne({
      where: {
        id,
        company_id: req.user.companyId
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    //2. Check authorization - ONLY Quality Manager or Process Owner can reject
    if (req.user.role === 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager or Process Owner can reject documents'
      });
    }

    // 3. Find the PENDING version for this document
    const pendingVersion = await DocumentVersion.findOne({
      where: {
        document_id: id,
        status: 'pending_approval'
      },
      include: [
        {
          model: User,
          as: 'assignedApprover',
          attributes: ['id', 'first_name', 'last_name', 'role']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // 4. Validate pending version exists
    if (!pendingVersion) {
      return res.status(400).json({
        success: false,
        message: 'No pending version found for this document. Only pending versions can be rejected.'
      });
    }

    /**
     * CHECK AUTHORIZATION
     * 
     * - QM can reject anything
     * - Process Owners can only reject if assigned
     * - Employees cannot reject
     */
    const isQualityManager = req.user.role === 'quality_manager';
    const isAssignedApprover = pendingVersion.assigned_approver_id === req.user.id;

    if (!isQualityManager && !isAssignedApprover) {
      await transaction.rollback();

      // Helpful error message
      let message = 'You are not authorized to reject this document. ';

      if (pendingVersion.assignedApprover) {
        message += `This version is assigned to ${pendingVersion.assignedApprover.first_name} ${pendingVersion.assignedApprover.last_name} for approval.`;
      } else {
        message += 'No approver is assigned to this version.';
      }

      return res.status(403).json({
        success: false,
        message
      });
    }

    /**
     * 5. Reject version (back to draft)
     * 
     * - status: pending_approval → draft
     * - change_notes: Append rejection reason
     */
    pendingVersion.status = 'draft';

    // Append rejection reason to change notes
    const rejectionNote = `\n\n[REJECTED by ${req.user.first_name} ${req.user.last_name} on ${new Date().toISOString()}]\nReason: ${rejection_reason || 'No reason provided'}`;
    pendingVersion.change_notes = (pendingVersion.change_notes || '') + rejectionNote;

    await pendingVersion.save();

    // 6. Reload document with associations
    await document.reload({
      include: [
        { model: DocumentType, as: 'documentType', attributes: ['id', 'name', 'acronym'] },
        { model: Process, as: 'process', attributes: ['id', 'name', 'acronym'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: DocumentVersion, as: 'currentVersion' }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Version ${pendingVersion.version_number} rejected and returned to draft`,
      data: {
        document,
        rejectedVersion: {
          id: pendingVersion.id,
          versionNumber: pendingVersion.version_number,
          status: pendingVersion.status
        }
      }
    });

  } catch (error) {
    console.error('Reject document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject document',
      error: error.message
    });
  }
};

/**
 * ============================================================================
 * CREATE NEW VERSION
 * ============================================================================
 * 
 * Creates a new draft version of an existing document.
 * 
 * - Only approved documents can have new versions
 * - Check that current_version_id points to approved version
 * 
 * IMPORTANT:
 * - current_version_id changes ONLY when new version is APPROVED
 * - Old approved becomes outdated ONLY when new version is APPROVED
 * 
 * ROUTE: POST /api/documents/:id/versions
 */
const createNewVersion = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { change_notes, assigned_approver_id } = req.body;

    // 1. Validate file upload
    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'File upload is required'
      });
    }

    // Validate assigned approver provided
    if (!assigned_approver_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Assigned approver is required'
      });
    }

    // 2. Find document with current version
    const document = await Document.findOne({
      where: {
        id,
        company_id: req.user.companyId
      },
      include: [
        {
          model: DocumentVersion,
          as: 'currentVersion'
        }
      ]
    });

    if (!document) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    /**
     * 3. Validate current version is APPROVED
     * 
     * current_version_id must point to an approved version
     */
    if (!document.currentVersion) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Document has no current version.'
      });
    }

    // Cannot create new version if current is draft/pending
    if (document.currentVersion.status !== 'approved') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot create new version. Current version (${document.currentVersion.version_number}) is ${document.currentVersion.status}. Only approved versions can have new versions created.`
      });
    }

    /**
     * STEP 4: Check for existing draft or pending version
     * 
     * - Only ONE draft OR pending version allowed at a time
     * - Cannot create new version if one already in progress     * 
     */
    const draftOrPendingVersion = await DocumentVersion.findOne({
      where: {
        document_id: id,
        status: ['draft', 'pending_approval']
      },
      transaction
    });

    if (draftOrPendingVersion) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot create new version. Version ${draftOrPendingVersion.version_number} is already ${draftOrPendingVersion.status}. Complete or discard it first.`
      });
    }

    /**
     * VALIDATE ASSIGNED APPROVER
     * 
     * Approver must be Quality Manager or Process Owner
     */
    const assignedApprover = await User.findOne({
      where: {
        id: assigned_approver_id,
        company_id: req.user.companyId,
        role: ['quality_manager', 'process_owner'],
        is_active: true  // The user has to be active
      },
      transaction
    });

    if (!assignedApprover) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid assigned approver. Approver must be a Quality Manager or Process Owner.'
      });
    }

    // 5. Find latest version number
    // Separate query for latest version
    const latestVersion = await DocumentVersion.findOne({
      where: {
        document_id: id
      },
      order: [['version_number', 'DESC']],
      transaction
    });

    if (!latestVersion) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'No versions found for this document.'
      });
    }

    /// Calculate next version number
    const currentVersionNum = parseFloat(latestVersion.version_number);  // Parse current version as float
    const nextVersionNum = (Math.floor(currentVersionNum) + 1.0).toFixed(1);  // Round down to integer and add 1.0

    console.log(`Current approved version: ${latestVersion.version_number}, New proposed version: ${nextVersionNum}`);

    /**
     * 6. Upload file to Supabase Storage
     * 
     * STORAGE PATH:
     * - company-{company_id}/{document_code}-v{version}.{ext}
     * - Example: company-1/HROB-PROC-001-v3.0.pdf
     */
    const storagePath = await uploadFileToSupabase(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `company-${req.user.companyId}`  // Folder: company-1, company-2, etc.
    );

    /**
     * 7. Create new DRAFT version
     * 
     * - Not the current version yet
     * - Becomes current when APPROVED
     */
    const newVersion = await DocumentVersion.create({
      document_id: document.id,
      version_number: nextVersionNum,
      file_url: storagePath,  // Store Supabase path
      file_name: req.file.originalname,
      file_size: req.file.size,
      status: 'draft',  // Al new versions start as drafts
      created_by: req.user.id,
      assigned_approver_id: assigned_approver_id,
      change_notes: change_notes || `Version ${nextVersionNum} - Initial draft`
    }, { transaction });

    // 10. Reload new version with associations
    await newVersion.reload({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: User,
          as: 'assignedApprover',
          attributes: ['id', 'first_name', 'last_name', 'role']
        }
      ],
      transaction
    });

    // 11. Reload document with associations
    await document.reload({
      include: [
        { model: DocumentType, as: 'documentType', attributes: ['id', 'name', 'acronym'] },
        { model: Process, as: 'process', attributes: ['id', 'name', 'acronym'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
        {
          model: DocumentVersion,
          as: 'currentVersion',
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'first_name', 'last_name']
            },
            {
              model: User,
              as: 'approver',
              attributes: ['id', 'first_name', 'last_name']
            },
            {
              model: User,
              as: 'assignedApprover',
              attributes: ['id', 'first_name', 'last_name', 'role']
            }
          ]
        }
      ],
      transaction
    });

    // Commit after successful reload
    await transaction.commit();

    // Track achievement AFTER commit - never inside transaction
    // Service handles its own errors so this never breaks the response
    const achievements = await achievementService.track(
      req.user.id,
      req.user.companyId,
      'document_proposal',
      newVersion.id,
      'document_versions'
    );

    // Transform to camelCase
    const newVersionData = newVersion.toJSON();
    const documentData = document.toJSON();

    res.status(201).json({
      success: true,
      message: `New version ${newVersion.version_number} created successfully as draft`,
      data: {
        document: {
          id: documentData.id,
          companyId: documentData.company_id,
          code: documentData.code,
          name: documentData.name,
          documentTypeId: documentData.document_type_id,
          processId: documentData.process_id,
          departmentId: documentData.department_id,
          createdBy: documentData.created_by,
          currentVersionId: documentData.current_version_id,
          createdAt: documentData.createdAt,
          updatedAt: documentData.updatedAt,

          // Relations (already in correct format from includes)
          documentType: documentData.documentType,
          process: documentData.process,
          department: documentData.department,
          creator: documentData.creator,

          // Transform current version to camelCase
          currentVersion: transformVersion(documentData.currentVersion, documentData)
        },
        newVersion: transformVersion(newVersionData, documentData)
      },
      achievements  // { progress: [], newlyEarned: [] }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create new version error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create new version',
      error: error.message
    });
  }
};

// ============================================
// MAKE DOCUMENT OBSOLETE
// ============================================

/**
 * Marks the current approved version as obsolete and prevents new versions
 * PUT /api/documents/:id/obsolete
 * Only Quality Manager can mark as obsolete
 */
const makeObsolete = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    // 1. Find document with current version
    const document = await Document.findOne({
      where: {
        id,
        company_id: req.user.companyId
      },
      include: [
        {
          model: DocumentVersion,
          as: 'currentVersion'
        }
      ]
    });

    // 2. Validate current version exists and is approved
    if (!document.currentVersion) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Document has no current version. Cannot mark as obsolete.'
      });
    }

    if (document.currentVersion.status !== 'approved') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot mark as obsolete. Current version is ${document.currentVersion.status}. Only approved versions can be marked obsolete.`
      });
    }

    /**
     * 3. Find and DELETE all draft versions
     * 
     * - Draft versions will never be approved
     * - Clean up incomplete work
     */
    const deletedDrafts = await DocumentVersion.destroy({
      where: {
        document_id: id,
        status: 'draft'
      },
      transaction
    });

    /**
     * 4. Find and DELETE all pending_approval versions
     *
     * - If document is obsolete, pending versions won't be approved
     * - Clean up incomplete work
     */
    const deletedPending = await DocumentVersion.destroy({
      where: {
        document_id: id,
        status: 'pending_approval'
      },
      transaction
    });

    // 5. Mark current approved version as OBSOLETE
    const currentVersion = await DocumentVersion.findByPk(
      document.current_version_id,
      { transaction }
    );

    if (currentVersion) {
      currentVersion.status = 'obsolete';
      await currentVersion.save({ transaction });
    }

    // 6. Reload document with associations
    await document.reload({
      include: [
        { model: DocumentType, as: 'documentType', attributes: ['id', 'name', 'acronym'] },
        { model: Process, as: 'process', attributes: ['id', 'name', 'acronym'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: DocumentVersion, as: 'currentVersion' }
      ],
      transaction
    });

    // Commit after successful reload
    await transaction.commit();

    // Track achievement AFTER commit - never inside transaction
    // Service handles its own errors so this never breaks the response
    const achievements = await achievementService.track(
      req.user.id,
      req.user.companyId,
      'document_obsoleted',
      currentVersion.id,
      'document_versions'
    );

    // 7. Inform user
    let message = `Document version ${currentVersion.version_number} marked as obsolete`;

    if (deletedDrafts > 0 || deletedPending > 0) {
      const deletedVersions = [];
      if (deletedDrafts > 0) deletedVersions.push(`${deletedDrafts} draft version(s)`);
      if (deletedPending > 0) deletedVersions.push(`${deletedPending} pending version(s)`);
      message += `. Deleted ${deletedVersions.join(' and ')}.`;
    }

    res.status(200).json({
      success: true,
      message,
      data: {
        document,
        deletedDrafts,
        deletedPending
      },
      achievements  // { progress: [], newlyEarned: [] }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Make obsolete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark document as obsolete',
      error: error.message
    });
  }
};

/**
 * ============================================================================
 * DELETE DRAFT VERSION
 * ============================================================================
 * 
 * Deletes a draft version of a document
 * Only the creator or QM can delete their own draft
 * 
 * ROUTE: DELETE /api/documents/:documentId/versions/:versionId
 */
const deleteDraftVersion = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id, versionId } = req.params;

    // 1. Find the version that is going to be deleted
    const version = await DocumentVersion.findOne({
      where: {
        id: versionId,
        document_id: id
      },
      include: [
        {
          model: Document,
          as: 'document',
          where: {
            company_id: req.user.companyId
          }
        }
      ]
    });

    // 2. Validate version exists
    if (!version) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Version not found or does not belong to this document'
      });
    }

    // 3. Validate version is DRAFT
    if (version.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot delete ${version.status} version. Only draft versions can be deleted.`
      });
    }

    /**
     * 4. Check AUTHORIZATION
     * 
     * - Quality Manager: Can delete any draft
     * - Creator of version: Can delete their own draft
     */
    const isCreator = version.created_by === req.user.id;
    const isQualityManager = req.user.role === 'quality_manager';

    if (!isCreator && !isQualityManager) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only the version creator or Quality Manager can delete draft versions'
      });
    }

    /**
     * 5. Check if this is the ONLY version
     * 
     * If count = 1, document never had an approved version
     */
    const versionCount = await DocumentVersion.count({
      where: {
        document_id: id
      },
      transaction
    });

    /**
     * 6. Handle ONLY VERSION of the document case
     * 
     * - If only 1 version exists
     * - DELETE ENTIRE DOCUMENT
     * 
     * CASCADING:
     * - Deleting document will cascade delete the version
     * - Foreign key constraints handle cleanup
     */
    if (versionCount === 1) {
      // Store document info before deletion (for response message)
      const documentCode = version.document.code;
      const documentName = version.document.name;
      const versionNumber = version.version_number;
      const fileName = version.file_name;

      // Delete the ENTIRE DOCUMENT
      await Document.destroy({
        where: {
          id: id
        },
        transaction
      });

      await transaction.commit();

      // Delete file from supabase    
      try {
        await deleteFileFromSupabase(version.file_url);
        console.log('Draft file deleted successfully');
      } catch (error) {
        console.warn('Failed to delete old file from Supabase:', error);
        // Continue anyway - old file cleanup can happen later
      }

      // Response: Document and version deleted
      return res.status(200).json({
        success: true,
        message: `Document "${documentName}" (${documentCode}) and its only draft version deleted.`,
        data: {
          deletedDocument: {
            code: documentCode,
            name: documentName
          },
          deletedVersion: {
            id: version.id,
            versionNumber: versionNumber,
            fileName: fileName
          }
        }
      });
    }

    /**
     * STEP 7: Normal case - Delete VERSION only
     * 
     * - This draft is not the only version
     * - Safe to delete just the version
     */
    const versionNumber = version.version_number;
    const fileName = version.file_name;

    await version.destroy({ transaction });

    await transaction.commit();

    // Delete file from supabase    
    try {
      await deleteFileFromSupabase(version.file_url);
      console.log('Draft file deleted successfully');
    } catch (error) {
      console.warn('Failed to delete old file from Supabase:', error);
      // Continue anyway - old file cleanup can happen later
    }

    // Response: Version deleted
    return res.status(200).json({
      success: true,
      message: `Draft version ${versionNumber} deleted successfully`,
      data: {
        deletedVersion: {
          id: versionId,
          versionNumber: versionNumber,
          fileName: fileName
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Delete draft version error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete draft version',
      error: error.message
    });
  }
};

// ============================================
// UPDATE DOCUMENT METADATA
// ============================================

/**
 * Update document metadata and version fields
 * PUT /api/documents/:id/versions/:versionId
 * 
 * PERMISSIONS FOR DOCUMENT FIELDS (name, department_id, process_id, document_type_id):
 * - Quality Manager: Can edit approved versions
 * - Creator: Can edit draft v1.0 only (not v2.0+)
 * 
 * PERMISSIONS FOR VERSION FIELDS (assigned_approver_id, change_notes):
 * - Quality Manager: Can edit approved versions
 * - Creator: Can edit ANY draft version (v1.0, v2.0, v3.0, etc.)
 */
const updateDocument = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id, versionId } = req.params;
    const {
      // Document fields
      name,
      department_id,
      process_id,
      document_type_id,
      // Version fields
      assigned_approver_id,
      change_notes
    } = req.body;

    // Find document with current version
    const document = await Document.findOne({
      where: {
        id,
        company_id: req.user.companyId
      },
      include: [
        {
          model: Process,
          as: 'process',
          attributes: ['acronym']
        },
        {
          model: DocumentType,
          as: 'documentType',
          attributes: ['acronym']
        }
      ]
    });

    if (!document) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Find the specific version being edited
    const version = await DocumentVersion.findOne({
      where: {
        id: versionId,
        document_id: id
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: User,
          as: 'assignedApprover',
          attributes: ['id', 'first_name', 'last_name', 'role']
        }
      ]
    });

    if (!version) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    // Permission checks
    const isQM = req.user.role === 'quality_manager';
    const isCreator = version.created_by === req.user.id;
    const isApproved = version.status === 'approved';
    const isDraft = version.status === 'draft';
    const isFirstVersion = version.version_number === '1.0';

    /**
     * AUTHORIZATION LOGIC:
     * 
     * QM editing approved document (scenario 1)
     * Creator editing draft v1.0 (scenario 2)
     * Reject any other scenario
     */
    // ============================================
    // CHECK IF TRYING TO UPDATE DOCUMENT FIELDS
    // ============================================    
    const updatingDocumentFields = name || department_id || process_id || document_type_id;

    if (updatingDocumentFields) {
      /**
       * PERMISSION CHECK FOR DOCUMENT METADATA
       * 
       * Only allow if:
       * - QM editing approved document (scenario 1)
       * - Creator editing draft v1.0 (scenario 2)
       */
      const canEditDocumentMetadata =
        (isQM && isApproved) ||
        (isCreator && isDraft && isFirstVersion);

      if (!canEditDocumentMetadata) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Not authorized to edit document metadata. ' +
            (isDraft && !isFirstVersion
              ? 'You can only edit assigned approver, change notes, and file for version 2.0 and above.'
              : 'Only Quality Managers can edit approved documents.')
        });
      }
    }

    // ============================================
    // CHECK IF TRYING TO UPDATE VERSION FIELDS
    // ============================================

    const updatingVersionFields = assigned_approver_id || change_notes;

    if (updatingVersionFields) {
      /**
       * PERMISSION CHECK FOR VERSION FIELDS
       * 
       * Can update for ANY draft version
       * - Creator can update their own draft (any version)
       * - QM can update approved versions
       */
      const canEditVersionFields =
        (isCreator && isDraft) ||
        (isQM && isApproved);

      if (!canEditVersionFields) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Not authorized to edit version fields. ' +
            (version.status === 'pending_approval'
              ? 'Cannot edit versions pending approval.'
              : 'Only the creator can edit draft versions, and only Quality Managers can edit approved versions.')
        });
      }
    }

    // Track if code needs regeneration
    let needsNewCode = false;
    let newProcess = null;
    let newDocumentType = null;

    // Update process if provided
    if (process_id && process_id !== document.process_id) {
      // Verify new process exists
      newProcess = await Process.findOne({
        where: {
          id: process_id,
          company_id: req.user.companyId,
          is_active: true
        }
      });

      if (!newProcess) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Process not found'
        });
      }

      // Process change requires new document code
      needsNewCode = true;
      document.process_id = process_id;
    }

    // Update document type if provided
    if (document_type_id && document_type_id !== document.document_type_id) {
      // Verify new document type exists
      newDocumentType = await DocumentType.findOne({
        where: {
          id: document_type_id,
          company_id: req.user.companyId
        }
      });

      if (!newDocumentType) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Document type not found'
        });
      }

      // Document type change requires new code
      needsNewCode = true;
      document.document_type_id = document_type_id;
    }

    // Update department if provided
    if (department_id && departmentId !== document.department_id) {
      // Verify new department exists
      const newDepartment = await Department.findOne({
        where: {
          id: department_id,
          company_id: req.user.companyId,
          is_active: true
        }
      });

      if (!newDepartment) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }

      document.department_id = department_id;
    }

    // Update name if provided
    if (name && name.trim() !== document.name) {
      document.name = name.trim();
    }

    // ============================================
    // REGENERATE CODE IF PROCESS OR TYPE CHANGED
    // ============================================
    // Get the acronyms (use new ones if changed, otherwise existing)
    // This validation is neccessary because newProcess and newDocumentType will be EMPTY if the process or document type stay the same
    // Hence, this structure won't work: 
    //    const newCode = await generateDocumentCode(
    //       req.user.companyId,
    //       newProcess.acronym,  // It will be emtpy if user didn't change it = error
    //       newDocumentType.acronym   // It will have value if user changed the document type
    //    );
    if (needsNewCode) {
      const processAcronym = newProcess
        ? newProcess.acronym
        : document.process.acronym;

      const documentTypeAcronym = newDocumentType
        ? newDocumentType.acronym
        : document.documentType.acronym;

      const newCode = await generateDocumentCode(
        req.user.companyId,
        // This way, we guarantee the acronyms are not empty
        processAcronym,
        documentTypeAcronym
      );

      // Store old code in case we need to revert
      const oldCode = document.code;

      document.code = newCode;
      document.code_edited_by = req.user.id;
      document.code_edited_at = new Date();

      console.log(`Document code changed from ${oldCode} to ${newCode}`);
    }

    // Save changes to document metadata
    await document.save({ transaction });

    // ============================================
    // UPDATE VERSION FIELDS
    // ============================================

    /**
     * Update assigned approver and/or change notes
     * These are stored in DocumentVersion table
     */
    let versionUpdated = false;

    if (assigned_approver_id && assigned_approver_id !== version.assigned_approver_id) {
      // Verify new approver exists and has permission to approve
      const newApprover = await User.findOne({
        where: {
          id: assigned_approver_id,
          company_id: req.user.companyId,
          role: ['quality_manager', 'process_owner']
        }
      });

      if (!newApprover) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Assigned approver not found or does not have approval permissions'
        });
      }

      version.assigned_approver_id = assigned_approver_id;
      versionUpdated = true;
    }

    if (change_notes && change_notes.trim() !== version.change_notes) {
      version.change_notes = change_notes.trim();
      versionUpdated = true;
    }

    // Save version changes if any
    if (versionUpdated) {
      await version.save({ transaction });
    }

    // Save changes to document version data
    await transaction.commit();

    // Reload the edited document with associations
    await document.reload({
      include: [
        { model: DocumentType, as: 'documentType', attributes: ['id', 'name', 'acronym'] },
        { model: Process, as: 'process', attributes: ['id', 'name', 'acronym'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'codeEditor', attributes: ['id', 'first_name', 'last_name'] },
        {
          model: DocumentVersion,
          as: 'currentVersion',
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'first_name', 'last_name']
            },
            {
              model: User,
              as: 'approver',
              attributes: ['id', 'first_name', 'last_name']
            },
            {
              model: User,
              as: 'assignedApprover',
              attributes: ['id', 'first_name', 'last_name', 'role']
            }
          ]
        }
      ]
    });

    // Reload the edited version with associations
    await version.reload({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: User,
          as: 'assignedApprover',
          attributes: ['id', 'first_name', 'last_name', 'role']
        }
      ]
    });

    // Build response with transformed data

    const documentData = document.toJSON();
    const versionData = version.toJSON();

    const responseData = {
      id: documentData.id,
      companyId: documentData.company_id,
      code: documentData.code,
      name: documentData.name,
      documentTypeId: documentData.document_type_id,
      processId: documentData.process_id,
      departmentId: documentData.department_id,
      createdBy: documentData.created_by,
      currentVersionId: documentData.current_version_id,
      codeEditedBy: documentData.code_edited_by,
      codeEditedAt: documentData.code_edited_at,
      createdAt: documentData.createdAt,
      updatedAt: documentData.updatedAt,

      // Relations
      documentType: documentData.documentType,
      process: documentData.process,
      department: documentData.department,
      creator: documentData.creator,
      codeEditor: documentData.codeEditor,
      currentVersion: transformVersion(documentData.currentVersion, documentData),

      // Transforming the edited version
      editedVersion: transformVersion(versionData, documentData)
    };

    res.status(200).json({
      success: true,
      message: 'Document metadata updated successfully',
      data: { document: responseData }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document metadata',
      error: error.message
    });
  }
};


// ============================================
// UPDATE VERSION FILE
// ============================================

/**
 * Replace file of a specific version
 * PUT /api/documents/:id/versions/:versionId/file
 * 
 * - Quality Manager: Can replace file of approved versions
 * - Creator: Can replace file of any draft version (v1.0, v2.0, v3.0, etc.) * 
 */
const updateVersionFile = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id, versionId } = req.params;

    // Validate file upload    
    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'File upload is required'
      });
    }

    // Find version with document    
    const version = await DocumentVersion.findOne({
      where: {
        id: versionId,
        document_id: id
      },
      include: [
        {
          model: Document,
          as: 'document',
          where: { company_id: req.user.companyId },
          include: [
            {
              model: DocumentType,
              as: 'documentType',
              attributes: ['id', 'name', 'acronym']
            },
            {
              model: Process,
              as: 'process',
              attributes: ['id', 'name', 'acronym']
            },
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    if (!version) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    // Permission check    
    const isQM = req.user.role === 'quality_manager';
    const isCreator = version.created_by === req.user.id;
    const isApproved = version.status === 'approved';
    const isDraft = version.status === 'draft';

    /**
     * AUTHORIZATION LOGIC:
     * 
     * QM editing approved version (scenario 1)
     * Creator editing their draft (scenario 2 & 3)
     * Reject any other scenario
     */
    const canEditFile =
      (isQM && isApproved) ||      // QM can edit approved files
      (isCreator && isDraft);      // Creator can edit their draft files

    if (!canEditFile) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this version file. ' +
          (version.status === 'pending_approval'
            ? 'Cannot edit files pending approval.'
            : 'Only Quality Managers can edit approved files.')
      });
    }

    // Upload new file to Supabase Storage    
    const storagePath = await uploadFileToSupabase(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `company-${req.user.companyId}`  // Folder: company-1, company-2, etc.
    );

    // Delete old file from supabase    
    try {
      await deleteFileFromSupabase(version.file_url);
      console.log('Old file deleted successfully');
    } catch (error) {
      console.warn('Failed to delete old file from Supabase:', error);
      // Continue anyway - old file cleanup can happen later
    }

    // Update version record    
    version.file_url = storagePath;
    version.file_name = req.file.originalname;
    version.file_size = req.file.size;
    version.version_edited_by = req.user.id;
    version.version_edited_at = new Date();

    await version.save({ transaction });
    await transaction.commit();

    // Reload with associations    
    await version.reload({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: User,
          as: 'assignedApprover',
          attributes: ['id', 'first_name', 'last_name', 'role']
        },
        {
          model: User,
          as: 'versionEditor',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    // Transform response for frontend camelCase    
    const versionData = version.toJSON();
    const documentData = version.document.toJSON();

    const responseData = transformVersion(versionData, documentData);

    res.status(200).json({
      success: true,
      message: 'Version file updated successfully',
      data: { version: responseData }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Update version file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update version file',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  createDocument,
  getAllDocuments,
  getDocumentById,
  downloadDocument,
  submitForApproval,
  approveDocument,
  rejectDocument,
  updateDocument,
  createNewVersion,
  makeObsolete,
  deleteDraftVersion,
  updateVersionFile
};