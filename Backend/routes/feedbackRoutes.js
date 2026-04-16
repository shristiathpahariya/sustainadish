const express = require('express');
const router = express.Router();
const FeedbackController = require('../controllers/feedbackController');

router.post('/feedback', FeedbackController.createFeedback);

module.exports = router;