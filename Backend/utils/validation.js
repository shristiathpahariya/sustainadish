/**
 * Input sanitization and validation utilities
 */

// XSS Prevention - escape HTML characters
exports.sanitizeHTML = (str) => {
  if (typeof str !== 'string') return str;
  
  return str.replace(/[&<>"']/g, function(match) {
    const escape = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return escape[match];
  });
};

// SQL Injection Prevention - remove dangerous SQL keywords
exports.sanitizeSQL = (str) => {
  if (typeof str !== 'string') return str;
  
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', 'OR', 'AND', 'WHERE', 'EXEC', 'SCRIPT'];
  let sanitized = str;
  
  sqlKeywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  return sanitized;
};

// Email validation
exports.isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Phone number validation (supports multiple formats)
exports.isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check if it's a valid phone number (10-15 digits)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
};

// Name validation (letters, spaces, hyphens, apostrophes)
exports.isValidName = (name) => {
  if (!name || typeof name !== 'string') return false;
  
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return nameRegex.test(name.trim()) && name.trim().length >= 2;
};

// Generic string sanitization (remove malicious patterns)
exports.sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  let sanitized = str.trim();
  
  // Remove potential XSS attacks
  sanitized = exports.sanitizeHTML(sanitized);
  
  // Remove potential NoSQL injection attempts
  sanitized = sanitized.replace(/\$where/gi, '');
  sanitized = sanitized.replace(/\$ne/gi, '');
  sanitized = sanitized.replace(/\$in/gi, '');
  sanitized = sanitized.replace(/\$nin/gi, '');
  sanitized = sanitized.replace(/\$or/gi, '');
  sanitized = sanitized.replace(/\$and/gi, '');
  sanitized = sanitized.replace(/\$exists/gi, '');
  sanitized = sanitized.replace(/\$regex/gi, '');
  
  return sanitized;
};

// Validate and sanitize user input object
exports.validateAndSanitizeUser = (userData) => {
  const sanitized = {};
  const errors = [];
  
  // Validate and sanitize first name
  if (userData.firstName) {
    if (!exports.isValidName(userData.firstName)) {
      errors.push('Invalid first name');
    } else {
      sanitized.firstName = exports.sanitizeString(userData.firstName);
    }
  }
  
  // Validate and sanitize last name
  if (userData.lastName) {
    if (!exports.isValidName(userData.lastName)) {
      errors.push('Invalid last name');
    } else {
      sanitized.lastName = exports.sanitizeString(userData.lastName);
    }
  }
  
  // Validate and sanitize email
  if (userData.email) {
    if (!exports.isValidEmail(userData.email)) {
      errors.push('Invalid email address');
    } else {
      sanitized.email = userData.email.trim().toLowerCase();
    }
  }
  
  // Validate and sanitize contact
  if (userData.contact) {
    const contact = userData.contact.trim();
    if (contact && !exports.isValidPhone(contact)) {
      // Contact field can be flexible, but warn if it looks like a phone number
      if (contact.match(/\d/)) {
        errors.push('Invalid contact information');
      } else {
        sanitized.contact = exports.sanitizeString(contact);
      }
    } else {
      sanitized.contact = exports.sanitizeString(contact);
    }
  }
  
  // Sanitize location
  if (userData.location) {
    sanitized.location = exports.sanitizeString(userData.location);
  }
  
  // Sanitize password (don't validate here, just ensure no extra spaces)
  if (userData.password) {
    sanitized.password = userData.password.trim();
  }
  
  // Sanitize text fields
  if (userData.message || userData.feedback || userData.item || userData.additionalInfo) {
    const textFields = ['message', 'feedback', 'item', 'additionalInfo'];
    textFields.forEach(field => {
      if (userData[field]) {
        sanitized[field] = exports.sanitizeString(userData[field]);
      }
    });
  }
  
  return {
    sanitized,
    errors,
    isValid: errors.length === 0
  };
};

// Rate limiting key generator
exports.generateRateLimitKey = (identifier) => {
  if (!identifier) return 'anonymous';
  return `rate_limit_${typeof identifier === 'string' ? identifier : identifier.toString()}`;
};