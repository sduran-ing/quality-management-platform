'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    
    // ============================================
    // 1. COMPANIES TABLE (Foundation - no dependencies)
    // ============================================
    await queryInterface.createTable('companies', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      logo_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'S3 path to company logo'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // 2. DEPARTMENTS TABLE
    // ============================================
    await queryInterface.createTable('departments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      department_head_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Can be null initially, assigned after user creation
        comment: 'References users table - will be set up after users table is created'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // 3. USERS TABLE
    // ============================================
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('quality_manager', 'process_owner', 'employee'),
        allowNull: false,
        defaultValue: 'employee'
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Nullable for quality_manager role
        references: {
          model: 'departments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      avatar_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'S3 path to user avatar image'
      },
      achievement_points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total points from earned achievements'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft delete - false means user is deactivated'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add foreign key constraint for department_head_id now that users table exists
    await queryInterface.addConstraint('departments', {
      fields: ['department_head_id'],
      type: 'foreign key',
      name: 'fk_departments_department_head',
      references: {
        table: 'users',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // ============================================
    // 4. PROCESSES TABLE
    // ============================================
    await queryInterface.createTable('processes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      acronym: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'Used for document code generation (e.g., ITEN, HR, OPS)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      process_owner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT' // Cannot delete user if they own a process
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Unique constraint: acronym must be unique per company
    await queryInterface.addConstraint('processes', {
      fields: ['company_id', 'acronym'],
      type: 'unique',
      name: 'unique_company_process_acronym'
    });

    // ============================================
    // 5. PROCESS_DEPARTMENTS (Many-to-Many Junction)
    // ============================================
    await queryInterface.createTable('process_departments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      process_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'processes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'departments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    });

    // Prevent duplicate process-department relationships
    await queryInterface.addConstraint('process_departments', {
      fields: ['process_id', 'department_id'],
      type: 'unique',
      name: 'unique_process_department'
    });

    // ============================================
    // 6. USER_PROCESSES (Many-to-Many Junction)
    // ============================================
    await queryInterface.createTable('user_processes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      process_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'processes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    });

    // Prevent duplicate user-process assignments
    await queryInterface.addConstraint('user_processes', {
      fields: ['user_id', 'process_id'],
      type: 'unique',
      name: 'unique_user_process'
    });

    // ============================================
    // 7. STANDARDS TABLE
    // ============================================
    await queryInterface.createTable('standards', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'e.g., ISO 9001, ISO 27001'
      },
      version: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'e.g., 2015, 2022'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // 8. STANDARD_REQUIREMENTS TABLE
    // ============================================
    await queryInterface.createTable('standard_requirements', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      standard_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'standards',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      clause_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'e.g., 8.5, 8.5.1, 10.2'
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'e.g., Control of Production and Service Provision'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Full requirement text'
      },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'standard_requirements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'For nested clauses (e.g., 8.5.1 is child of 8.5)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // 9. COMPANY_STANDARDS (Many-to-Many Junction)
    // ============================================
    await queryInterface.createTable('company_standards', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      standard_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'standards',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      adopted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Prevent duplicate company-standard relationships
    await queryInterface.addConstraint('company_standards', {
      fields: ['company_id', 'standard_id'],
      type: 'unique',
      name: 'unique_company_standard'
    });

    // ============================================
    // 10. DOCUMENT_TYPES TABLE
    // ============================================
    await queryInterface.createTable('document_types', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'e.g., Procedure, Form, Guide, Policy'
      },
      acronym: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'Used in document codes (e.g., PROC, FORM, GUIDE)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Unique constraint: acronym must be unique per company
    await queryInterface.addConstraint('document_types', {
      fields: ['company_id', 'acronym'],
      type: 'unique',
      name: 'unique_company_doctype_acronym'
    });

    // ============================================
    // 11. DOCUMENTS TABLE
    // ============================================
    await queryInterface.createTable('documents', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Auto-generated: [PROCESS]-[TYPE]-[###] (e.g., ITEN-PROC-001)'
      },
      name: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      document_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'document_types',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      process_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'processes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'departments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      current_version_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Points to latest approved version in document_versions table'
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending_approval', 'approved', 'obsolete'),
        allowNull: false,
        defaultValue: 'draft'
      },
      code_edited_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Tracks if Quality Manager manually changed the code'
      },
      code_edited_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Unique constraint: code must be unique per company
    await queryInterface.addConstraint('documents', {
      fields: ['company_id', 'code'],
      type: 'unique',
      name: 'unique_company_document_code'
    });

    // ============================================
    // 12. DOCUMENT_VERSIONS TABLE
    // ============================================
    await queryInterface.createTable('document_versions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      document_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'documents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      version_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Auto-incremented: 1.0, 2.0, 3.0, etc.'
      },
      file_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'S3 path to the document file'
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'File size in bytes'
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending_approval', 'approved', 'outdated'),
        allowNull: false,
        defaultValue: 'draft'
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      version_edited_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Tracks if Quality Manager manually changed version number'
      },
      version_edited_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      change_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description of what changed in this version'
      }
    });

    // Add foreign key constraint for current_version_id now that document_versions exists
    await queryInterface.addConstraint('documents', {
      fields: ['current_version_id'],
      type: 'foreign key',
      name: 'fk_documents_current_version',
      references: {
        table: 'document_versions',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // ============================================
    // 13. AUDITS TABLE
    // ============================================
    await queryInterface.createTable('audits', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'e.g., Q1 2025 Internal Audit'
      },
      audit_type: {
        type: Sequelize.ENUM('internal', 'external', 'surveillance', 'certification'),
        allowNull: false
      },
      scheduled_start_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      scheduled_end_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      actual_start_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      actual_end_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled'
      },
      lead_auditor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      corrective_action_deadline: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Deadline for proposing corrective actions'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // 14. AUDIT_TEAM (Many-to-Many Junction)
    // ============================================
    await queryInterface.createTable('audit_team', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      audit_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'audits',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      auditor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      role: {
        type: Sequelize.ENUM('lead_auditor', 'auditor', 'auditee'),
        allowNull: false,
        defaultValue: 'auditor'
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // 15. AUDIT_PROCESSES (Many-to-Many Junction)
    // ============================================
    await queryInterface.createTable('audit_processes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      audit_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'audits',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      process_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'processes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    });

    // ============================================
    // 16. AUDIT_STANDARDS (Many-to-Many Junction)
    // ============================================
    await queryInterface.createTable('audit_standards', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      audit_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'audits',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      standard_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'standards',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    });

    // ============================================
    // 17. AUDIT_FINDINGS TABLE
    // ============================================
    await queryInterface.createTable('audit_findings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      audit_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'audits',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      finding_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Auto-generated per audit (e.g., F-001, F-002)'
      },
      severity: {
        type: Sequelize.ENUM('major_nonconformity', 'minor_nonconformity', 'opportunity'),
        allowNull: false
      },
      standard_requirement_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'standard_requirements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      process_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'processes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'What was found/observed'
      },
      evidence_description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'What evidence was reviewed'
      },
      status: {
        type: Sequelize.ENUM('open', 'in_progress', 'pending_verification', 'closed'),
        allowNull: false,
        defaultValue: 'open'
      },
      closed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      closed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'The auditor who created the finding'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Unique constraint: finding_number must be unique per audit
    await queryInterface.addConstraint('audit_findings', {
      fields: ['audit_id', 'finding_number'],
      type: 'unique',
      name: 'unique_audit_finding_number'
    });

    // ============================================
    // 18. FINDING_EVIDENCE TABLE
    // ============================================
    await queryInterface.createTable('finding_evidence', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      finding_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'audit_findings',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      evidence_type: {
        type: Sequelize.ENUM('file', 'url'),
        allowNull: false
      },
      file_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'S3 path if file, or external URL'
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Null for URLs'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      uploaded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // 19. CORRECTIVE_ACTIONS TABLE
    // ============================================
    await queryInterface.createTable('corrective_actions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      finding_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'audit_findings',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Auto-generated per finding (e.g., CA-001, CA-002)'
      },
      proposed_action: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'What will be done to fix the issue'
      },
      root_cause_analysis: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Analysis of why the issue occurred'
      },
      expected_completion_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      actual_completion_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('proposed', 'approved', 'rejected', 'in_implementation', 'completed', 'verified'),
        allowNull: false,
        defaultValue: 'proposed'
      },
      proposed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Process owner who proposed the action'
      },
      proposed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Auditor who approved the action'
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      verified_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Auditor who verified implementation'
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Why the auditor rejected the proposed action'
      }
    });

    // ============================================
    // 20. CORRECTIVE_ACTION_EVIDENCE TABLE
    // ============================================
    await queryInterface.createTable('corrective_action_evidence', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      corrective_action_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'corrective_actions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      evidence_type: {
        type: Sequelize.ENUM('file', 'url'),
        allowNull: false
      },
      file_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'S3 path if file, or external URL'
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Null for URLs'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      uploaded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // 21. ACHIEVEMENTS TABLE (Gamification)
    // ============================================
    await queryInterface.createTable('achievements', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'e.g., Audit Champion, Swift Resolver'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'e.g., Complete 5 audits'
      },
      icon_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'S3 path to badge icon'
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
        comment: 'Points awarded for earning this achievement'
      },
      criteria_type: {
        type: Sequelize.ENUM('audit_completed', 'finding_closed', 'document_uploaded', 'document_updated', 'document_obsoleted', 'ca_verified'),
        allowNull: false
      },
      criteria_value: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'e.g., 5 for "complete 5 audits"'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // 22. USER_ACHIEVEMENTS (Many-to-Many Junction)
    // ============================================
    await queryInterface.createTable('user_achievements', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      achievement_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'achievements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      earned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Prevent duplicate user-achievement records
    await queryInterface.addConstraint('user_achievements', {
      fields: ['user_id', 'achievement_id'],
      type: 'unique',
      name: 'unique_user_achievement'
    });

    // ============================================
    // 23. USER_ACTIVITY TABLE (For tracking achievement progress)
    // ============================================
    await queryInterface.createTable('user_activity', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      activity_type: {
        type: Sequelize.ENUM('audit_completed', 'finding_closed', 'document_uploaded', 'document_updated', 'document_obsoleted', 'ca_verified'),
        allowNull: false
      },
      reference_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID of the audit, finding, document, or CA'
      },
      reference_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Table name: audit, finding, document, corrective_action'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    console.log('All tables created successfully!');
  },

  // ============================================
  // DOWN MIGRATION - Drop all tables in reverse order
  // ============================================
  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order to respect foreign key constraints
    await queryInterface.dropTable('user_activity');
    await queryInterface.dropTable('user_achievements');
    await queryInterface.dropTable('achievements');
    await queryInterface.dropTable('corrective_action_evidence');
    await queryInterface.dropTable('corrective_actions');
    await queryInterface.dropTable('finding_evidence');
    await queryInterface.dropTable('audit_findings');
    await queryInterface.dropTable('audit_standards');
    await queryInterface.dropTable('audit_processes');
    await queryInterface.dropTable('audit_team');
    await queryInterface.dropTable('audits');
    
    // Remove foreign key constraint before dropping document_versions
    await queryInterface.removeConstraint('documents', 'fk_documents_current_version');
    await queryInterface.dropTable('document_versions');
    await queryInterface.dropTable('documents');
    await queryInterface.dropTable('document_types');
    await queryInterface.dropTable('company_standards');
    await queryInterface.dropTable('standard_requirements');
    await queryInterface.dropTable('standards');
    await queryInterface.dropTable('user_processes');
    await queryInterface.dropTable('process_departments');
    await queryInterface.dropTable('processes');
    
    // Remove foreign key constraint before dropping users
    await queryInterface.removeConstraint('departments', 'fk_departments_department_head');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('departments');
    await queryInterface.dropTable('companies');

    console.log('All tables dropped successfully!');
  }
};