// Import multer for handling file uploads
const multer = require('multer');

// ============================================
// MULTER CONFIGURATION
// ============================================

// Store files in memory (as Buffer)
// This allows us to upload directly to S3 without saving to disk
const storage = multer.memoryStorage();

// File filter - validate file types before accepting
const fileFilter = (req, file, cb) => {
  // Allowed MIME types for documents
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

  if (allowedTypes.includes(file.mimetype)) {
    // Accept file
    cb(null, true);
  } else {
    // Reject file with error
    cb(new Error(`File type not allowed: ${file.mimetype}. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, TXT`), false);
  }
};

// Create multer upload instance. This is how it works:
// 1. Client sends POST request with file
//    ↓
//    Content-Type: multipart/form-data
//    Body: [binary file data]
   
// 2. Express receives the request
//    ↓
   
// 3. upload('file') middleware runs (MULTER)
//    ↓
//    - Multer detects multipart/form-data
//    - Multer reads the binary stream from request body
//    - Multer stores file in memory (because we used memoryStorage)
//    - Multer creates req.file object with buffer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max file size
    files: 1 // Only allow 1 file per request (can change for multiple uploads)
  }
});

// ============================================
// ERROR HANDLER FOR MULTER
// ============================================

/**
 * Middleware to handle multer errors with proper response
 * Use this AFTER multer upload middleware
 * We separate the error logic because of how multer handles errors
 * When multer encounters an error (file too big, wrong type), it doesn't send a response. 
 * Instead, it calls next(error) to pass the error to the next middleware.
 * multer doesn't give us access to res, We only have access to req, file, and callback
 * NO ACCESS to res - can't send JSON response in the previous "upload" function
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only 1 file allowed per upload'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    // Custom errors (like file type not allowed)
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Export upload middleware and error handler
module.exports = {
  upload,
  handleUploadError
};