const Feedback = require('../models/Feedback');

class FeedbackController {
  static async createFeedback(req, res) {
    try {
      const { rating, feedback } = req.body;

      const doc = await Feedback.create({
        rating,
        feedback,
      });

      res.status(201).json({
        message: 'Thanks for your feedback.',
        id: doc._id,
      });
    } catch (error) {
      console.error('Error saving feedback:', error);

      if (error.name === 'ValidationError') {
        return res.status(400).json({
          message: Object.values(error.errors)
            .map((e) => e.message)
            .join(', '),
        });
      }

      res.status(500).json({
        message: 'Could not save feedback. Please try again.',
      });
    }
  }
}

module.exports = FeedbackController;
