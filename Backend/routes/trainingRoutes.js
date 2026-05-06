const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const TrainingController = require('../controllers/trainingController');

// Training status and history endpoints (require auth)
router.get('/admin/training-status', authMiddleware, TrainingController.getTrainingStatus);
router.get('/admin/training-history', authMiddleware, TrainingController.getTrainingHistory);
router.get('/admin/training-stats', authMiddleware, TrainingController.getTrainingStats);

// Training control endpoints (require auth)
router.post('/admin/retrain-model', authMiddleware, TrainingController.triggerManualRetrain);
router.post('/admin/rollback-model', authMiddleware, TrainingController.rollbackModelVersion);

module.exports = router;