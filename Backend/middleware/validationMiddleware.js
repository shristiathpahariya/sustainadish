const { validateAndSanitizeUser } = require('../utils/validation');

/**
 * Middleware to sanitize user input for authentication routes
 */
const sanitizeAuthInput = (req, res, next) => {
  try {
    const validation = validateAndSanitizeUser(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }
    
    // Replace request body with sanitized data
    req.body = validation.sanitized;
    next();
  } catch (error) {
    console.error('Validation error:', error);
    res.status(400).json({ error: 'Invalid input data' });
  }
};

/**
 * Middleware to sanitize general user input
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = req.query[key].trim();
        }
      });
    }
    
    // Sanitize path parameters
    if (req.params) {
      Object.keys(req.params).forEach(key => {
        if (typeof req.params[key] === 'string') {
          req.params[key] = req.params[key].trim();
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    res.status(400).json({ error: 'Invalid input data' });
  }
};

/**
 * Middleware to validate and sanitize message input
 */
const sanitizeMessageInput = (req, res, next) => {
  try {
    const requiredFields = ['firstName', 'lastName', 'email', 'message'];
    
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ 
          error: `Required field missing: ${field}` 
        });
      }
    }
    
    const validation = validateAndSanitizeUser(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }
    
    req.body = validation.sanitized;
    next();
  } catch (error) {
    console.error('Message validation error:', error);
    res.status(400).json({ error: 'Invalid message data' });
  }
};

/**
 * Middleware to validate and sanitize donation input
 */
const sanitizeDonationInput = (req, res, next) => {
  try {
    const requiredFields = ['donatedBy', 'contact', 'email', 'item', 'servings'];
    
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ 
          error: `Required field missing: ${field}` 
        });
      }
    }
    
    // Validate servings is a positive number
    if (isNaN(req.body.servings) || parseInt(req.body.servings) < 1) {
      return res.status(400).json({ 
        error: 'Servings must be a positive number' 
      });
    }
    
    // Validate expiry date is in the future
    if (req.body.expiryDate && new Date(req.body.expiryDate) <= new Date()) {
      return res.status(400).json({ 
        error: 'Expiry date must be in the future' 
      });
    }
    
    const validation = validateAndSanitizeUser(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }
    
    req.body = validation.sanitized;
    next();
  } catch (error) {
    console.error('Donation validation error:', error);
    res.status(400).json({ error: 'Invalid donation data' });
  }
};

/**
 * Middleware to validate and sanitize feedback input
 */
const sanitizeFeedbackInput = (req, res, next) => {
  try {
    const { rating, feedback } = req.body;

    if (rating === undefined || rating === null) {
      return res.status(400).json({ message: 'Rating is required' });
    }

    const ratingNum = Number(rating);
    if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    if (!feedback || typeof feedback !== 'string') {
      return res.status(400).json({ message: 'Feedback text is required' });
    }

    const trimmed = feedback.trim();
    if (trimmed.length < 10) {
      return res.status(400).json({
        message: 'Feedback must be at least 10 characters long',
      });
    }

    req.body.rating = Math.round(ratingNum);
    req.body.feedback = trimmed;

    next();
  } catch (error) {
    console.error('Feedback validation error:', error);
    res.status(400).json({ message: 'Invalid feedback data' });
  }
};

module.exports = {
  sanitizeAuthInput,
  sanitizeInput,
  sanitizeMessageInput,
  sanitizeDonationInput,
  sanitizeFeedbackInput
};