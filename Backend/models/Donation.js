const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donatedBy: {
    type: String,
    trim: true,
    required: [true, 'Donor name is required']
  },
  contact: {
    type: String,
    trim: true,
    required: [true, 'Contact information is required']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    required: [true, 'Email is required'],
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
  },
  item: {
    type: String,
    trim: true,
    required: [true, 'Item name is required']
  },
  servings: {
    type: Number,
    required: [true, 'Number of servings is required'],
    min: [1, 'Servings must be at least 1']
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Expiry date must be in the future'
    }
  },
  pictures: {
    data: Buffer,
    contentType: String
  },
  additionalInfo: {
    type: String,
    trim: true,
    maxlength: [500, 'Additional info cannot exceed 500 characters']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  anonymous: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['available', 'claimed', 'expired'],
    default: 'available'
  },
  // ── ADD: geolocation fields ──
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: { type: [Number], default: [0, 0] }
  },
  displayCoordinates: { type: [Number], default: [0, 0] },
  city: { type: String, default: '' }
}, {
  timestamps: true,
  // Never send image bytes in JSON — clients use GET /donations/:id/image
  toJSON: {
    transform(_doc, ret) {
      delete ret.pictures;
      delete ret.location;
      return ret;
    },
  },
});

// Index for faster queries
donationSchema.index({ email: 1 });
donationSchema.index({ expiryDate: -1 });
donationSchema.index({ status: 1 });

// ── ADD: geospatial index ──
donationSchema.index({ location: '2dsphere' });

const Donation = mongoose.model('Donation', donationSchema);

module.exports = Donation;