// Import utilities
const { verifyToken } = require('../utils/authUtils');
const User = require('../models/User');

/**
 * Middleware to verify JWT token and authenticate user
 * Protects routes from unauthorized access
 * 
 * Example usage:
 * router.get('/protected-route', authenticate, controller)
 */
const authenticate = async (req, res, next) => {
  try {
    // ============================================
    // EXTRACT TOKEN FROM HEADER
    // ============================================
    
    // Get the Authorization header
    // Format: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    const authHeader = req.headers.authorization;
    
    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }
    
    // Check if it starts with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format. Use: Bearer <token>'
      });
    }
    
    // Extract the token (remove "Bearer " prefix)
    const token = authHeader.substring(7); // "Bearer " is 7 characters
    
    // ============================================
    // VERIFY TOKEN
    // ============================================
    
    // Verify and decode the token
    const decoded = await verifyToken(token);
    
    // Token is valid! decoded contains: { id, email, role, company_id }
    
    // ============================================
    // CHECK IF USER STILL EXISTS AND IS ACTIVE
    // ============================================
    
    // Find the user in database
    const user = await User.findOne({
      where: {
        id: decoded.id,
        is_active: true // Only allow active users
      }
    });
    
    // User not found or inactive
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists or is inactive'
      });
    }
    
    // ============================================
    // ATTACH USER TO REQUEST OBJECT
    // ============================================
    
    // Make user data available to the next middleware/controller
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
      departmentId: user.department_id
    };
    
    // Continue to next middleware/controller
    next();
    
  } catch (error) {
    // Token is invalid or expired
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user has specific role(s)
 * Use after authenticate middleware
 * 
 * Example usage:
 * router.delete('/user/:id', authenticate, authorize(['quality_manager']), controller)
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    // Check if user is attached (authenticate middleware must run first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if user's role is in the allowed roles array
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }
    
    // User has the required role
    next();
  };
};

// Export middleware functions
module.exports = {
  authenticate,
  authorize
};