const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const { isValidEmail } = require('../utils/validation');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sanitizeAuthInput } = require('../middleware/validationMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const AuthController = require('../controllers/authController');
const UserContributionsController = require('../controllers/userContributionsController');
const { getAuthCookieOptions } = require('../config/authCookie');

/** Parse ADMIN_EMAILS env var into a Set for fast lookup */
function parseAdminEmails(raw) {
  const s = typeof raw === 'string' ? raw : '';
  return new Set(
    s
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
  );
}

// Configure multer for profile picture uploads (in-memory storage)
const profilePictureStorage = multer.memoryStorage();
const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// JWT Secret Key from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

function splitGoogleDisplayName(name) {
  const raw = typeof name === 'string' ? name.trim() : '';
  const parts = raw.split(/\s+/).filter(Boolean);
  let firstName = parts[0] || 'User';
  let lastName = parts.slice(1).join(' ') || 'Account';
  if (firstName.length < 2) firstName = 'User';
  if (lastName.length < 2) lastName = 'Account';
  return {
    firstName: firstName.slice(0, 100),
    lastName: lastName.slice(0, 100),
  };
}

function isValidObjectIdParam(id) {
  if (id == null || id === '') return false;
  if (String(id) === 'undefined' || String(id) === 'null') return false;
  return mongoose.Types.ObjectId.isValid(String(id));
}

// Register Route
router.post('/register', sanitizeAuthInput, async (req, res) => {
  try {
    const { firstName, lastName, email, password, contact, location } = req.body;

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const newUser = new User({ 
      firstName, 
      lastName, 
      email: email.toLowerCase(), 
      password,
      contact: contact || '',
      location: location || ''
    });
    
    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: newUser._id,
        email: newUser.email 
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRY }
    );

    // Update last login
    await newUser.updateLastLogin();

    res.status(201).json({ 
      message: 'User registered successfully', 
      token,
      user: {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Error in registration:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: Object.values(error.errors).map(e => e.message).join(', ') 
      });
    }
    
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Login Route
router.post('/login', sanitizeAuthInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Check if user exists
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact support.' });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email 
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRY }
    );

    // Update last login
    await user.updateLastLogin();

    res.cookie('token', token, getAuthCookieOptions());

    // Determine if user is admin
    const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);
    const isAdmin = adminEmails.size > 0 && adminEmails.has(user.email.toLowerCase());

    // Return user data (password not included due to toJSON method)
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        location: user.location,
        contact: user.contact,
        profilePicture: user.profilePicture || '/user.png',
        googleLogin: user.googleLogin === true,
        isAdmin,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Google OAuth — find or create user so the client always receives a MongoDB _id
router.post('/google', async (req, res) => {
  try {
    const { email, name, profilePicture } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    const { firstName, lastName } = splitGoogleDisplayName(
      typeof name === 'string' ? name : ''
    );

    let pic = '/user.png';
    if (typeof profilePicture === 'string' && profilePicture.trim().length > 0) {
      const trimmed = profilePicture.trim();
      if (trimmed.length < 2_000_000) {
        pic = trimmed;
      }
    }

    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      await user.updateLastLogin();
      if (!user.googleLogin) {
        user.googleLogin = true;
        await user.save();
      }
    } else {
      user = new User({
        firstName,
        lastName,
        email: normalizedEmail,
        password: crypto.randomBytes(32).toString('hex'),
        googleLogin: true,
        contact: '',
        location: '',
        profilePicture: pic,
      });
      await user.save();
      await user.updateLastLogin();
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.cookie('token', token, getAuthCookieOptions());

    // Determine if user is admin
    const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);
    const isAdmin = adminEmails.size > 0 && adminEmails.has(user.email.toLowerCase());

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        location: user.location,
        contact: user.contact,
        profilePicture: user.profilePicture || '/user.png',
        googleLogin: user.googleLogin === true,
        isAdmin,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: Object.values(error.errors).map((e) => e.message).join(', '),
      });
    }
    res.status(500).json({ message: 'Server error during Google login' });
  }
});

// Update Profile Route
router.patch('/update-profile/:id', async (req, res) => {
  const userId = req.params.id;  // Ensure we’re retrieving the ID correctly from params

  if (!userId || !isValidObjectIdParam(userId)) {
    return res.status(400).json({ message: 'User ID is missing or invalid.' });
  }

  try {
    const { firstName, lastName, contact, location, profilePicture } = req.body;

    // Find the user by ID and update the profile fields
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, contact, location, profilePicture },
      { new: true, runValidators: true }
  );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ 
      success: true, 
      user: updatedUser.toJSON() 
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// Upload Profile Picture Route (requires authentication)
router.post('/upload-profile-picture/:id', authMiddleware, profilePictureUpload.single('profilePicture'), async (req, res) => {
  const userId = req.params.id;

  if (!userId || !isValidObjectIdParam(userId)) {
    return res.status(400).json({ message: 'User ID is missing or invalid.' });
  }

  // Ensure user can only update their own profile (convert both to strings for comparison)
  const authenticatedUserId = req.user.id?.toString() || req.user?.toString();
  const targetUserId = userId.toString();
  
  // console.log('Auth check:', { authenticatedUserId, targetUserId });
  
  if (authenticatedUserId !== targetUserId) {
    return res.status(403).json({ message: 'Not authorized to update this profile.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    // Convert image to base64 for storage
    const base64Image = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    // Find the user and update profile picture
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture: dataUrl },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    return res.status(500).json({ message: 'Server error while uploading profile picture' });
  }
});

// Get current authenticated user
router.get('/me', authMiddleware, AuthController.getCurrentUser);

// Get current user's recipe contributions
router.get(
  '/me/contributions',
  authMiddleware,
  UserContributionsController.getUserContributions
);

// Logout route
router.post('/logout', AuthController.logout);

// Delete own account (cascades donations via User model hook)
router.delete('/account', authMiddleware, AuthController.deleteAccount);

// Verify token route (for frontend checks)
router.get('/verify-token', authMiddleware, AuthController.verifyToken);

module.exports = router;
