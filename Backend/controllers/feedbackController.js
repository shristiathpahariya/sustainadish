const Feedback = require('../models/Feedback');

class FeedbackController {
  // Create a new feedback
  static async createFeedback(req, res) {
    try {
      const { rating, feedback } = req.body;

      // Validate input
      if (rating === undefined || !feedback) {
        return res.status(400).json({ 
          error: 'Please provide both rating and feedback' 
        });
      }

      // Validate rating range
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ 
          error: 'Rating must be between 1 and 5' 
        });
      }

      const newFeedback = new Feedback({
        rating,
        feedback: feedback.trim()
      });

      await newFeedback.save();
      
      res.status(201).json({ 
        message: 'Feedback saved successfully!',
        data: newFeedback 
      });
    } catch (error) {
      console.error('Error saving feedback:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          error: Object.values(error.errors).map(e => e.message).join(', ') 
        });
      }
      
      res.status(500).json({ error: 'Server error. Could not save feedback.' });
    }
  }
}

module.exports = FeedbackController;