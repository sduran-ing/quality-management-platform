// Import all models
const User = require('./User');
const Company = require('./Company');
const Department = require('./Department');
const Process = require('./Process');
const DocumentType = require('./DocumentType');
const Document = require('./Document');
const DocumentVersion = require('./DocumentVersion');
const Standard = require('./Standard');
const StandardRequirement = require('./StandardRequirement');
const Audit = require('./Audit');
const AuditTeam = require('./AuditTeam');
const AuditProcess = require('./AuditProcess');
const AuditStandard = require('./AuditStandard');
const AuditFinding = require('./AuditFinding');
const CorrectiveAction = require('./CorrectiveAction');

// Achievement system models
const Achievement = require('./Achievement');
const UserAchievement = require('./UserAchievement');
const UserActivity = require('./UserActivity');

// ============================================
// DEFINE ASSOCIATIONS (Relationships)
// ============================================

// -------------------------------------------
// COMPANY ASSOCIATIONS
// -------------------------------------------

// Company has many Users
Company.hasMany(User, {
  foreignKey: 'company_id',
  as: 'users'
});

// Company has many Departments
Company.hasMany(Department, {
  foreignKey: 'company_id',
  as: 'departments'
});

// Company has many Processes
Company.hasMany(Process, {
  foreignKey: 'company_id',
  as: 'processes'
});

// -------------------------------------------
// USER ASSOCIATIONS
// -------------------------------------------

// User belongs to Company
User.belongsTo(Company, {
  foreignKey: 'company_id',
  as: 'company'
});

// User belongs to Department (as a member)
// USER different aliases
// Get user's department (where they work)
User.belongsTo(Department, {
  foreignKey: 'department_id',
  as: 'department'
});

// User can be head of a Department (one-to-one)
// USER different aliases
// Get department that user manages
User.hasOne(Department, {
  foreignKey: 'department_head_id',
  as: 'managedDepartment'
});

// User can own multiple Processes (as process owner)
User.hasMany(Process, {
  foreignKey: 'process_owner_id',
  as: 'ownedProcesses'
});

// User can be assigned to multiple Processes (many-to-many)
// We'll define this with belongsToMany later when we need it

// -------------------------------------------
// DEPARTMENT ASSOCIATIONS
// -------------------------------------------

// Department belongs to Company
Department.belongsTo(Company, {
  foreignKey: 'company_id',
  as: 'company'
});

// Department has one head (User)
Department.belongsTo(User, {
  foreignKey: 'department_head_id',
  as: 'departmentHead'
});

// Department has many Users (as members)
Department.hasMany(User, {
  foreignKey: 'department_id',
  as: 'members'
});

// Department has many Processes (many-to-many)
Department.belongsToMany(Process, {
  through: 'process_departments', // Junction table name
  foreignKey: 'department_id',
  otherKey: 'process_id',
  as: 'processes'
});

// -------------------------------------------
// PROCESS ASSOCIATIONS
// -------------------------------------------

// Process belongs to Company
Process.belongsTo(Company, {
  foreignKey: 'company_id',
  as: 'company'
});

// Process has one owner (User)
Process.belongsTo(User, {
  foreignKey: 'process_owner_id',
  as: 'processOwner'
});

// Process belongs to many Departments (many-to-many)
Process.belongsToMany(Department, {
  through: 'process_departments', // Junction table name
  foreignKey: 'process_id',
  otherKey: 'department_id',
  as: 'departments'
});

// Process has many assigned Users (many-to-many)
Process.belongsToMany(User, {
  through: 'user_processes',    // Junction table name
  foreignKey: 'process_id',
  otherKey: 'user_id',
  as: 'assignedUsers'
});

// User belongs to many Processes (many-to-many - reverse of above)
User.belongsToMany(Process, {
  through: 'user_processes',    // Junction table name
  foreignKey: 'user_id',
  otherKey: 'process_id',
  as: 'assignedProcesses'
});

// -------------------------------------------
// DOCUMENT TYPE ASSOCIATIONS
// -------------------------------------------

// Company has many DocumentTypes
Company.hasMany(DocumentType, {
  foreignKey: 'company_id',
  as: 'documentTypes'
});

