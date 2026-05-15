const cron = require('node-cron');
const Donation = require('../models/Donation');

// Runs every hour — strips coordinates from expired donations
const startScrubJob = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await Donation.updateMany(
        {
          expiryDate: { $lt: new Date() },
          'location.coordinates': { $ne: [0, 0] }
        },
        {
          $set: {
            'location.coordinates': [0, 0],
            displayCoordinates: [0, 0]
          }
        }
      );
      if (result.modifiedCount > 0) {
        console.log(`[scrub] Cleared coordinates from ${result.modifiedCount} expired donations.`);
      }
    } catch (err) {
      console.error('[scrub] Expired location scrub failed:', err);
    }
  });
};

module.exports = { startScrubJob };