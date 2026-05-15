const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// 30 requests per minute per authenticated user for donation routes
const donationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req),  // ipKeyGenerator handles IPv6
  message: { message: 'Too many requests, please slow down.' }
});

// 5 requests per minute per IP for unauthenticated endpoints
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'Too many requests from this IP.' }
  // no custom keyGenerator needed — default already uses ipKeyGenerator internally
});

module.exports = { donationLimiter, strictLimiter };