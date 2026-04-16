const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  feedback: {
    type: String,
    trim: true,
    required: [true, 'Feedback is required'],
    minlength: [10, 'Feedback must be at least 10 characters long']
  }
}, { 
  timestamps: true 
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;