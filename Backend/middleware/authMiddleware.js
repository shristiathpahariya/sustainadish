const jwt = require('jsonwebtoken');

// JWT Secret Key from environment variables
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

const authMiddleware = (req, res, next) => {
  // Try to get token from header first
  let token = req.header('x-auth-token');
  
  // If not in header, try to get from cookie
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  if (!token) return res.status(401).send({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // id + email (email used for ownership checks when donation has no userId)
    req.user = {
      id: decoded.id || decoded,
      email: typeof decoded.email === 'string' ? decoded.email.toLowerCase() : undefined,
    };
    next();
  } catch (error) {
    res.status(400).send({ message: 'Invalid token' });
  }
};

/** Sets `req.user` when a valid JWT is present; otherwise continues without `req.user`. */
const optionalAuthMiddleware = (req, res, next) => {
  let token = req.header('x-auth-token');
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id || decoded,
      email: typeof decoded.email === 'string' ? decoded.email.toLowerCase() : undefined,
    };
  } catch {
    /* invalid or expired token — treat as anonymous */
  }
  next();
};

module.exports = authMiddleware;
module.exports.optionalAuthMiddleware = optionalAuthMiddleware;
