const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sustainadish';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Define schemas and models
// Message Schema
const messageSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  contact: String,
  location: String,
  message: String,
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  rating: { type: Number, required: true },
  feedback: { type: String, required: true },
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);

// Donation Schema
const donationSchema = new mongoose.Schema({
  donatedBy: String,
  contact: String,
  email: String,
  item: String,
  servings: Number,
  expiryDate: Date,
  pictures: Buffer,
  additionalInfo: String,
  userId: String,
}, { timestamps: true });

const Donation = mongoose.model('Donation', donationSchema);

// Multer setup for file uploads
const storage = multer.memoryStorage(); // Store images in memory
const upload = multer({ storage: storage });

// Routes
// Authentication Routes
app.use('/api/auth', authRoutes);

// Message Form Route
app.post('/api/messages', async (req, res) => {
  try {
    const { firstName, lastName, email, contact, location, message } = req.body;

    const newMessage = new Message({
      firstName,
      lastName,
      email,
      contact,
      location,
      message,
    });

    await newMessage.save();
    res.status(201).json({ message: 'Message received successfully!' });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Feedback Route
app.post('/api/feedback', async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    const newFeedback = new Feedback({
      rating,
      feedback,
    });

    await newFeedback.save();
    res.status(201).json({ message: 'Feedback saved successfully!' });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ message: 'Server error. Could not save feedback.' });
  }
});

// Donation Form Route
app.post('/api/messageForm', upload.single('pictures'), async (req, res) => {
  try {
    const { donatedBy, contact, email, item, servings, expiryDate, additionalInfo } = req.body;

    const newDonation = new Donation({
      donatedBy,
      contact,
      email,
      item,
      servings: parseInt(servings),
      expiryDate: new Date(expiryDate),
      pictures: req.file ? req.file.buffer : null,
      additionalInfo,
    });

    await newDonation.save();
    res.status(200).json({ message: 'Thank you for submitting the donation!' });
  } catch (error) {
    console.error('Error submitting donation:', error);
    res.status(500).json({ message: 'An error occurred while submitting the donation.' });
  }
});

// Fetch Donations for feed
app.get('/api/feed', async (req, res) => {
  try {
    const donations = await Donation.find(); // Fetch all donations
    res.status(200).json(donations);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ message: 'Error fetching donations' });
  }
});


// Fetch donations by user email
app.get('/api/user/donations', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const userDonations = await Donation.find({ email });
    res.status(200).json(userDonations);
  } catch (error) {
    console.error('Error fetching user donations:', error);
    res.status(500).json({ message: 'Error fetching user donations' });
  }
});


// Fetch Donation Image
app.get('/api/donations/:id/image', async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation || !donation.pictures) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.contentType('image/jpeg'); // or 'image/png' depending on your image format
    res.send(donation.pictures);
  } catch (error) {
    console.error('Error retrieving image:', error);
    res.status(500).json({ message: 'Error retrieving image' });
  }
});


// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
