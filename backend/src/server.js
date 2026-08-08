// Import required modules
require('dotenv').config(); // Load environment variables first
const express = require('express');
const cors = require('cors');

const { snakeCaseRequest, camelCaseResponse } = require('./middleware/caseTransform.js')


// Import database connection
const sequelize = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');

// ============================================
// CREATE EXPRESS APP
// ============================================

const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// CORS - Allow frontend to communicate with backend
// In production, you'd specify allowed origins
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Next.js default port
  credentials: true // Allow cookies to be sent
}));

// Parse JSON request bodies
// Allows us to access req.body
app.use(express.json());

/**
 * Apply transformation to all requests/responses
 * 
 * IMPORTANT: Must be AFTER express.json() and BEFORE routes
 * 
 * Order matters:
 * 1. express.json() parses body
 * 2. snakeCaseRequest transforms parsed body/query
 * 3. Routes receive snake_case data
 * 4. camelCaseResponse transforms response back
 */
app.use(snakeCaseRequest);    // Transform incoming requests (camelCase to snake_case)
app.use(camelCaseResponse);   // Transform outgoing responses (snake_case to camelCase)

// Parse URL-encoded bodies (from HTML forms)
app.use(express.urlencoded({ extended: true }));

// Request logging (simple version)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check endpoint (test if server is running)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Quality Management Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount auth routes
app.use('/api/auth', authRoutes);

// Import department routes
const departmentRoutes = require('./routes/departmentRoutes');
// Import process routes
const processRoutes = require('./routes/processRoutes');
// Import user routes
const userRoutes = require('./routes/userRoutes');
// Import document type routes
const documentTypeRoutes = require('./routes/documentTypeRoutes');
// Import document routes
const documentRoutes = require('./routes/documentRoutes');
// Import audit routes
const auditRoutes = require('./routes/auditRoutes');
// Import dashboard routes
const dashboardRoutes = require('./routes/dashboardRoutes');
// Import standard routes
const standardRoutes = require('./routes/standardRoutes');
// Import achievement routes
const achievementRoutes = require('./routes/achievementRoutes');


// Mount department routes
app.use('/api/departments', departmentRoutes);
// Mount process routes
app.use('/api/processes', processRoutes);
// Mount user routes
app.use('/api/users', userRoutes);
// Mount document type routes
app.use('/api/document-types', documentTypeRoutes);
// Mount document routes
app.use('/api/documents', documentRoutes);
// Mount audit routes
app.use('/api/audits', auditRoutes);
// Mount dashboard routes
app.use('/api/dashboard', dashboardRoutes);
// Mount standard routes
app.use('/api/standards', standardRoutes);
// Mount achievement routes
app.use('/api/achievements', achievementRoutes);


//================= Just for Dev Testing =============
// Test protected route
const { authenticate } = require('./middleware/authMiddleware');

app.get('/api/test/protected', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'You accessed a protected route!',
    user: req.user // This comes from authenticate middleware
  });
});
//================= Just for Dev Testing =============


// ============================================
// 404 HANDLER (Route not found)
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) // Show stack trace only in development
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

// Test database connection and start server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Start listening for requests
    app.listen(PORT, () => {
      console.log('Server is running');
      console.log(`Port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API URL: http://localhost:${PORT}`);
      console.log(`Database: ${process.env.DB_NAME}`);
      console.log('-----------------------------------');
    });
    
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1); // Exit with error code
  }
};

// Start the server
startServer();