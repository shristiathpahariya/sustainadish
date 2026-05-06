const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define user schema
const userSchema = new mongoose.Schema({
  firstName: { 
    type: String, 
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters']
  },
  lastName: { 
    type: String, 
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  contact: {
    type: String,
    trim: true,
    default: ''
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  profilePicture: {
    type: String,
    default: '/user.png'
  },
  googleLogin: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  // Recipe / community contributions (denormalised for profiles & impact views)
  recipesSubmittedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  recipesApprovedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  recipeLikesReceived: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Reputation (score is the source of truth; tier is maintained by app logic)
  reputationScore: {
    type: Number,
    default: 0,
    min: 0,
    index: true,
  },
  reputationTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze',
    index: true,
  },
  lastContributionAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true
});

// Index for faster queries (email index comes from unique: true on email)
userSchema.index({ firstName: 1, lastName: 1 });
userSchema.index({ reputationScore: -1, reputationTier: 1 });

// Hash password before saving the user
userSchema.pre('save', async function (next) {
  // Only hash password if it's modified or new
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12); // Increased from 10 to 12 for better security
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update last login on successful auth
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  await this.save();
};

// Remove sensitive data from user object before sending to client
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

// When a user is removed, remove their listings (by account link or email)
userSchema.post(['findOneAndDelete', 'findByIdAndDelete'], async function (doc) {
  if (!doc) return;
  const Donation = require('./Donation');
  const SavedRecipe = require('./SavedRecipe');
  await Donation.deleteMany({
    $or: [{ userId: doc._id }, { email: doc.email }],
  });
  await SavedRecipe.deleteMany({ user: doc._id });
});

const User = mongoose.model('User', userSchema);

module.exports = User;
