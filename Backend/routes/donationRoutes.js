const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const DonationController = require('../controllers/donationController');

// Configure multer for file uploads (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
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

// Routes
router.post('/messageForm', upload.single('pictures'), DonationController.createDonation);
router.get('/feed', DonationController.getAllDonations);
router.get('/user/donations', DonationController.getUserDonations);
router.get('/donations/:id/image', DonationController.getDonationImage);
router.delete('/donations/:id', authMiddleware, DonationController.deleteDonation);

module.exports = router;