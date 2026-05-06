const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

function statusIndicator(status) {
  if (status === 'published') return 'approved';
  if (status === 'pending_review' || status === 'pending') return 'pending';
  if (status === 'rejected') return 'rejected';
  return 'draft';
}

function serializeContribution(doc) {
  if (!doc) return null;
  return {
    _id: doc._id,
    recipeKey: doc.recipeKey,
    title: doc.title,
    ingredients: doc.ingredients,
    instructions: doc.instructions,
    status: doc.status,
    indicator: statusIndicator(doc.status),
    likes: doc.likes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

class UserContributionsController {
  /**
   * Authenticated list of the current user's submitted recipes.
   * GET /api/auth/me/contributions?page=1&limit=20
   */
  static async getUserContributions(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const page = parsePositiveInt(req.query.page, 1);
      const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, parsePositiveInt(req.query.limit, DEFAULT_LIMIT) || DEFAULT_LIMIT)
      );

      const filter = { author: userId };

      const [total, rows] = await Promise.all([
        Recipe.countDocuments(filter),
        Recipe.find(filter)
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean({ virtuals: true }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / limit));

      // Optional: status counts for quick UI badges.
      const statusCounts = rows.reduce((acc, r) => {
        const k = statusIndicator(r.status);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});

      return res.status(200).json({
        recipes: rows.map(serializeContribution),
        page,
        limit,
        total,
        totalPages,
        statusCounts,
      });
    } catch (error) {
      console.error('get user contributions error:', error);
      return res.status(500).json({ message: 'Could not load contributions' });
    }
  }
}

module.exports = UserContributionsController;

