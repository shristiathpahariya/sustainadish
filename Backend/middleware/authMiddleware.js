const jwt = require('jsonwebtoken');

// JWT Secret Key from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

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

module.exports = authMiddleware;
