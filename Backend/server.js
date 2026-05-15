const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messageRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const donationRoutes = require('./routes/donationRoutes');
const savedRecipeRoutes = require('./routes/savedRecipeRoutes');
const sharedRecipeRoutes = require('./routes/sharedRecipeRoutes');
const communityRecipeRoutes = require('./routes/communityRecipeRoutes');
const adminReviewRoutes = require('./routes/adminReviewRoutes');
const trainingRoutes = require('./routes/trainingRoutes');
const metricsRoutes = require('./routes/metricsRoutes');

// Import middleware
const { sanitizeInput } = require('./middleware/validationMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware — `origin: true` reflects the request Origin so credentialed requests work
// when the SPA (e.g. Vercel) and API (e.g. Render) are on different hosts. `origin: '*'`
// is invalid with `credentials: true` and breaks cookies/headers in browsers.

// Function to normalize URL (remove trailing slash)
const normalizeOrigin = (origin) => {
  if (!origin || origin === '*') return origin;
  return origin.replace(/\/$/, '');
};

// Configure CORS to handle both with and without trailing slash
const corsOriginConfig = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*'
  ? (origin, callback) => {
      // Remove trailing slash from both origin and configured CORS origin for comparison
      const normalizedOrigin = normalizeOrigin(origin);
      const normalizedConfig = normalizeOrigin(process.env.CORS_ORIGIN);

      console.log(`[CORS] Request origin: ${origin}`);
      console.log(`[CORS] Normalized origin: ${normalizedOrigin}`);
      console.log(`[CORS] Configured origin: ${process.env.CORS_ORIGIN}`);
      console.log(`[CORS] Normalized config: ${normalizedConfig}`);

      // Allow both localhost, 127.0.0.1, undefined (same-origin), and the configured production origin
      if (origin === undefined ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          normalizedOrigin === normalizedConfig) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  : true;

app.use(
  cors({
    origin: corsOriginConfig,
    credentials: true,
  })
);
// ── ADD: HTTPS redirect in production ──
app.use(require('./middleware/httpsRedirect'));

app.use(cookieParser());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Apply sanitization middleware to all API routes
app.use('/api', sanitizeInput);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', donationRoutes);
app.use('/api', savedRecipeRoutes);
app.use('/api', sharedRecipeRoutes);
app.use('/api', communityRecipeRoutes);
app.use('/api', adminReviewRoutes);
app.use('/api', trainingRoutes);
app.use('/api/metrics', metricsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large for this upload.',
      message: 'File too large for this upload.',
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field' });
  }
  
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message 
  });
});

// Start server after connecting to database
const startServer = async () => {
  try {
    await connectDB();
    
    // ── ADD: start expired location scrub job ──
    require('./jobs/expiredLocationScrub').startScrubJob();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;