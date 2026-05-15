const Donation = require('../models/Donation');
const User = require('../models/User');

class DonationController {
  // Create a new donation
  static async createDonation(req, res) {
    try {
      const { donatedBy, contact, email, item, servings, expiryDate, additionalInfo } = req.body;

      const missing = [];
      if (!String(donatedBy || '').trim()) missing.push('donatedBy');
      if (!String(contact || '').trim()) missing.push('contact');
      if (!String(email || '').trim()) missing.push('email');
      if (!String(item || '').trim()) missing.push('item');
      if (servings === undefined || servings === null || String(servings).trim() === '') {
        missing.push('servings');
      }
      if (!expiryDate || String(expiryDate).trim() === '') {
        missing.push('expiryDate');
      }
      if (missing.length) {
        return res.status(400).json({
          message: `Please fill in: ${missing.join(', ')}`,
          error: `Please fill in: ${missing.join(', ')}`,
        });
      }

      const servingsNum = parseInt(String(servings), 10);
      if (Number.isNaN(servingsNum) || servingsNum < 1) {
        return res.status(400).json({
          message: 'Servings must be a positive whole number.',
          error: 'Servings must be a positive whole number.',
        });
      }

      const expiry = new Date(expiryDate);
      if (Number.isNaN(expiry.getTime())) {
        return res.status(400).json({
          message: 'Please choose a valid expiry date.',
          error: 'Please choose a valid expiry date.',
        });
      }
      if (expiry <= new Date()) {
        return res.status(400).json({
          message: 'Expiry date must be in the future.',
          error: 'Expiry date must be in the future.',
        });
      }

      // ── ADD: location handling ──
      let locationFields = {};
      if (req.body.lat !== undefined && req.body.lng !== undefined) {
        const lat = parseFloat(req.body.lat);
        const lng = parseFloat(req.body.lng);

        if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
          return res.status(400).json({ message: 'Invalid coordinates provided.' });
        }

        // Consent check — only enforced when coordinates are provided
        if (req.user && !req.user.locationConsentAt) {
          const user = await User.findById(req.user.id).select('locationConsentAt');
          if (!user?.locationConsentAt) {
            return res.status(403).json({ message: 'Location consent required before sharing coordinates.' });
          }
        }

        const fuzz = () => (Math.random() * 0.006) - 0.003;
        locationFields = {
          location: { type: 'Point', coordinates: [lng, lat] },
          displayCoordinates: [lng + fuzz(), lat + fuzz()],
        };

        // Optional: reverse geocode city name using Nominatim
        try {
          const fetch = require('node-fetch');
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'User-Agent': 'FoodDonationApp/1.0' } }
          );
          const geoData = await geoRes.json();
          locationFields.city = geoData.address?.city ||
            geoData.address?.town ||
            geoData.address?.village ||
            geoData.address?.county || '';
        } catch (_) {
          // Geocoding failure is non-fatal — continue without city
        }
      }

      // Get user from request if authenticated
      const userId = req.user ? req.user.id : null;

      const newDonation = new Donation({
        donatedBy: donatedBy.trim(),
        contact: contact.trim(),
        email: email.trim().toLowerCase(),
        item: item.trim(),
        servings: servingsNum,
        expiryDate: expiry,
        pictures: req.file ? {
          data: req.file.buffer,
          contentType: req.file.mimetype
        } : null,
        additionalInfo: additionalInfo ? additionalInfo.trim() : '',
        userId: userId,
        ...locationFields
      });

      await newDonation.save();

      res.status(201).json({
        message: 'Thank you for submitting the donation!',
        data: newDonation.toJSON(),
      });
    } catch (error) {
      console.error('Error submitting donation:', error);
      
      if (error.name === 'ValidationError') {
        const msg = Object.values(error.errors).map((e) => e.message).join(', ');
        return res.status(400).json({
          message: msg,
          error: msg,
        });
      }
      
      res.status(500).json({
        message: 'An error occurred while submitting the donation.',
        error: 'An error occurred while submitting the donation.',
      });
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

      const raw = donation.pictures.data;
      if (raw == null || (Buffer.isBuffer(raw) && raw.length === 0)) {
        return res.status(404).json({ error: 'Image not found' });
      }

      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      const ct = donation.pictures.contentType || 'image/jpeg';
      res.set('Cache-Control', 'private, max-age=300');
      res.type(ct);
      res.send(buf);
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