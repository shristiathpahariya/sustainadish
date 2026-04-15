const jwt = require('jsonwebtoken');

// JWT Secret Key from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const authMiddleware = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).send({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch (error) {
    res.status(400).send({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
