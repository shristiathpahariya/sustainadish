const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const User = require('../models/User');
const { buildRecipeKey } = require('../utils/recipeKey');

const MAX_TITLE = 500;
const MAX_INSTRUCTIONS = 200000;

/**
 * Validates body for POST /recipes/share (exported for tests).
 * @returns {{ ok: true, title: string, ingredients: unknown, instructions: string }} | {{ ok: false, message: string }}
 */
function validateRecipeSharePayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body must be an object' };
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return { ok: false, message: 'Title is required' };
  }
  if (title.length > MAX_TITLE) {
    return { ok: false, message: `Title must be at most ${MAX_TITLE} characters` };
  }

  const { ingredients, instructions } = body;
  if (ingredients == null) {
    return { ok: false, message: 'Ingredients are required' };
  }
  if (Array.isArray(ingredients) && ingredients.length === 0) {
    return { ok: false, message: 'Ingredients cannot be empty' };
  }
  if (typeof ingredients === 'string' && !ingredients.trim()) {
    return { ok: false, message: 'Ingredients cannot be empty' };
  }

  const instructionsStr =
    typeof instructions === 'string' ? instructions : String(instructions ?? '');
  if (instructionsStr.length > MAX_INSTRUCTIONS) {
    return {
      ok: false,
      message: `Instructions must be at most ${MAX_INSTRUCTIONS} characters`,
    };
  }

  return {
    ok: true,
    title,
    ingredients,
    instructions: instructionsStr,
  };
}

function serializeSharedRecipe(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    _id: o._id,
    recipeKey: o.recipeKey,
    title: o.title,
    ingredients: o.ingredients,
    instructions: o.instructions,
    status: o.status,
    author: o.author,
    likes: o.likes,
    trainingStatus: o.trainingStatus,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

class SharedRecipeController {
  static async shareRecipe(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const validated = validateRecipeSharePayload(req.body);
      if (!validated.ok) {
        return res.status(400).json({ message: validated.message });
      }

      const { title, ingredients, instructions } = validated;
      const recipeKey = buildRecipeKey(title, ingredients);

      const existing = await Recipe.findOne({ recipeKey });

      if (existing) {
        if (existing.status === 'published') {
          return res.status(409).json({
            message: 'This recipe is already shared with the community.',
            recipeId: existing._id,
          });
        }

        if (existing.status === 'pending_review') {
          if (String(existing.author) !== String(userId)) {
            return res.status(409).json({
              message: 'An identical recipe is already awaiting review.',
              recipeId: existing._id,
            });
          }
          existing.title = title;
          existing.ingredients = ingredients;
          existing.instructions = instructions;
          existing.status = 'pending_review';
          existing.author = userId;
          await existing.save();
          return res.status(200).json({
            submitted: true,
            updated: true,
            recipe: serializeSharedRecipe(existing),
          });
        }

        if (existing.status === 'rejected') {
          if (String(existing.author) !== String(userId)) {
            return res.status(409).json({
              message: 'This recipe cannot be resubmitted by another account.',
              recipeId: existing._id,
            });
          }
          existing.title = title;
          existing.ingredients = ingredients;
          existing.instructions = instructions;
          existing.status = 'pending_review';
          await existing.save();
          return res.status(200).json({
            submitted: true,
            updated: false,
            recipe: serializeSharedRecipe(existing),
          });
        }

        if (existing.status === 'draft' && existing.author != null && String(existing.author) === String(userId)) {
          existing.title = title;
          existing.ingredients = ingredients;
          existing.instructions = instructions;
          existing.status = 'pending_review';
          await existing.save();
          return res.status(200).json({
            submitted: true,
            updated: true,
            recipe: serializeSharedRecipe(existing),
          });
        }

        return res.status(409).json({
          message: 'This recipe already exists in the system.',
          recipeId: existing._id,
        });
      }

      const recipe = await Recipe.create({
        recipeKey,
        title,
        ingredients,
        instructions,
        status: 'pending_review',
        author: userId,
      });

      await User.findByIdAndUpdate(userId, {
        $inc: { recipesSubmittedCount: 1 },
      });

      return res.status(201).json({
        submitted: true,
        updated: false,
        recipe: serializeSharedRecipe(recipe),
      });
    } catch (error) {
      console.error('share recipe error:', error);
      if (error.code === 11000) {
        return res.status(409).json({ message: 'Duplicate recipe submission.' });
      }
      return res.status(500).json({ message: 'Could not submit recipe' });
    }
  }

  static async likeRecipe(req, res) {
    try {
      const userId = req.user?.id;
      const { recipeId } = req.params;

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const recipe = await Recipe.findById(recipeId);

      if (!recipe) {
        return res.status(404).json({ message: 'Recipe not found' });
      }

      // Check if user already liked this recipe
      const alreadyLiked = recipe.likedBy?.some(
        (id) => String(id) === String(userId)
      );

      if (alreadyLiked) {
        // Unlike logic
        recipe.likedBy = recipe.likedBy.filter(
          (id) => String(id) !== String(userId)
        );
        recipe.likes = Math.max(0, recipe.likes - 1);
        await recipe.save();

        return res.json({
          liked: false,
          likes: recipe.likes,
          message: 'Recipe unliked'
        });
      }

      // Like logic
      recipe.likedBy.push(userId);
      recipe.likes += 1;
      await recipe.save();

      return res.json({
        liked: true,
        likes: recipe.likes,
        message: 'Recipe liked successfully'
      });

    } catch (error) {
      console.error('like recipe error:', error);
      return res.status(500).json({ message: 'Could not like recipe' });
    }
  }

  /**
   * Returns an array of recipe _ids that the authenticated user has liked.
   * GET /recipes/liked-ids
   */
  static async getLikedRecipeIds(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Find recipes whose likedBy array contains the current user
      const recipes = await Recipe.find(
        { likedBy: userId },
        { _id: 1 }
      ).lean();

      const likedIds = recipes.map((r) => String(r._id));

      return res.json({ likedIds });
    } catch (error) {
      console.error('get liked recipe ids error:', error);
      return res.status(500).json({ message: 'Could not fetch liked recipes' });
    }
  }

  /**
   * Returns recipes that the authenticated user has liked with full details.
   * GET /recipes/liked
   */
  static async getLikedRecipes(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Find recipes whose likedBy array contains the current user, sorted by updated at
      const recipes = await Recipe.find({ likedBy: userId })
        .sort({ updatedAt: -1 })
        .lean();

      return res.json({ likedRecipes: recipes });
    } catch (error) {
      console.error('get liked recipes error:', error);
      return res.status(500).json({ message: 'Could not fetch liked recipes' });
    }
  }
}

SharedRecipeController.validateRecipeSharePayload = validateRecipeSharePayload;

module.exports = SharedRecipeController;
