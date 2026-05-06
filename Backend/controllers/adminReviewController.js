const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const User = require('../models/User');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

function serializeReviewItem(doc) {
  if (!doc) return null;
  const author = doc.author;
  const authorPreview =
    author && typeof author === 'object'
      ? {
          _id: author._id,
          firstName: author.firstName,
          lastName: author.lastName,
          email: author.email, // useful for admin review context
        }
      : null;

  return {
    _id: doc._id,
    recipeKey: doc.recipeKey,
    title: doc.title,
    ingredients: doc.ingredients,
    instructions: doc.instructions,
    status: doc.status,
    likes: doc.likes,
    trainingStatus: doc.trainingStatus,
    moderation: doc.moderation || null,
    author: authorPreview,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

class AdminReviewController {
  /**
   * GET /api/admin/recipes/pending?page=1&limit=20
   * Returns recipes awaiting review (pending_review), newest first.
   */
  static async getPendingReviews(req, res) {
    try {
      const page = parsePositiveInt(req.query.page, 1);
      const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, parsePositiveInt(req.query.limit, DEFAULT_LIMIT) || DEFAULT_LIMIT)
      );

      const filter = { status: 'pending_review' };

      const [total, rows] = await Promise.all([
        Recipe.countDocuments(filter),
        Recipe.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate({ path: 'author', select: 'firstName lastName email' })
          .lean({ virtuals: true }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / limit));

      return res.status(200).json({
        recipes: rows.map(serializeReviewItem),
        page,
        limit,
        total,
        totalPages,
      });
    } catch (error) {
      console.error('get pending reviews error:', error);
      return res.status(500).json({ message: 'Could not load pending reviews' });
    }
  }

  /**
   * POST /api/admin/recipes/:recipeId/approve
   * Sets status=published, trainingStatus=pending, clears rejection reason,
   * and updates author contribution counters.
   */
  static async approveRecipe(req, res) {
    try {
      const adminId = req.user?.id;
      const { recipeId } = req.params;
      if (!recipeId || !mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ message: 'Invalid recipe id' });
      }

      const recipe = await Recipe.findById(recipeId);
      if (!recipe) {
        return res.status(404).json({ message: 'Recipe not found' });
      }
      if (recipe.status !== 'pending_review') {
        return res.status(409).json({
          message: `Recipe is not pending review (current status: ${recipe.status})`,
        });
      }

      recipe.status = 'published';
      recipe.trainingStatus = 'pending';
      recipe.moderation = recipe.moderation || {};
      recipe.moderation.reviewedAt = new Date();
      recipe.moderation.reviewedBy = adminId || null;
      recipe.moderation.rejectionReason = '';
      await recipe.save();

      if (recipe.author) {
        await User.findByIdAndUpdate(recipe.author, {
          $inc: { recipesApprovedCount: 1 },
          $set: { lastContributionAt: new Date() },
        });
      }

      return res.status(200).json({
        approved: true,
        recipe: serializeReviewItem(
          await Recipe.findById(recipeId)
            .populate({ path: 'author', select: 'firstName lastName email' })
            .lean({ virtuals: true })
        ),
      });
    } catch (error) {
      console.error('approve recipe error:', error);
      return res.status(500).json({ message: 'Could not approve recipe' });
    }
  }

  /**
   * POST /api/admin/recipes/:recipeId/reject
   * Body: { reason: string }
   * Sets status=rejected and stores rejection reason.
   */
  static async rejectRecipe(req, res) {
    try {
      const adminId = req.user?.id;
      const { recipeId } = req.params;
      if (!recipeId || !mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ message: 'Invalid recipe id' });
      }

      const reason =
        typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (!reason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }
      if (reason.length > 5000) {
        return res
          .status(400)
          .json({ message: 'Rejection reason must be at most 5000 characters' });
      }

      const recipe = await Recipe.findById(recipeId);
      if (!recipe) {
        return res.status(404).json({ message: 'Recipe not found' });
      }
      if (recipe.status !== 'pending_review') {
        return res.status(409).json({
          message: `Recipe is not pending review (current status: ${recipe.status})`,
        });
      }

      recipe.status = 'rejected';
      recipe.moderation = recipe.moderation || {};
      recipe.moderation.reviewedAt = new Date();
      recipe.moderation.reviewedBy = adminId || null;
      recipe.moderation.rejectionReason = reason;
      await recipe.save();

      return res.status(200).json({
        rejected: true,
        recipe: serializeReviewItem(
          await Recipe.findById(recipeId)
            .populate({ path: 'author', select: 'firstName lastName email' })
            .lean({ virtuals: true })
        ),
      });
    } catch (error) {
      console.error('reject recipe error:', error);
      return res.status(500).json({ message: 'Could not reject recipe' });
    }
  }
}

module.exports = AdminReviewController;

