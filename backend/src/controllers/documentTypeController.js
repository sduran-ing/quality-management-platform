// Import models
const { DocumentType, Document } = require('../models');

// ============================================
// GET ALL DOCUMENT TYPES
// ============================================

/**
 * Get all document types for the company
 * GET /api/document-types
 */
const getAllDocumentTypes = async (req, res) => {
  try {
    const documentTypes = await DocumentType.findAll({
      where: {
        company_id: req.user.companyId
      },
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      message: 'Document types retrieved successfully',
      data: {
        documentTypes,
        total: documentTypes.length
      }
    });

  } catch (error) {
    console.error('Get document types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document types',
      error: error.message
    });
  }
};

// ============================================
// GET SINGLE DOCUMENT TYPE
// ============================================

/**
 * Get a single document type by ID
 * GET /api/document-types/:id
 */
const getDocumentTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const documentType = await DocumentType.findOne({
      where: {
        id,
        company_id: req.user.companyId
      }
    });

    if (!documentType) {
      return res.status(404).json({
        success: false,
        message: 'Document type not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Document type retrieved successfully',
      data: { documentType }
    });

  } catch (error) {
    console.error('Get document type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document type',
      error: error.message
    });
  }
};

// ============================================
// CREATE DOCUMENT TYPE
// ============================================

/**
 * Create a new document type
 * POST /api/document-types
 * Body: { name, acronym }
 * Only Quality Manager can create document types
 */
const createDocumentType = async (req, res) => {
  try {
    const { name, acronym } = req.body;

    // Validation
    if (!name || !acronym) {
      return res.status(400).json({
        success: false,
        message: 'Name and acronym are required'
      });
    }

    // Convert acronym to uppercase
    const upperAcronym = acronym.toUpperCase();

    // Check if acronym already exists for this company
    const existingType = await DocumentType.findOne({
      where: {
        company_id: req.user.companyId,
        acronym: upperAcronym
      }
    });

    if (existingType) {
      return res.status(400).json({
        success: false,
        message: `Document type with acronym "${upperAcronym}" already exists`
      });
    }

    // Create document type
    const documentType = await DocumentType.create({
      company_id: req.user.companyId,
      name: name.trim(),
      acronym: upperAcronym
    });

    res.status(201).json({
      success: true,
      message: 'Document type created successfully',
      data: { documentType }
    });

  } catch (error) {
    console.error('Create document type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document type',
      error: error.message
    });
  }
};

// ============================================
// UPDATE DOCUMENT TYPE
// ============================================

/**
 * Update document type
 * PUT /api/document-types/:id
 * Body: { name, acronym }
 * Only Quality Manager can update document types
 */
const updateDocumentType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, acronym } = req.body;

    // Find document type
    const documentType = await DocumentType.findOne({
      where: {
        id,
        company_id: req.user.companyId
      }
    });

    if (!documentType) {
      return res.status(404).json({
        success: false,
        message: 'Document type not found'
      });
    }

    // If acronym is being changed, check for duplicates
    if (acronym) {
      const upperAcronym = acronym.toUpperCase();
      
      if (upperAcronym !== documentType.acronym) {
        const existingType = await DocumentType.findOne({
          where: {
            company_id: req.user.companyId,
            acronym: upperAcronym,
            id: { [require('sequelize').Op.ne]: id }
          }
        });

        if (existingType) {
          return res.status(400).json({
            success: false,
            message: `Document type with acronym "${upperAcronym}" already exists`
          });
        }
        
        documentType.acronym = upperAcronym;
      }
    }

    // Update fields
    if (name) documentType.name = name.trim();

    await documentType.save();

    res.status(200).json({
      success: true,
      message: 'Document type updated successfully',
      data: { documentType }
    });

  } catch (error) {
    console.error('Update document type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document type',
      error: error.message
    });
  }
};

// ============================================
// DELETE DOCUMENT TYPE
// ============================================

/**
 * Delete a document type
 * DELETE /api/document-types/:id
 * Only Quality Manager can delete document types
 * Note: Cannot delete if documents exist with this type
 */
const deleteDocumentType = async (req, res) => {
  try {
    const { id } = req.params;

    // Find document type
    const documentType = await DocumentType.findOne({
      where: {
        id,
        company_id: req.user.companyId
      }
    });

    if (!documentType) {
      return res.status(404).json({
        success: false,
        message: 'Document type not found'
      });
    }

    // Check if any documents use this type
    const documentsCount = await Document.count({
      where: {
        document_type_id: id
      }
    });

    if (documentsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete document type. ${documentsCount} document(s) are using this type.`
      });
    }

    // Delete document type
    await documentType.destroy();

    res.status(200).json({
      success: true,
      message: 'Document type deleted successfully'
    });

  } catch (error) {
    console.error('Delete document type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document type',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  getAllDocumentTypes,
  getDocumentTypeById,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType
};