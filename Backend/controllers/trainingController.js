const { runFullRetrain } = require('../services/retrainingService');
const TrainingLog = require('../models/TrainingLog');
const modelVersionService = require('../services/modelVersionService');
const DataExtractionService = require('../services/dataExtractionService');

/**
 * Get training status and recent training history
 * GET /admin/training-status
 */
async function getTrainingStatus(req, res) {
  try {
    const userId = req.user?.id;

    // Fetch the latest training run
    const latestTraining = await TrainingLog.findOne({})
      .sort('-createdAt')
      .limit(1)
      .lean();

    // If no training history
    if (!latestTraining) {
      return res.json({
        hasHistory: false,
        message: 'No training history found',
        currentActive: modelVersionService.readActivePointer(),
      });
    }

    // Get active model version
    const active = modelVersionService.readActivePointer();

    return res.json({
      hasHistory: true,
      latestTraining: {
        runKey: latestTraining.runKey,
        modelId: latestTraining.modelName,
        version: latestTraining.modelVersion,
        status: latestTraining.status,
        startedAt: latestTraining.startedAt,
        finishedAt: latestTraining.finishedAt,
        durationMs: latestTraining.durationMs,
        sampleCount: latestTraining.sampleCount,
        errorMessage: latestTraining.errorMessage,
        notes: latestTraining.notes,
      },
      currentActive: active,
      isTrainingInProgress: latestTraining.status === 'running',
    });
  } catch (error) {
    console.error('getTrainingStatus error:', error);
    res.status(500).json({
      error: 'Failed to fetch training status',
      message: error.message,
    });
  }
}

/**
 * Trigger manual retraining
 * POST /admin/retrain-model
 */
async function triggerManualRetrain(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Check if there's already a training in progress
    const runningTraining = await TrainingLog.findOne({
      status: 'running',
    });

    if (runningTraining) {
      return res.status(409).json({
        error: 'Training already in progress',
        message: 'Another training job is currently running',
        runKey: runningTraining.runKey,
        startedAt: runningTraining.startedAt,
      });
    }

    // Parse options from request body
    const opts = {
      bump: req.body.bump || 'patch',
      limit: req.body.limit,
      activate: req.body.activate !== false,
      maxFeatures: req.body.maxFeatures,
      notes: req.body.notes || `Manual retrain triggered by user ${userId}`,
    };

    // Start retraining asynchronously
    runFullRetrain(opts)
      .then((result) => {
        console.log('Manual retrain completed:', result);
      })
      .catch((error) => {
        console.error('Manual retrain failed:', error);
      });

    // Return immediately with the initial training log
    const initialTraining = await TrainingLog.findOne({
      status: 'running',
    }).sort('-createdAt');

    return res.status(202).json({
      message: 'Retraining started',
      status: 'accepted',
      runKey: initialTraining?.runKey,
      trainingLogId: initialTraining?._id?.toString(),
      estimatedTime: '5-10 minutes',
      checkStatusAt: '/api/admin/training-status',
    });
  } catch (error) {
    console.error('triggerManualRetrain error:', error);
    res.status(500).json({
      error: 'Failed to trigger retraining',
      message: error.message,
    });
  }
}

/**
 * Get training history (paginated)
 * GET /admin/training-history
 */
async function getTrainingHistory(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = Math.max(parseInt(req.query.skip) || 0, 0);
    const statusFilter = req.query.status;

    const query = {};
    if (statusFilter && ['running', 'completed', 'failed'].includes(statusFilter)) {
      query.status = statusFilter;
    }

    const [trainings, total] = await Promise.all([
      TrainingLog.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      TrainingLog.countDocuments(query),
    ]);

    return res.json({
      trainings: trainings.map((t) => ({
        _id: t._id,
        runKey: t.runKey,
        modelId: t.modelName,
        version: t.modelVersion,
        status: t.status,
        startedAt: t.startedAt,
        finishedAt: t.finishedAt,
        durationMs: t.durationMs,
        sampleCount: t.sampleCount,
        errorMessage: t.errorMessage,
        notes: t.notes,
        createdAt: t.createdAt,
      })),
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + trainings.length < total,
      },
    });
  } catch (error) {
    console.error('getTrainingHistory error:', error);
    res.status(500).json({
      error: 'Failed to fetch training history',
      message: error.message,
    });
  }
}

/**
 * Get training stats summary
 * GET /admin/training-stats
 */
async function getTrainingStats(req, res) {
  try {
    // Get recent stats
    const { stats } = await DataExtractionService.extractApprovedRecipes();

    // Get training history stats
    const completedCount = await TrainingLog.countDocuments({ status: 'completed' });
    const failedCount = await TrainingLog.countDocuments({ status: 'failed' });
    const totalCount = await TrainingLog.countDocuments();

    // Get active version
    const active = modelVersionService.readActivePointer();

    // Get installed versions
    const versions = modelVersionService.listInstalledVersions();

    return res.json({
      currentDataset: stats,
      trainingHistory: {
        completed: completedCount,
        failed: failedCount,
        total: totalCount,
      },
      modelVersions: {
        active: active,
        installed: versions,
        count: versions.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('getTrainingStats error:', error);
    res.status(500).json({
      error: 'Failed to fetch training stats',
      message: error.message,
    });
  }
}

/**
 * Rollback to previous model version
 * POST /admin/rollback-model
 */
async function rollbackModelVersion(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const modelId = req.body.modelId || modelVersionService.DEFAULT_MODEL_ID;

    const result = modelVersionService.rollbackActive(modelId);

    if (!result) {
      return res.status(400).json({
        error: 'Cannot rollback',
        message: 'No previous version available to rollback to',
      });
    }

    return res.json({
      message: 'Model rolled back successfully',
      previousActive: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('rollbackModelVersion error:', error);
    res.status(500).json({
      error: 'Failed to rollback model',
      message: error.message,
    });
  }
}

module.exports = {
  getTrainingStatus,
  triggerManualRetrain,
  getTrainingHistory,
  getTrainingStats,
  rollbackModelVersion,
};