// DocumentType belongs to Company
DocumentType.belongsTo(Company, {
  foreignKey: 'company_id',
  as: 'company'
});

// DocumentType has many Documents
DocumentType.hasMany(Document, {
  foreignKey: 'document_type_id',
  as: 'documents'
});

// -------------------------------------------
// DOCUMENT ASSOCIATIONS
// -------------------------------------------

// Company has many Documents
Company.hasMany(Document, {
  foreignKey: 'company_id',
  as: 'documents'
});

// Document belongs to Company
Document.belongsTo(Company, {
  foreignKey: 'company_id',
  as: 'company'
});

// Document belongs to DocumentType
Document.belongsTo(DocumentType, {
  foreignKey: 'document_type_id',
  as: 'documentType'
});

// Document belongs to Process
Document.belongsTo(Process, {
  foreignKey: 'process_id',
  as: 'process'
});

// Process has many Documents
Process.hasMany(Document, {
  foreignKey: 'process_id',
  as: 'documents'
});

// Document belongs to Department
Document.belongsTo(Department, {
  foreignKey: 'department_id',
  as: 'department'
});

// Department has many Documents
Department.hasMany(Document, {
  foreignKey: 'department_id',
  as: 'documents'
});

// Document created by User
Document.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

// Document code edited by User (Quality Manager)
Document.belongsTo(User, {
  foreignKey: 'code_edited_by',
  as: 'codeEditor'
});

// Document has many Versions
Document.hasMany(DocumentVersion, {
  foreignKey: 'document_id',
  as: 'versions'
});

// Document has one current version
Document.belongsTo(DocumentVersion, {
  foreignKey: 'current_version_id',
  as: 'currentVersion'
});

// -------------------------------------------
// DOCUMENT VERSION ASSOCIATIONS
// -------------------------------------------

// DocumentVersion belongs to Document
DocumentVersion.belongsTo(Document, {
  foreignKey: 'document_id',
  as: 'document'
});

// DocumentVersion created by User
DocumentVersion.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

/**
 * Assigned Approver
 * 
 * User who is assigned to approve/reject this version
 */
DocumentVersion.belongsTo(User, {
  foreignKey: 'assigned_approver_id',
  as: 'assignedApprover'
});

// DocumentVersion approved by User
DocumentVersion.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approver'
});

// DocumentVersion edited by User (Quality Manager)
DocumentVersion.belongsTo(User, {
  foreignKey: 'version_edited_by',
  as: 'versionEditor'
});

// -------------------------------------------
// STANDARD ASSOCIATIONS
// -------------------------------------------

// Standard has many Requirements
Standard.hasMany(StandardRequirement, {
  foreignKey: 'standard_id',
  as: 'requirements'
});

// StandardRequirement belongs to Standard
StandardRequirement.belongsTo(Standard, {
  foreignKey: 'standard_id',
  as: 'standard'
});

// StandardRequirement can have parent (hierarchical)
StandardRequirement.belongsTo(StandardRequirement, {
  foreignKey: 'parent_id',
  as: 'parent'
});

// StandardRequirement can have children
StandardRequirement.hasMany(StandardRequirement, {
  foreignKey: 'parent_id',
  as: 'children'
});

// -------------------------------------------
// AUDIT ASSOCIATIONS
// -------------------------------------------

// Company has many Audits
Company.hasMany(Audit, {
  foreignKey: 'company_id',
  as: 'audits'
});

// Audit belongs to Company
Audit.belongsTo(Company, {
  foreignKey: 'company_id',
  as: 'company'
});

// Audit created by User
Audit.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

// User has many created Audits
User.hasMany(Audit, {
  foreignKey: 'created_by',
  as: 'createdAudits'
});

// Audit ↔ User (many-to-many with role) - Team Members
Audit.belongsToMany(User, {
  through: AuditTeam,
  foreignKey: 'audit_id',
  otherKey: 'auditor_id',  // ← Changed from user_id
  as: 'teamMembers'
});

User.belongsToMany(Audit, {
  through: AuditTeam,
  foreignKey: 'auditor_id',  // ← Changed from user_id
  otherKey: 'audit_id',
  as: 'audits'
});

// Direct access to AuditTeam for filtering by role
Audit.hasMany(AuditTeam, {
  foreignKey: 'audit_id',
  as: 'teamAssignments'
});

