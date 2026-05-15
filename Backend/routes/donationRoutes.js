const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = authMiddleware.optionalAuthMiddleware;
const DonationController = require('../controllers/donationController');
const { donationLimiter } = require('../middleware/rateLimiter');
const { z } = require('zod');
const Donation = require('../models/Donation');

/** Donation photos (phone camera JPEGs are often over 5MB) */
const DONATION_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

// Configure multer for file uploads (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: DONATION_IMAGE_MAX_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    // Chrome/Firefox/Edge cannot render HEIC/HEIF in <img>; reject early with a clear message.
    if (/image\/(heic|heif)/i.test(file.mimetype)) {
      return cb(
        new Error(
          'HEIC/HEIF is not supported for web. Please use JPEG or PNG (use Photos “Export” or “Most Compatible”).'
        )
      );
    }
    cb(null, true);
  }
});

// ── ADD: coordinate validator schema ──
const geoQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  km: z.coerce.number().min(0.5).max(50).default(10),
});

const handleUpload = (req, res, next) => {
  upload.single('pictures')(req, res, (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 10MB or smaller.'
          : err.message || 'Invalid file upload.';
      return res.status(400).json({ message: msg });
    }
    next();
  });
};

// Routes (+ `/feed/near` before `/feed` so `"near"` is never confused with sibling matching)
router.post(
  '/messageForm',
  optionalAuthMiddleware,
  handleUpload,
  DonationController.createDonation
);

router.get('/feed/near', donationLimiter, async (req, res) => {
  const parsed = geoQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid query parameters.', errors: parsed.error.flatten() });
  }
  const { lat, lng, km } = parsed.data;

  try {
    const donations = await Donation.find({
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: km * 1000
        }
      },
      status: 'available',
      expiryDate: { $gte: new Date() }
    })
      .select('-location -pictures')
      .limit(50)
      .lean();

    res.json(donations);
  } catch (err) {
    console.error('Nearby query failed:', err);
    res.status(500).json({ message: 'Could not fetch nearby donations.' });
  }
});

router.get('/feed', DonationController.getAllDonations);
router.get('/user/donations', DonationController.getUserDonations);
router.get('/donations/:id/image', DonationController.getDonationImage);
router.delete('/donations/:id', authMiddleware, DonationController.deleteDonation);

// ── ADD: record location consent for logged-in user ──
router.post('/user/location-consent', authMiddleware, async (req, res) => {
  const User = require('../models/User');
  await User.findByIdAndUpdate(req.user.id, { locationConsentAt: new Date() });
  res.json({ message: 'Consent recorded.' });
});

module.exports = router;