const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// JWT Secret Key
const JWT_SECRET = 'your_secret_key';

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).send({ message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: 'User already exists' });
    }

    const newUser = new User({ firstName, lastName, email, password });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).send({ message: 'User registered successfully', token });
  } catch (error) {
    console.error('Error in registration:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send({ message: 'Invalid email or password' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).send({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    // Return user data along with the token
    return res.status(200).json({
      token,
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
  });
  } catch (error) {
    res.status(500).send({ message: 'Server error' });
  }
});

// Update Profile Route
router.patch('/update-profile/:id', async (req, res) => {
  const userId = req.params.id;  // Ensure we’re retrieving the ID correctly from params

  if (!userId) {
    return res.status(400).send({ message: 'User ID is missing.' });
  }

  try {
    const { firstName, lastName, contact, location, profilePicture } = req.body;

    // Find the user by ID and update the profile fields
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, contact, location, profilePicture },
      { new: true } // Ensure this returns the updated user data
  );

    if (!updatedUser) {
      return res.status(404).send({ message: 'User not found.' });
    }

    return res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).send({ message: 'Server error' });
  }
});




module.exports = router;
