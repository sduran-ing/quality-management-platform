/**
 * =============================================================================
 * CASE TRANSFORMATION MIDDLEWARE (WITH CIRCULAR REFERENCE PROTECTION)
 * =============================================================================
 * The Flow:
javascript1. Frontend sends: { auditType: 'external', myRole: 'lead_auditor' }

2. Middleware receives (null prototype):
   [Object: null prototype] { auditType: 'external', myRole: 'lead_auditor' }

3. transformKeysToSnake transforms:
   { audit_type: 'external', my_role: 'lead_auditor' }

4. Validators validate:
   query('audit_type')
   query('my_role')

5. Controller receives:
   { audit_type: 'external', my_role: 'lead_auditor' }

6. Database query works
 */

// Convert string from camelCase to snake_case
const camelToSnake = (str) => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// Convert string from snake_case and PascalCase to camelCase
const snakeToCamel = (str) => {
    // First, convert PascalCase to camelCase (AuditTeam -> auditTeam)
    let result = str.charAt(0).toLowerCase() + str.slice(1);
    
    // Then, handle snake_case to camelCase (audit_team -> auditTeam)
    result = result.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    return result;
};

// Recursively convert all object keys from camelCase to snake_case
// Uses a Set to track visited objects and prevent circular references
const keysToSnake = (obj, seen = new WeakSet()) => {
    // Handle primitives
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => keysToSnake(item, seen));
    }

    // Handle dates
    if (obj instanceof Date) {
        return obj;
    }

    // Check for circular reference
    if (seen.has(obj)) {
        return obj; // Return as-is to break the cycle
    }
    seen.add(obj);

    // Transform object keys
    const result = {};
    for (const key in obj) {
        // Safe it borrows the method from Object.prototype directly
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const snakeKey = camelToSnake(key);
            result[snakeKey] = keysToSnake(obj[key], seen);
        }
    }

    return result;
};

// Recursively convert all object keys from snake_case to camelCase
// Uses a Set to track visited objects and prevent circular references
const keysToCamel = (obj, seen = new WeakSet()) => {
    // Handle primitives
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => keysToCamel(item, seen));
    }

    // Handle dates
    if (obj instanceof Date) {
        return obj;
    }

    // Check for circular reference
    if (seen.has(obj)) {
        return obj; // Return as-is to break the cycle
    }
    seen.add(obj);

    // Transform object keys
    const result = {};
    for (const key in obj) {
        // Safe it borrows the method from Object.prototype directly
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = snakeToCamel(key);
            result[camelKey] = keysToCamel(obj[key], seen);
        }
    }

    return result;
};

// Convert incoming request data from snake_case to camelCase
const snakeCaseRequest = (req, res, next) => {
  try {
    // Transform body (this still works fine — req.body is a normal property)
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      req.body = keysToSnake(req.body);
    }

    // Transform query
    // In Express 5, req.query is a getter that re-parses the URL on every access.
    // Simple assignment (req.query = ...) is silently ignored.
    // We need Object.defineProperty to override the getter with a plain value.
    if (req.query && typeof req.query === 'object' && Object.keys(req.query).length > 0) {
      const transformedQuery = keysToSnake(req.query);
      Object.defineProperty(req, 'query', {
        value: transformedQuery,
        writable: true,
        configurable: true,
        enumerable: true
      });
    }

    next();
  } catch (error) {
    console.error('Request transformation error:', error);
    next();
  }
};

// Convert outgoing response data from snake_case to camelCase
const camelCaseResponse = (req, res, next) => {
    const originalJson = res.json;

    res.json = function (data) {
        try {
            // Debugging
            console.log('Actual response data:', JSON.stringify(data, null, 2));

            // Convert to plain JSON first to remove Sequelize instances and circular refs
            const plainData = JSON.parse(JSON.stringify(data));

            // Then transform keys
            const converted = keysToCamel(plainData);

            return originalJson.call(this, converted);
        } catch (error) {
            console.error('Response transformation error:', error);
            return originalJson.call(this, data);
        }
    };

    next();
};

module.exports = { snakeCaseRequest, camelCaseResponse };