AuditTeam.belongsTo(Audit, {
  foreignKey: 'audit_id',
  as: 'audit'
});

AuditTeam.belongsTo(User, {
  foreignKey: 'auditor_id',  // ← Changed from user_id
  as: 'user'
});

// Audit ↔ Process (many-to-many) - Audit Scope
Audit.belongsToMany(Process, {
  through: AuditProcess,
  foreignKey: 'audit_id',
  otherKey: 'process_id',
  as: 'processes'
});

Process.belongsToMany(Audit, {
  through: AuditProcess,
  foreignKey: 'process_id',
  otherKey: 'audit_id',
  as: 'audits'
});

// Audit ↔ Standard (many-to-many) - Which standards being audited
Audit.belongsToMany(Standard, {
  through: AuditStandard,
  foreignKey: 'audit_id',
  otherKey: 'standard_id',
  as: 'standards'
});

Standard.belongsToMany(Audit, {
  through: AuditStandard,
  foreignKey: 'standard_id',
  otherKey: 'audit_id',
  as: 'audits'
});

// -------------------------------------------
// AUDIT FINDING ASSOCIATIONS
// -------------------------------------------

// Audit has many Findings
Audit.hasMany(AuditFinding, {
  foreignKey: 'audit_id',
  as: 'findings'
});

// AuditFinding belongs to Audit
AuditFinding.belongsTo(Audit, {
  foreignKey: 'audit_id',
  as: 'audit'
});

// AuditFinding belongs to StandardRequirement (which requirement was violated)
AuditFinding.belongsTo(StandardRequirement, {
  foreignKey: 'standard_requirement_id',
  as: 'requirement'
});

// AuditFinding belongs to Process
AuditFinding.belongsTo(Process, {
  foreignKey: 'process_id',
  as: 'process'
});

// AuditFinding created by User (auditor)
AuditFinding.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

// AuditFinding closed by User (auditor)
AuditFinding.belongsTo(User, {
  foreignKey: 'closed_by',
  as: 'closedByUser'
});

// -------------------------------------------
// CORRECTIVE ACTION ASSOCIATIONS
// -------------------------------------------

// AuditFinding has many CorrectiveActions
AuditFinding.hasMany(CorrectiveAction, {
  foreignKey: 'finding_id',
  as: 'correctiveActions'
});

// CorrectiveAction belongs to AuditFinding
CorrectiveAction.belongsTo(AuditFinding, {
  foreignKey: 'finding_id',
  as: 'finding'
});

// CorrectiveAction - responsible user
CorrectiveAction.belongsTo(User, {
  foreignKey: 'responsible_user_id',
  as: 'responsibleUser'
});

// CorrectiveAction - proposed by
CorrectiveAction.belongsTo(User, {
  foreignKey: 'proposed_by',
  as: 'proposer'
});

// CorrectiveAction - approved by
CorrectiveAction.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approver'
});

// CorrectiveAction - verified by
CorrectiveAction.belongsTo(User, {
  foreignKey: 'verified_by',
  as: 'verifier'
});


// ============================================
// ACHIEVEMENT ASSOCIATIONS
// ============================================

// User → UserAchievement (one user earns many achievements)
User.hasMany(UserAchievement, {
  foreignKey: 'user_id',
  as: 'userAchievements'
});
UserAchievement.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Achievement → UserAchievement (one achievement earned by many users)
Achievement.hasMany(UserAchievement, {
  foreignKey: 'achievement_id',
  as: 'userAchievements'
});
UserAchievement.belongsTo(Achievement, {
  foreignKey: 'achievement_id',
  as: 'achievement'
});

// User → UserActivity (one user has many activity logs)
User.hasMany(UserActivity, {
  foreignKey: 'user_id',
  as: 'userActivities'
});
UserActivity.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Export all models
module.exports = {
  User,
  Company,
  Department,
  Process,
  DocumentType,
  Document,
  DocumentVersion,
  Standard,
  StandardRequirement,
  Audit,
  AuditTeam,
  AuditProcess,
  AuditStandard,
  AuditFinding,
  CorrectiveAction,
  Achievement,
  UserAchievement,
  UserActivity
};