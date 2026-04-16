const Message = require('../models/Message');

class MessageController {
  // Create a new message
  static async createMessage(req, res) {
    try {
      const { firstName, lastName, email, contact, location, message } = req.body;

      // Validate input
      if (!firstName || !lastName || !email || !message) {
        return res.status(400).json({ 
          error: 'Please provide all required fields: firstName, lastName, email, message' 
        });
      }

      const newMessage = new Message({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        contact: contact || '',
        location: location || '',
        message: message.trim()
      });

      await newMessage.save();
      
      res.status(201).json({ 
        message: 'Message received successfully!',
        data: newMessage 
      });
    } catch (error) {
      console.error('Error saving message:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          error: Object.values(error.errors).map(e => e.message).join(', ') 
        });
      }
      
      res.status(500).json({ error: 'Failed to save message' });
    }
  }
}

module.exports = MessageController;