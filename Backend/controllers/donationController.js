const Donation = require('../models/Donation');
const User = require('../models/User');

class DonationController {
  // Create a new donation
  static async createDonation(req, res) {
    try {
      const { donatedBy, contact, email, item, servings, expiryDate, additionalInfo } = req.body;

      // Validate input
      if (!donatedBy || !contact || !email || !item || !servings) {
        return res.status(400).json({ 
          error: 'Please provide all required fields: donatedBy, contact, email, item, servings' 
        });
      }

      // Validate expiry date format
      if (new Date(expiryDate) <= new Date()) {
        return res.status(400).json({ 
          error: 'Expiry date must be in the future' 
        });
      }

      // Get user from request if authenticated
      const userId = req.user ? req.user.id : null;

      const newDonation = new Donation({
        donatedBy: donatedBy.trim(),
        contact: contact.trim(),
        email: email.trim().toLowerCase(),
        item: item.trim(),
        servings: parseInt(servings),
        expiryDate: new Date(expiryDate),
        pictures: req.file ? {
          data: req.file.buffer,
          contentType: req.file.mimetype
        } : null,
        additionalInfo: additionalInfo ? additionalInfo.trim() : '',
        userId: userId
      });

      await newDonation.save();

      res.status(200).json({
        message: 'Thank you for submitting the donation!',
        data: newDonation.toJSON(),
      });
    } catch (error) {
      console.error('Error submitting donation:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          error: Object.values(error.errors).map(e => e.message).join(', ') 
        });
      }
      
      res.status(500).json({ error: 'An error occurred while submitting the donation.' });
    }
  }

  // Get all donations for feed (paginated; optional search).
  // Excludes: expired, and listings whose userId points to a deleted account.
  static async getAllDonations(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 9));
      const search =
        typeof req.query.search === 'string' ? req.query.search.trim() : '';

      const now = new Date();

      const baseMatch = {
        status: 'available',
        expiryDate: { $gt: now },
      };

      if (search.length > 0) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = new RegExp(escaped, 'i');
        baseMatch.$or = [
          { item: rx },
          { donatedBy: rx },
          { additionalInfo: rx },
          { email: rx },
        ];
      }

      const userCollection = User.collection.collectionName;

      const pipeline = [
        { $match: baseMatch },
        {
          $lookup: {
            from: userCollection,
            localField: 'userId',
            foreignField: '_id',
            as: 'ownerCheck',
          },
        },
        {
          $match: {
            $or: [
              { userId: null },
              { userId: { $exists: false } },
              { $expr: { $gt: [{ $size: '$ownerCheck' }, 0] } },
            ],
          },
        },
        {
          $facet: {
            countArr: [{ $count: 'total' }],
            items: [
              { $sort: { createdAt: -1 } },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              { $project: { pictures: 0, ownerCheck: 0 } },
            ],
          },
        },
      ];

      const [agg] = await Donation.aggregate(pipeline);
      const total = agg?.countArr?.[0]?.total ?? 0;
      const items = agg?.items ?? [];
      const totalPages = Math.max(1, Math.ceil(total / limit));

      res.status(200).json({
        items,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      console.error('Error fetching donations:', error);
      res.status(500).json({ error: 'Error fetching donations' });
    }
  }

  // Get donations by user email
  static async getUserDonations(req, res) {
    try {
      const { email, userId } = req.query;
      const normalizedEmail =
        typeof email === 'string' ? email.trim().toLowerCase() : '';
      const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';

      if (!normalizedEmail && !normalizedUserId) {
        return res.status(400).json({ error: 'Email or userId is required' });
      }

      const filters = [];
      if (normalizedEmail) {
        filters.push({ email: normalizedEmail });
      }
      if (normalizedUserId) {
        filters.push({ userId: normalizedUserId });
      }

      const query = filters.length > 1 ? { $or: filters } : filters[0];

      // Exclude binary image data — same idea as feed ($project: { pictures: 0 }).
      // UI loads thumbnails via GET /donations/:id/image; listing must not embed buffers.
      const userDonations = await Donation.find(query)
        .select('-pictures')
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json(userDonations);
    } catch (error) {
      console.error('Error fetching user donations:', error);
      res.status(500).json({ error: 'Error fetching user donations' });
    }
  }

  // Get donation image
  static async getDonationImage(req, res) {
    try {
      const donation = await Donation.findById(req.params.id);
      
      if (!donation || !donation.pictures) {
        return res.status(404).json({ error: 'Image not found' });
      }

      res.contentType(donation.pictures.contentType || 'image/jpeg');
      res.send(donation.pictures.data);
    } catch (error) {
      console.error('Error retrieving image:', error);
      res.status(500).json({ error: 'Error retrieving image' });
    }
  }

  // Delete donation (owner only — requires auth)
  static async deleteDonation(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const donation = await Donation.findById(req.params.id);

      if (!donation) {
        return res.status(404).json({ error: 'Donation not found' });
      }

      const requesterId = req.user.id.toString();
      const ownerId = donation.userId ? donation.userId.toString() : null;
      const ownerByUserId = ownerId && ownerId === requesterId;

      const reqEmail = typeof req.user.email === 'string' ? req.user.email.trim().toLowerCase() : '';
      const donationEmail =
        typeof donation.email === 'string' ? donation.email.trim().toLowerCase() : '';
      const ownerByEmail =
        !ownerId && reqEmail.length > 0 && donationEmail.length > 0 && donationEmail === reqEmail;

      if (!ownerByUserId && !ownerByEmail) {
        return res.status(403).json({ error: 'Not authorized to delete this donation' });
      }

      await Donation.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: 'Donation deleted successfully' });
    } catch (error) {
      console.error('Error deleting donation:', error);
      res.status(500).json({ error: 'Error deleting donation' });
    }
  }
}

module.exports = DonationController;