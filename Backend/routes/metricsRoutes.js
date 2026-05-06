const express = require('express');
const router = express.Router();
const MetricsService = require('../services/metricsService');

/**
 * GET /api/metrics/training-history
 * Returns historical training data with the last N training runs
 */
router.get('/training-history', async (req, res) => {
  try {
    const limit = req.query.limit;
    const result = await MetricsService.getTrainingHistory(limit);
    res.status(200).json(result);
  } catch (error) {
    console.error('GET /metrics/training-history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/model-performance
 * Returns model performance trends and statistics
 */
router.get('/model-performance', async (req, res) => {
  try {
    const result = await MetricsService.getModelPerformance();
    res.status(200).json(result);
  } catch (error) {
    console.error('GET /metrics/model-performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch model performance metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/contribution-timeline
 * Returns daily user-submitted recipe counts over the last N days
 */
router.get('/contribution-timeline', async (req, res) => {
  try {
    const days = req.query.days;
    const result = await MetricsService.getContributionTimeline(days);
    res.status(200).json(result);
  } catch (error) {
    console.error('GET /metrics/contribution-timeline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contribution timeline',
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/summary
 * Returns comprehensive metrics summary (all data in one call)
 * Use this for dashboard initial load
 */
router.get('/summary', async (req, res) => {
  try {
    const result = await MetricsService.getMetricsSummary();
    res.status(200).json(result);
  } catch (error) {
    console.error('GET /metrics/summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics summary',
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/quick-stats
 * Returns quick overview stats for status widgets
 * Optimized for fast response times
 */
router.get('/quick-stats', async (req, res) => {
  try {
    const result = await MetricsService.getQuickStats();
    res.status(200).json(result);
  } catch (error) {
    console.error('GET /metrics/quick-stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quick stats',
      message: error.message,
    });
  }
});

module.exports = router;