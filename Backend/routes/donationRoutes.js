const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = authMiddleware.optionalAuthMiddleware;
const DonationController = require('../controllers/donationController');

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

// Routes
router.post(
  '/messageForm',
  optionalAuthMiddleware,
  handleUpload,
  DonationController.createDonation
);
router.get('/feed', DonationController.getAllDonations);
router.get('/user/donations', DonationController.getUserDonations);
router.get('/donations/:id/image', DonationController.getDonationImage);
router.delete('/donations/:id', authMiddleware, DonationController.deleteDonation);

module.exports = router;