const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
    required: [true, 'First name is required']
  },
  lastName: {
    type: String,
    trim: true,
    required: [true, 'Last name is required']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    required: [true, 'Email is required'],
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  contact: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    trim: true,
    required: [true, 'Message is required']
  }
}, { 
  timestamps: true 
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;