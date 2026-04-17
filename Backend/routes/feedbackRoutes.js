const express = require('express');
const router = express.Router();
const FeedbackController = require('../controllers/feedbackController');
const { sanitizeFeedbackInput } = require('../middleware/validationMiddleware');

router.post('/feedback', sanitizeFeedbackInput, FeedbackController.createFeedback);

module.exports = router;