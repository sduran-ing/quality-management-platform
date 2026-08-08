// Import AWS SDK v3 components
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Create S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// ============================================
// UPLOAD FILE TO S3
// ============================================

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} fileName - Name to save file as
 * @param {string} mimeType - File MIME type (e.g., 'application/pdf')
 * @param {string} folder - Folder path in S3 (e.g., 'documents', 'avatars')
 * @returns {Promise<string>} - S3 file URL
 */
const uploadFileToS3 = async (fileBuffer, fileName, mimeType, folder = 'documents') => {
  try {
    // Generate unique file name to prevent conflicts
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_'); // Remove special chars
    const s3Key = `${folder}/${timestamp}-${sanitizedFileName}`;

    // Prepare upload command
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
      // Make file private (not publicly accessible)
      ACL: 'private'
    });

    // Upload to S3
    await s3Client.send(uploadCommand);

    // Return the S3 key (we'll use this to retrieve the file later)
    return s3Key;

  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

// ============================================
// DELETE FILE FROM S3
// ============================================

/**
 * Delete a file from S3
 * @param {string} s3Key - S3 file key (path)
 * @returns {Promise<void>}
 */
const deleteFileFromS3 = async (s3Key) => {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key
    });

    await s3Client.send(deleteCommand);
    console.log(`Deleted file from S3: ${s3Key}`);

  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

// ============================================
// GENERATE SIGNED URL (Temporary Download Link)
// ============================================

/**
 * Generate a pre-signed URL for downloading a file
 * URL expires after specified time
 * @param {string} s3Key - S3 file key
 * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
const getSignedDownloadUrl = async (s3Key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key
    });

    // Generate signed URL that expires after specified time
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;

  } catch (error) {
    console.error('S3 signed URL error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
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
    'image/jpeg',
    'image/png',
    'image/jpg'
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
  uploadFileToS3,
  deleteFileFromS3,
  getSignedDownloadUrl,
  isAllowedFileType,
  isValidFileSize
};