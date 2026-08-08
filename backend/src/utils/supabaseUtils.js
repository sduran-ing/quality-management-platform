// backend/utils/supabaseUtils.js

const { supabase } = require('../config/supabase');

// ============================================
// UPLOAD FILE TO SUPABASE STORAGE
// ============================================

/**
 * Upload a file to Supabase Storage
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} fileName - Name to save file as
 * @param {string} mimeType - File MIME type (e.g., 'application/pdf')
 * @param {string} folder - Folder path in bucket (e.g., 'documents/company-1')
 * @returns {Promise<string>} - Storage file path (used to retrieve file later)
 */
const uploadFileToSupabase = async (fileBuffer, fileName, mimeType, folder = 'documents') => {
  try {
    // Generate unique file name to prevent conflicts
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_'); // Remove special chars
    const storagePath = `${folder}/${timestamp}-${sanitizedFileName}`;

    // Upload to Supabase Storage
    // Note: Supabase automatically handles the bucket name ('documents')
    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET)  // Bucket name
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false  // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Return the storage path (we'll use this to retrieve the file later)
    // Example: "documents/company-1/1234567890-report.pdf"
    return data.path;

  } catch (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload file to Supabase: ${error.message}`);
  }
};

// ============================================
// DELETE FILE FROM SUPABASE STORAGE
// ============================================

/**
 * Delete a file from Supabase Storage
 * @param {string} storagePath - Storage file path (e.g., "documents/company-1/file.pdf")
 * @returns {Promise<void>}
 */
const deleteFileFromSupabase = async (storagePath) => {
  try {
    const { error } = await supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET)
      .remove([storagePath]);  // Note: remove() expects an array

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    console.log(`Deleted file from Supabase: ${storagePath}`);

  } catch (error) {
    console.error('Supabase delete error:', error);
    throw new Error(`Failed to delete file from Supabase: ${error.message}`);
  }
};

// ============================================
// GENERATE SIGNED URL (Temporary Download Link)
// ============================================

/**
 * Generate a signed URL for downloading a file
 * URL expires after specified time
 * @param {string} storagePath - Storage file path
 * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
const getSignedDownloadUrl = async (storagePath, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.error('Supabase signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    // Return the signed URL
    return data.signedUrl;

  } catch (error) {
    console.error('Supabase signed URL error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

// ============================================
// GET PUBLIC URL (Permanent Link)
// ============================================

/**
 * Get public URL for a file (if bucket is public)
 * Note: Only works if bucket has public access enabled
 * For private files, use getSignedDownloadUrl instead
 * @param {string} storagePath - Storage file path
 * @returns {string} - Public URL
 */
const getPublicUrl = (storagePath) => {
  const { data } = supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
};

// ============================================
// VALIDATE FILE TYPE
// ============================================

/**
 * Check if file type is allowed
 * @param {string} mimeType - File MIME type
 * @returns {boolean}
 */
const isAllowedFileType = (mimeType) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'image/jpeg',
    'image/png',
    'image/jpg',
    'text/plain'
  ];

  return allowedTypes.includes(mimeType);
};

// ============================================
// VALIDATE FILE SIZE
// ============================================

/**
 * Check if file size is within limit
 * @param {number} fileSize - File size in bytes
 * @param {number} maxSizeMB - Maximum size in MB (default: 10MB)
 * @returns {boolean}
 */
const isValidFileSize = (fileSize, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSize <= maxSizeBytes;
};

// Export all functions
module.exports = {
  uploadFileToSupabase,
  deleteFileFromSupabase,
  getSignedDownloadUrl,
  getPublicUrl,
  isAllowedFileType,
  isValidFileSize
};